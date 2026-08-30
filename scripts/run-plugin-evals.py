#!/usr/bin/env python3
"""Regression-check a plugin's behavior against its evals/<case>/prompt.md +
evals/<case>/graders/criteria.md files.

Ported from the original DevDigest repo's `.claude/skills/onion-architecture/evals/scripts/
run_evals.py` (same two-call-per-case shape: one `claude -p` to run the agent-under-test, one
more to grade the result against a fixed checklist), adapted to this repo's per-plugin
`evals/<case>/prompt.md` + `evals/<case>/graders/criteria.md` layout instead of a single
`evals.json`, and to route through OpenRouter (via the LiteLLM proxy in evals/proxy/) instead of
a direct Anthropic API key, so cheap non-Anthropic models can back CI runs.

Usage:
    python3 scripts/run-plugin-evals.py                          # every plugin's evals/
    python3 scripts/run-plugin-evals.py --plugin research-tools  # one plugin only
    python3 scripts/run-plugin-evals.py --only records-commit-hash
    python3 scripts/run-plugin-evals.py --threshold 1.0          # require a perfect run
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
PLUGINS_DIR = REPO_ROOT / "plugins"


def find_cases(only_plugin: str | None) -> list[dict]:
    """Discover every evals/<case>/ dir (containing prompt.md + graders/criteria.md)
    under plugins/<name>/evals/, for one plugin or all of them."""
    cases = []
    plugin_dirs = [PLUGINS_DIR / only_plugin] if only_plugin else sorted(PLUGINS_DIR.iterdir())
    for plugin_dir in plugin_dirs:
        evals_dir = plugin_dir / "evals"
        if not evals_dir.is_dir():
            continue
        for prompt_path in sorted(evals_dir.rglob("prompt.md")):
            case_dir = prompt_path.parent
            criteria_path = case_dir / "graders" / "criteria.md"
            if not criteria_path.is_file():
                continue
            cases.append(
                {
                    "name": f"{plugin_dir.name}/{case_dir.relative_to(evals_dir)}",
                    "plugin": plugin_dir.name,
                    "plugin_dir": plugin_dir,
                    "case_dir": case_dir,
                    "prompt_path": prompt_path,
                    "criteria_path": criteria_path,
                }
            )
    return cases


def plugin_dirs_for(plugin_name: str) -> list[Path]:
    """The plugin under test plus every dependency declared in its plugin.json, so
    namespaced subagent spawns (e.g. `research-tools:researcher`) resolve."""
    manifest_path = PLUGINS_DIR / plugin_name / ".claude-plugin" / "plugin.json"
    dirs = [PLUGINS_DIR / plugin_name]
    if manifest_path.is_file():
        manifest = json.loads(manifest_path.read_text())
        for dep in manifest.get("dependencies", []):
            dep_dir = PLUGINS_DIR / dep["name"]
            if dep_dir.is_dir():
                dirs.append(dep_dir)
    return dirs


_MODEL_LINE = re.compile(r"^model:\s*\S+\s*$", re.MULTILINE)


def strip_model_overrides(dirs: list[Path], tmp_root: Path) -> list[Path]:
    """Copy each plugin dir with every `model:` frontmatter line removed from its
    agents/*.md, so a subagent inherits the top-level --model override instead of
    resolving its own hardcoded alias (e.g. `opus`) to an internal literal ID that
    isn't a valid OpenRouter slug. Only needed when routing through OpenRouter — the
    real, shipped `model:` value is what should run in any non-eval context."""
    out = []
    for d in dirs:
        dest = tmp_root / d.name
        shutil.copytree(d, dest)
        for agent_md in dest.glob("agents/*.md"):
            text = agent_md.read_text()
            agent_md.write_text(_MODEL_LINE.sub("", text, count=1))
        out.append(dest)
    return out


def openrouter_env(base_env: dict) -> dict:
    """Mirror the original repo's evals/src/runtime/env.ts `subscriptionEnv()`: point
    `claude -p` at OpenRouter (or a local translating proxy) via the Anthropic-compatible
    env vars instead of api.anthropic.com, when EVAL_BACKEND=openrouter."""
    env = dict(base_env)
    env.pop("CLAUDECODE", None)  # nesting guard — allow `claude -p` inside a session
    if env.get("EVAL_BACKEND") != "openrouter":
        return env
    key = env.get("OPENROUTER_API_KEY")
    if not key:
        raise RuntimeError("EVAL_BACKEND=openrouter but OPENROUTER_API_KEY is not set")
    base_url = env.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api").rstrip("/")
    env["ANTHROPIC_BASE_URL"] = base_url
    env["ANTHROPIC_AUTH_TOKEN"] = key
    env["ANTHROPIC_API_KEY"] = ""  # blank, not unset — stops fallback to Anthropic auth
    return env


def run_claude(prompt: str, cwd: Path, plugin_dirs: list[Path], model: str | None, timeout: int) -> str:
    cmd = ["claude", "-p", prompt, "--output-format", "json"]
    for d in plugin_dirs:
        cmd += ["--plugin-dir", str(d)]
    if model:
        cmd += ["--model", model]
    env = openrouter_env(os.environ)
    proc = subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True, timeout=timeout)
    if proc.returncode != 0:
        raise RuntimeError(f"claude -p failed (exit {proc.returncode}): {proc.stderr[-2000:]}")
    data = json.loads(proc.stdout)
    return data.get("result", "")


def strip_json_fence(text: str) -> str:
    """Cheap grader models don't reliably obey 'no markdown fences' — strip a
    ```json ... ``` or ``` ... ``` wrapper if the model added one anyway."""
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```[a-zA-Z]*\n?", "", stripped)
        stripped = re.sub(r"\n?```$", "", stripped)
    return stripped.strip()


def grading_prompt(criteria_md: str, response_text: str) -> str:
    return (
        "You are grading an AI agent's response against a fixed checklist. For each checklist "
        "line, decide PASS or FAIL based only on whether the response below satisfies it, and "
        "cite the exact sentence as evidence. Respond with ONLY a JSON object, no prose, no "
        "markdown fences, matching this shape:\n"
        '{"expectations":[{"text":"...","passed":true,"evidence":"..."}],'
        '"summary":{"passed":N,"failed":N,"total":N,"pass_rate":0.0}}\n\n'
        f"Checklist:\n{criteria_md}\n\n"
        f"Response:\n---\n{response_text}\n---"
    )


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--plugin", default=None, help="only run this plugin's evals/")
    ap.add_argument("--only", default=None, help="run a single case by its dir name")
    ap.add_argument("--threshold", type=float, default=0.9, help="minimum pass rate to succeed (0-1)")
    ap.add_argument("--model", default=os.environ.get("EVAL_MODEL"), help="override the model claude -p uses")
    ap.add_argument("--timeout", type=int, default=300, help="per-call timeout in seconds")
    ap.add_argument("--out", default=None, help="output dir (default: evals/results/<timestamp>/)")
    args = ap.parse_args()

    cases = find_cases(args.plugin)
    if args.only:
        cases = [c for c in cases if c["case_dir"].name == args.only]
        if not cases:
            sys.exit(f"no eval case named {args.only!r} found")
    if not cases:
        print("No eval cases found (plugins/*/evals/**/prompt.md + graders/criteria.md) — nothing to run.")
        return

    out_dir = Path(args.out) if args.out else REPO_ROOT / "evals" / "results" / time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
    out_dir.mkdir(parents=True, exist_ok=True)
    override_models = os.environ.get("EVAL_BACKEND") == "openrouter"
    tmp_root = Path(tempfile.mkdtemp(prefix="plugin-evals-")) if override_models else None

    results = []
    for c in cases:
        slug = c["name"].replace("/", "__")
        prompt = c["prompt_path"].read_text()
        criteria = c["criteria_path"].read_text()
        dirs = plugin_dirs_for(c["plugin"])
        if override_models:
            # Each case gets its own copy so concurrent-safe if this ever parallelizes.
            case_tmp = tmp_root / slug
            case_tmp.mkdir()
            dirs = strip_model_overrides(dirs, case_tmp)

        print(f"[{c['name']}] running...", file=sys.stderr)
        response = run_claude(prompt, REPO_ROOT, dirs, args.model, args.timeout)
        (out_dir / f"{slug}.response.md").write_text(response)

        print(f"[{c['name']}] grading...", file=sys.stderr)
        grading_raw = run_claude(grading_prompt(criteria, response), REPO_ROOT, [], args.model, args.timeout)
        try:
            grading = json.loads(strip_json_fence(grading_raw))
        except json.JSONDecodeError:
            n = criteria.count("- [ ]") or 1
            grading = {
                "expectations": [],
                "summary": {"passed": 0, "failed": n, "total": n, "pass_rate": 0.0},
                "parse_error": grading_raw[:500],
            }
        (out_dir / f"{slug}.grading.json").write_text(json.dumps(grading, indent=2))
        results.append({"name": c["name"], **grading["summary"]})

    if tmp_root is not None:
        shutil.rmtree(tmp_root, ignore_errors=True)

    total_passed = sum(r["passed"] for r in results)
    total = sum(r["total"] for r in results)
    pass_rate = (total_passed / total) if total else 0.0

    summary = {"results": results, "total_passed": total_passed, "total": total, "pass_rate": pass_rate}
    (out_dir / "summary.json").write_text(json.dumps(summary, indent=2))

    print(f"\n{'case':40s} {'pass':>6s}")
    for r in results:
        print(f"{r['name']:40s} {r['passed']}/{r['total']}")
    print(f"\nOverall: {total_passed}/{total} ({pass_rate:.0%}) — output: {out_dir}")

    if pass_rate < args.threshold:
        print(f"FAIL: pass rate {pass_rate:.0%} below threshold {args.threshold:.0%}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
