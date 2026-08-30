# Специфікація: UI-каталог маркетплейсу (GitHub Pages)

## 1. Мета

Створити статичний веб-додаток на GitHub Pages, який дає користувачам зручний спосіб
знаходити та встановлювати артефакти цього репозиторію (плагіни, skills, commands,
agents) без потреби вручну читати `marketplace.json` і `plugin.json`.

Головний сценарій: користувач пише природною мовою/ключовими словами, що йому треба
("мені треба скіл для рев'ю коду"), і бачить картки всіх артефактів, що відповідають
запиту.

## 2. Обмеження

- **GitHub Pages = статичний хостинг.** Немає серверного рантайму, немає БД, немає
  API-ендпоінтів окрім статичних файлів.
- Уся логіка, що вимагає "динаміки", має бути або:
  - **build-time** — прорахована наперед скриптом у CI та запечена у статичні JSON-файли;
  - **client-side** — виконана в браузері користувача (JS), над уже завантаженими
    статичними даними, або над публічними API, що дозволяють CORS-запити з браузера
    (наприклад `api.github.com`).
- Джерело правди для контенту — сам репозиторій (`.claude-plugin/marketplace.json`,
  `plugins/**`). UI не повинен зберігати дублюючий "ручний" контент, який може розійтися
  з реальним станом репозиторію.

## 3. Архітектура

```
┌──────────────────────┐     ┌────────────────────────┐     ┌───────────────────────┐
│  Репозиторій          │     │  Build (GitHub Actions) │     │  GitHub Pages (static) │
│  plugins/**            ├────►  scripts/build-index.mjs├────►  data/index.json       │
│  .claude-plugin/*.json│     │  scripts/build-changelog│     │  data/changelog.json   │
│  git history           │     │                          │     │  index.html + assets   │
└──────────────────────┘     └────────────────────────┘     └───────────┬───────────┘
                                                                          │ fetch (client)
                                                                          ▼
                                                              ┌───────────────────────┐
                                                              │  Браузер користувача   │
                                                              │  - MiniSearch/Flex index│
                                                              │  - рендер карток        │
                                                              │  - localStorage (онбординг)│
                                                              │  - опційний fetch до     │
                                                              │    api.github.com        │
                                                              └───────────────────────┘
```

Ключова ідея: **один build-крок** генерує один-два статичні JSON-файли з усім
необхідним контентом та метаданими; сайт — це чистий статичний фронтенд (HTML/CSS/JS),
що вантажить ці файли й робить усе інше на клієнті.

### 3.1 Пайплайн білду

- Тригер: push у `main` зі змінами в `plugins/**` або `.claude-plugin/**` (розширення
  наявного `validate.yml`, або окремий workflow `build-ui.yml`).
- Кроки:
  1. `claude plugin validate .` (вже є) — білд не повинен продовжуватись, якщо
     маркетплейс невалідний.
  2. `node scripts/build-index.mjs` → `site/public/data/index.json`.
  3. `node scripts/build-changelog.mjs` → `site/public/data/changelog.json`.
  4. Білд фронтенду (`npm run build` у `site/`) → статичні файли.
  5. Деплой через `actions/deploy-pages`.

## 4. Модель даних

### 4.1 `index.json` — індекс усіх артефактів для пошуку

Один плаский масив записів різної "гранулярності" — плагін і кожен його
command/skill/agent окремим записом, з посиланням на батьківський плагін. Це дозволяє
пошуку знаходити як плагін цілком, так і конкретний skill усередині нього.

```jsonc
{
  "generatedAt": "2026-08-30T12:00:00Z",
  "entries": [
    {
      "id": "plugin:example-plugin",
      "type": "plugin",
      "name": "example-plugin",
      "displayName": "Example Plugin",
      "description": "Starter plugin demonstrating the expected structure...",
      "version": "0.1.0",
      "author": { "name": "IlyaKuzich", "email": "ilakuzich@gmail.com" },
      "keywords": ["example", "starter"],
      "path": "plugins/example-plugin",
      "readmeText": "<plain-text вміст README.md, для повнотекстового пошуку>",
      "counts": { "commands": 1, "skills": 0, "agents": 0 },
      "childIds": ["command:example-plugin/hello"],
      "firstAddedAt": "2026-01-10T09:00:00Z",
      "lastUpdatedAt": "2026-08-15T14:20:00Z"
    },
    {
      "id": "command:example-plugin/hello",
      "type": "command",
      "name": "hello",
      "parentPluginId": "plugin:example-plugin",
      "description": "<з frontmatter або першого абзацу hello.md>",
      "bodyText": "<повний текст команди, plain-text>",
      "path": "plugins/example-plugin/commands/hello.md",
      "lastUpdatedAt": "2026-08-15T14:20:00Z"
    }
    // type: "skill" і "agent" — та сама форма, з SKILL.md / agents/*.md
  ]
}
```

Поля `readmeText` / `bodyText` — очищений від markdown-розмітки текст (не сирий
markdown), щоб пошуковий індекс не "спотикався" на синтаксисі.

`lastUpdatedAt` / `firstAddedAt` рахуються через `git log -1 --format=%cI -- <path>` і
`git log --diff-filter=A --format=%cI -- <path> | tail -1` відповідно — build-time, без
жодного стороннього сервісу.

### 4.2 `changelog.json` — для фічі "Що нового"

```jsonc
{
  "generatedAt": "2026-08-30T12:00:00Z",
  "entries": [
    {
      "date": "2026-08-15",
      "kind": "plugin-added",       // plugin-added | plugin-updated | skill-added | command-added | version-bump
      "pluginId": "plugin:example-plugin",
      "pluginDisplayName": "Example Plugin",
      "summary": "Додано новий skill \"code-review\" у Example Plugin",
      "commitSha": "a1b2c3d"
    }
  ]
}
```

Генерується скриптом, що йде по `git log --name-status -- plugins/` від початку історії
(або від дати останнього білду — інкрементально, з кешем попереднього `changelog.json` у
репозиторії, щоб не перебирати всю історію щоразу) і класифікує зміни за типом файлу й
дифом версії в `plugin.json`.

Додатково генерується `feed.xml` (Atom/RSS) з тих самих даних — статичний файл, on-page
"Subscribe" лінк, без бекенду.

## 5. Фічі

### 5.1 Пошук і перегляд (основна фіча)

**User story:** "Мені треба скіл для рев'ю коду" → бачу картки всіх артефактів
(плагінів/skills/commands/agents), що збігаються за ключовими словами.

- **Пошуковий рушій:** клієнтський, на основі [MiniSearch](https://github.com/lucaong/minisearch)
  (легкий, чистий JSON-індекс, fuzzy + prefix пошук, не вимагає збірки статичного HTML
  як Pagefind). Індексуються поля: `displayName`, `description`, `keywords`,
  `readmeText`/`bodyText`, з різною вагою (назва > опис > keywords > повний текст).
- **UI:**
  - Поле пошуку вгорі (+ `⌘K` command palette для швидкого виклику з будь-якого місця).
  - Результати — картки: тип (бейдж plugin/skill/command/agent), назва, опис,
    keywords-чіпси, батьківський плагін (якщо це child-артефакт).
  - Порожній запит → показ усіх плагінів за замовчуванням (browse-режим).
- **Фасетні фільтри:** тип артефакту, keyword/тег, автор — обчислюються на клієнті з
  уже завантаженого `index.json` (унікальні значення полів).
- **Сторінка/модалка деталей артефакту:**
  - Deep link `#/item/<id>` для шарингу прямого посилання.
  - Повний README/контент, список дочірніх артефактів (для плагіна), метадані (версія,
    дата оновлення, ліцензія).
  - Кнопка **"Install"** — копіює в буфер:
    ```
    /plugin marketplace add IlaKuzich/dev-digest-ai-marketplace
    /plugin install <plugin-name>@dev-digest-ai-marketplace
    ```
  - Блок **"Схожі артефакти"** — топ-N інших записів за перетином `keywords`
    (Jaccard-подібність), рахується на клієнті або запікається в `index.json` build-time.
- **Сортування:** релевантність (за замовчуванням), дата оновлення, назва.

### 5.2 "Що нового" (What's New)

**User story:** користувач, що вже стежить за маркетплейсом, хоче швидко побачити, що
змінилося з минулого разу.

- Таймлайн-стрічка на головній сторінці (і окрема сторінка `#/whats-new`): дата → подія
  (новий плагін, новий skill/command, оновлення версії).
- Групування за датою, іконка/колір за типом події.
- "Badge" на іконці розділу, якщо є події новіші за дату останнього візиту (зберігається
  в `localStorage`).
- Статичний `feed.xml` (Atom) — кнопка "Subscribe" для зовнішніх читалок, без бекенду.

### 5.3 Статистика

**User story:** зацікавленому користувачу/контриб'ютору цікаво бачити "живість" і масштаб
маркетплейсу.

- **Build-time метрики** (з `index.json`/`changelog.json`, рахуються на клієнті при
  завантаженні, без окремого API):
  - Загальна кількість: плагінів, skills, commands, agents.
  - Графік росту в часі (кумулятивна кількість плагінів за датами з `changelog.json`).
  - Tag cloud за `keywords` (частота).
  - Кількість контриб'юторів — з `git shortlog -sn -- plugins/` (запікається в
    build-time окремим невеликим JSON `contributors.json`, оскільки email/git-автори не
    повинні йти в основний пошуковий індекс).
- **Опційні live-метрики через публічний GitHub API** (client-side fetch,
  CORS-дозволений, без бекенду, з in-memory кешем на сесію щоб не спамити rate-limit):
  - Зірки/форки репозиторію (`GET /repos/{owner}/{repo}`).
  - Останні N контриб'юторів з аватарками (`GET /repos/{owner}/{repo}/contributors`).
  - Якщо запит впаде (rate limit анонімних запитів GitHub API — 60/год з IP) — тихий
    фолбек на build-time дані, без помилки в UI.
- Сторінка конкретного плагіна показує міні-статистику: дата останнього оновлення,
  к-ть skills/commands, версія.

### 5.4 Онбординг

**User story:** новий користувач не знає, що таке Claude Code marketplace і як цим
користуватись.

- **Сторінка "Getting Started"** (`#/getting-started`):
  1. Що таке Claude Code / marketplace (2-3 речення).
  2. Команда підключення маркетплейсу з кнопкою copy:
     `/plugin marketplace add IlaKuzich/dev-digest-ai-marketplace`.
  3. Як встановити конкретний плагін (`/plugin install <name>@dev-digest-ai-marketplace`).
  4. Лінк "Переглянути всі плагіни" → на головну/пошук.
- **Гайд-тур при першому візиті** — 3-4 тултіпи, що підсвічують пошук, фільтри, кнопку
  Install. Показується один раз; прапорець `onboarding.seen = true` в `localStorage`.
  Можливість повторно запустити тур з меню "Допомога".
- **Чекліст прогресу** (localStorage, без акаунта): "Додав маркетплейс" /
  "Переглянув каталог" / "Встановив перший плагін" — користувач сам відмічає пункти
  (або деякі відмічаються автоматично при кліку на відповідну copy-кнопку).
- **Блок "Рекомендовано для старту"** на головній — плагіни з `keywords` що містять
  `starter`/`beginner` (конвенція, яку описуємо в `CONTRIBUTING.md`), максимум 3 картки.

## 6. Технологічний стек (пропозиція)

| Шар | Вибір | Причина |
|---|---|---|
| Build-скрипти | Node.js (`scripts/build-index.mjs`, `scripts/build-changelog.mjs`) | без нових залежностей екосистеми, легко запускати в тому ж CI, що й `validate.yml` |
| Фронтенд | Vite + без важкого фреймворку (vanilla JS/TS або preact) | маленький бандл, швидкий білд, статичний вихід із коробки |
| Пошук | MiniSearch | JSON-based, легкий (~10KB), fuzzy/prefix search, не вимагає індексування HTML |
| Графіки (статистика) | легка бібліотека (напр. uPlot) або кастомний SVG | не тягнути важкий chart.js заради 1-2 графіків |
| Роутинг | hash-based (`#/...`) | GitHub Pages не підтримує серверний rewrite для history API без `404.html`-хаку |
| Деплой | GitHub Actions + `actions/deploy-pages` | стандартний підхід, вже є `validate.yml` як приклад workflow-стилю репозиторію |

## 7. Нефункціональні вимоги

- **Продуктивність:** `index.json` має лишатись малим (зараз 1 плагін; закладаємо
  розумну межу — якщо зросте до сотень плагінів, розглянути lazy-загрузку `bodyText`
  окремим файлом на артефакт замість одного моноліту).
- **Доступність (a11y):** картки й пошук — keyboard-navigable, `aria-live` регіон для
  результатів пошуку.
- **i18n:** UI мовний перемикач укр/eng; сам контент (описи плагінів) залишається такий,
  як у `plugin.json` (без автоперекладу).
- **Без збору персональних даних:** усі "стани користувача" (онбординг, дата останнього
  візиту) — тільки в `localStorage`, нічого не відправляється нікуди, окрім опційної
  privacy-friendly аналітики (поза скоупом цієї специфікації, окреме рішення).

## 8. Поза скоупом (майбутні ідеї, не зараз)

- Облікові записи користувачів, обране/закладки, що синхронізуються між пристроями
  (вимагало б бекенду).
- Рейтинги/відгуки від користувачів (вимагало б бекенду або стороннього сервісу типу
  Utterances/Giscus на базі GitHub Issues/Discussions — можливо розглянути окремо).
- Автопереклад контенту.
- PWA/офлайн-режим.

## 9. Відкриті питання

1. Де фізично живе фронтенд-код сайту — окрема гілка `gh-pages`, чи папка `site/` у
   `main` з білдом через Actions? (Рекомендація: `site/` у `main` + Actions build+deploy,
   простіше підтримувати одним PR-флоу.)
2. Чи потрібен окремий домен, чи лишаємо дефолтний
   `ilakuzich.github.io/dev-digest-ai-marketplace`?
3. Конвенція `keywords: ["starter"]` для розділу "Рекомендовано для старту" — фіксуємо
   в `CONTRIBUTING.md` як офіційне правило?
