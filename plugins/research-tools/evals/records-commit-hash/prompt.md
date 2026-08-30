Immediately spawn the `researcher` subagent with this exact, fully-specified instruction —
copy it verbatim as the subagent's task, do not ask the user anything first, and do not let the
subagent ask anything either (tell it explicitly not to ask clarifying questions):

"Search the ENTIRE repository you are running in (every directory under `plugins/`, not just
one plugin) for the following: which file and field does a plugin use to declare its
dependencies on other plugins? Confirm your answer by finding a real example of a plugin that
declares at least one dependency, and show how it is used. Do not ask clarifying questions —
if something is ambiguous, pick the most literal reading and proceed."

Once the researcher subagent returns its report, output that report's full text verbatim,
including its Methodology section, and nothing else.
