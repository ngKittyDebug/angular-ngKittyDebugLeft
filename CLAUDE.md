# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## Project board

Tasks and issues are tracked on GitHub Projects: https://github.com/orgs/ngKittyDebug/projects/2

## Commands

```bash
pnpm start          # dev server at http://localhost:4200
pnpm build          # production build
pnpm test           # run tests once (Vitest via Angular builder)
pnpm test:cov       # tests with coverage report
pnpm lint           # ESLint check
pnpm lint:fix       # ESLint auto-fix
pnpm format         # Prettier check
pnpm format:fix     # Prettier auto-fix
pnpm typecheck      # strict TypeScript check (tsc --noEmit)
pnpm preflight      # typecheck + lint + format + test in one shot (run before pushing)
```

**Run a single test file:**

```bash
pnpm ng test --include="**/main-catalog-page.component.spec.ts"
```

## Git conventions

**Branch naming** (enforced by `validate-branch-name` on pre-push):

```
(chore|feat|fix|docs|style|refactor|perf)/<word>[-_]<word>
```

**Commit types** (enforced by commitlint): `build`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`, `chore`

**Hooks:**

- `pre-commit`: lint-staged (ESLint + Prettier on staged files) + `typecheck`
- `pre-push`: validate-branch-name + `pnpm lint` + `pnpm test`

## Architecture

```
src/app/
├── core/
│   ├── services/          # ThemeSwitcherService (TUI_DARK_MODE), LanguageSwitcher (Transloco)
│   └── ui/components/layout/  # Shell: LayoutComponent wraps Header + RouterOutlet + Footer
├── features/
│   ├── features.routes.ts # Aggregates all feature route arrays
│   ├── main-catalog/      # Default route (''), behind authGuard: pokemon catalog with filter + pagination + cards
│   ├── auth/              # /auth (children /login, /signup), behind guestGuard: localStorage-based login/signup
│   ├── frenzy/            # /frenzy (data: { immersive: true }): realtime PartyKit game (see Frenzy sections)
│   ├── pokemon-profile/   # /pokemon/:id — pokemon detail page
│   ├── profile/           # /profile — user profile page
│   ├── about/             # /about route
│   └── not-found/         # Wildcard 404
└── shared/
    ├── models/            # Pokemon interfaces (PokemonCardModel, detail/list/species API shapes)
    ├── guards/            # auth.guard (CanActivateFn → redirect to /auth/login with returnUrl) + guest.guard (inverse)
    ├── constants/         # patterns-constants.ts — PASSWORD_PATTERN / EMAIL_PATTERN / USER_PATTERN
    ├── directives/        # [leftPawHideContent] (scroll visibility) + [leftPawResponsiveRender] (CDK BreakpointObserver)
    ├── pipes/             # shared pipes
    └── mocks/             # TuiRootComponentMock — use in specs instead of real TuiRoot
```

**TypeScript path aliases:**

- `@core/*` → `src/app/core/*`
- `@features/*` → `src/app/features/*`
- `@shared/*` → `src/app/shared/*` (внутри Angular)
- `@game/*` → `shared-game/*` — **контракт** (типы/конфиг), общий для клиента и `partykit-server/`. Server-authoritative движок живёт НЕ здесь, а в `partykit-server/src/engine/` (generic, связывается с игрой через `createEngine` в `parties/<game>/game.ts`). Раскладка по активностям — импортируй как `@game/frenzy/*` (файлы в `shared-game/frenzy/`). **Тюнинг-конфиг — `@game/frenzy/config`** (НЕ `constants`): плоский `FRENZY` — derived read-model, `config.ts` СОБИРАЕТ его из дефиниции `shared-game/frenzy/definition/` (см. план theme-agnostic рефакторинга в `.planning/`): слайс на сущность — `definition/items/<item>.ts` (ВЕСЬ тюнинг предмета: physics, verb-дескрипторы interactions, spawn-веса с членством в пулах, флаг `enabled`), `definition/effects/<effect>.ts` (модификаторы/emission/exclusiveGroup), `definition/npcs/angry-bomb.ts` + per-concern партиалы (`world`, `loop`, `hp`, `player`, `collision`, `player-collision`, `score`, `floats`, `spawn`) и агрегатор `definition/index.ts` (`FRENZY_DEFINITION`, сборка spawn-пулов; порядок ключей пулов — rng-load-bearing, egg-пул запинен явно). Юнионы `ItemType`/`PlayerEffectKind` выводятся в `frenzy/types.ts` из ВКЛЮЧЁННЫХ слайсов ростеров (`EnabledKey` в `shared-game/engine/definition.ts` фильтрует `keyof` по литералу `enabled`; слайс с `enabled: false` — например дремлющее barbed-wire-демо — в публичные юнионы не попадает, пока флаг не флипнут), `NpcKind` — обычный `keyof` (алиасы generic-типов из `shared-game/engine/types.ts` — импорты не меняются). Ретюнишь сущность → правишь её слайс; `FRENZY.xxx` снаружи не меняется (страховка — `definition-contract.spec.ts` + golden master в `partykit-server`). (`hp` — здоровье покемона: `startingHp`/`maxHp`/`decayPerTick`/`decayIntervalMs`/`lowHpWarningThreshold` — пороги стадий едут per-player в `Player.body`, см. «pokemon/theme-agnostic»; `floats` — `floatPriority`.) **Feature-flags** — per-entity поле `enabled` в слайсе сущности (для предметов проецируется в `FRENZY.features.items[type]`, хелпер `isItemEnabled(type)` в `config.ts`; NPC-флаг сервер читает прямо из `NpcDefinition.enabled`, в `FRENZY` он не проецируется): один булев тумблер на сущность гейтит ВСЕ пути её спавна (см. ниже про `pickItemType`) И компайл-тайм поверхность клиента (через фильтрацию юнионов выше; см. «Frenzy cookbook»). **Сервер pokemon-agnostic:** контракт НЕ перечисляет ростер покемонов — `Player.appearance` это непрозрачная строка, сервер её только ретранслирует (валидирует лишь как непустую строку ≤32). `Line`-union, метки, спрайты и резолв `appearance→Line` (с фолбэком на неизвестное) живут на клиенте в `ui/constants/pokemon-registry.ts`.
- `@environments/*` → `src/environments/*`

**Не выдумывать новые alias на ходу.** Если нужно делиться кодом между Angular и `partykit-server/` — расширять `shared-game/` под `@game/*` (новая активность → своя подпапка `shared-game/<game>/`; общий между играми код — `shared-game/common/`, когда реально появится). Если внутри Angular — расширять `@core/*`, `@features/*`, `@shared/*`.

**Routing pattern:** All routes are lazy-loaded via `loadComponent`. The root route loads `LayoutComponent`, which renders child feature routes in its `<router-outlet>`. Children (`features.routes.ts`): `main-catalog` (`''`, behind `authGuard`), `auth` (`/auth` with `/login`+`/signup` children, redirect `'' → signup`, behind `guestGuard`), `profile` (`/profile`), `pokemon-profile` (`/pokemon/:id`), `frenzy` (`/frenzy`, carries `data: { immersive: true }` for full-bleed layout, no guard — public game), `about`, wildcard 404. Auth state lives in localStorage (key `loginFormData`); the two guards read it and cross-redirect. **Формы в `auth` намеренно разнопарадигменные** (учебная демонстрация обоих form-API): `login-form` — Reactive Forms, `signup-form` — Signal Forms (`@angular/forms/signals`). Это осознанный учебный компромисс, не техдолг — зафиксирован как accepted trade-off в `.claude/skills/_shared/project-review-criteria.md` §5 (slug `mixed-form-paradigms`), поэтому review-скиллы (`pr-review`/`codebase-audit`) его не флагают.

**i18n:** Transloco with `en`/`ru` locales, defaulting to `ru`. Translation files live in `public/i18n/` (flat `en.json`/`ru.json` plus per-section subfolders, e.g. `public/i18n/frenzy/en.json`). Language persists via `transloco-persist-lang` (localStorage). Use `LanguageSwitcher` service to switch languages.

**Theming:** Taiga UI v5 dark/light mode via `ThemeSwitcherService` (wraps `TUI_DARK_MODE` signal). Global styles in `src/styles/` — custom Taiga appearances in `buttons-taiga-appearances.scss`, CSS variables for colors in `root-colors.style.scss`, screen breakpoints in `_screens-width.scss`.

## UI library — Taiga UI v5

**Прежде чем писать SCSS-полоски, спиннеры, кнопки, аккордеоны, чекбоксы — проверь, нет ли готового Taiga компонента.** Свои реализации только если в Taiga нет аналога.

Импорты:

- Атомарные элементы (`TuiButton`, `TuiLink`, `TuiIcon`, `TuiRoot`, токены `TUI_DARK_MODE`, `provideTaiga`) — из **`@taiga-ui/core`**.
- Виджеты (`TuiAccordion`, `TuiProgressBar`, `TuiProgressSegmented`, `TuiAvatar` и т.д.) — из **`@taiga-ui/kit`**.

Паттерны:

- Большинство Taiga-компонентов — это **директивы на нативных тегах**, а не custom-elements. Пример: `<progress tuiProgressBar [value]="x" [max]="100" size="m" [color]="cssColor">`. Не пиши `<tui-progress-bar>`.
- Цвета передавай как `var(--tui-status-positive)` / `--tui-status-warning` / `--tui-status-negative` (см. тему Taiga) вместо хардкода hex.
- `size`-input принимает один из `xxs | xs | s | m | l | xl | xxl` — не выдумывай свои значения.
- **`TuiAvatar` с растровой картинкой (PNG-спрайт, фото) — только через дочерний `<img>`, НЕ через `[tuiAvatar]="url"`.** Вход `[tuiAvatar]` уходит в `iconStart` и для не-`@tui.*` значений рендерит картинку как моно-маску (`mask` + `currentColor`) → тёмный силуэт. Правильно: `<span tuiAvatar size="s"><img [src]="url" alt=""/></span>` (Taiga сам уберёт фон и сделает `object-fit: cover`). `[tuiAvatar]="'@tui.user'"` для иконок — ОК.
- Темизация — через `provideTaiga()` в `app.config.ts` + `TUI_DARK_MODE` signal в `ThemeSwitcherService`. Не дёргай `<html>`-классы напрямую.

В тестах вместо реального `TuiRoot` подключай `TuiRootComponentMock` из `@shared/mocks` — иначе TestBed тащит за собой DI-граф темы.

## i18n — Transloco

**Любой пользовательский текст (label, hint, кнопка, aria-label, статус) — через Transloco. Хардкод строк в шаблонах запрещён.** Числа, имена пользователей, hp-значения — это данные, не текст, их через `{{ value }}` без `t()`.

Паттерн использования в фиче:

1. **Создать scope-папку** `public/i18n/<scope>/en.json` и `ru.json`. Структура JSON совпадает на обоих языках, ключи в camelCase. Пример: `public/i18n/frenzy/{en,ru}.json`.
2. **Подключить scope в `*.routes.ts`** через `provideTranslocoScope('<scope>')`:

   ```ts
   {
     path: '',
     loadComponent: () => import('...').then((m) => m.MyPageComponent),
     providers: [provideTranslocoScope('frenzy')],
   }
   ```

3. **В компоненте** импортировать `TranslocoDirective` из `@jsverse/transloco` (стандартный паттерн — directive в шаблоне, не `TranslocoPipe` и не `TranslocoService` в TS).
4. **В шаблоне** оборачивать корневой элемент `*transloco="let t; prefix: '<scope>.<section>'"`:

   ```html
   <section *transloco="let t; prefix: 'frenzy.currentPokemonStatus'">
     <span>{{ t('hpLabel') }}</span>
     <span>{{ t('stageBadge', { stage: stage() }) }}</span>
   </section>
   ```

   Параметры в перевод передаются объектом во втором аргументе `t()` и подставляются через `{{paramName}}` в JSON.

Loader (`src/app/transloco-loader.ts`) дергает `/i18n/<lang>.json`. Для scope Transloco запрашивает уже как `<scope>/<lang>` — поэтому файл должен лежать в `public/i18n/<scope>/<lang>.json`. Если переименовать scope — переименуй и папку.

В тестах используй `TranslocoTestingModule.forRoot(...)` (см. `fainted-modal.component.spec.ts`) — реальный HTTP-loader в spec-окружении не нужен.

## Component conventions

- **Selector prefix:** `left-paw-`
- **Change detection:** Always `ChangeDetectionStrategy.OnPush` (enforced by ESLint)
- **Standalone components only** (Angular 22, no NgModules)
- **Signals preferred** over observables for local state (`@angular-eslint/prefer-signals` warn)
- **File suffixes:** `.component.ts`, `.service.ts`, `.directive.ts`, `.pipe.ts`, `.resolver.ts`
- **Styles:** SCSS per component; global style preprocessor includes `src/styles` so partials are importable without relative paths

### Frenzy client data layer (`features/frenzy/data/`)

- **`store/` — NgRx SignalStore** (а не «голые» signals — это и есть основное состояние фичи): `frenzy.store.ts` держит серверный стейт + `myId`/fainted-инфо/`roomFull`, отдаёт computed (`connectionStatus`, `leaderboard`, `me`, `presenceCount`, `disconnectedCount`) и методы (`connect`/`disconnect`/`click`/`steer`/`join`/`dismissFainted`); `frenzy-stats.store.ts` копит статистику сессии (`maxHp`, `maxStage`, `eatenByType`, lifespan). Чистый редьюсер серверных сообщений вынесен в `store/apply-server-message.ts` (+ spec).
- **`logic/` — чистые функции** настроения покемона: `pokemon-mood.ts` (`getMood(hp, stage)` → `'starving' | 'hungry' | 'content' | 'happy'`), `is-sad.ts`.
- **`services/`** делится на две подсистемы: `effects/` (floating-сообщения и FX, см. ниже) и `sound/` (отдельная аудио-подсистема — `audio-engine.service.ts` + per-effect сервисы + `sound-settings.service.ts`). Не путать: `effects/` и `sound/` сосуществуют.

### Frenzy scene elements (падающие/всплывающие)

- **`user-select: none`** на всех игровых падающих/всплывающих элементах (айтемы, floating-текст, статус-сообщения) — их кликают/таскают, а не выделяют. Уже стоит на `.scene` и `.scene__item`; компонент `left-paw-floating-text` ставит его на `:host`.
- **Позиционирование по нормализованным `x,y` (0..1) — через директиву `[leftPawScenePosition]="{ x, y }"`** (`ui/directives/scene-position.directive.ts`), а НЕ инлайновые `[style.left.%]`/`[style.top.%]`. Директива пишет только `left`/`top`; центрирование и анимация остаются в CSS (`transform: translate(...)`). Применяется к падающим айтемам, bubble-burst, blast и **orphan-floating-тексту** (см. ниже). Для широких боксов (floating-текст) добавляй `[scenePositionClampX]="true"` — это зажимает `x` по измеренной ширине, чтобы у краёв сцены текст влезал целиком, а не обрезался `overflow: hidden`.
- **Floating-текст переиспользуем:** `left-paw-floating-text` — presentational (перевод приходит готовой строкой через input `text`, ключ живёт в модели и резолвится в шаблоне сцены). Все сообщения transient — всплывают вверх и тают (анимация `floating-text-rise`, затухание равномерное: после быстрого pop-in непрозрачность ровными шагами снижается к 0 на всём подъёме). Длительность видимости задаётся per-message через input `durationMs` (host-биндинг `animation-duration` + тот же таймер удаления в `TransientList`). Опциональная Taiga-иконка — input `icon` (`@tui.*`).
- **Два класса floating-сообщений (`FloatingMessagesStore`, модель `floating-message.ts`):**
  - **`OwnedFloat` (привязан к живому спрайту)** — несёт `ownerId`, БЕЗ координат. Рендерится **внутри контейнера `.scene__player`** этого игрока (`.scene__player-float`: `position:absolute; bottom:100%; left:50%`) → сидит над головой и **едет вместе с дрейфом спрайта**. Сцена группирует их `floatsByOwner` (computed: `Map<ownerId, OwnedFloat[]>`). Сюда входят: eat (`+5`/`−N`, привязан к **поедателю**, не к айтему — у съеденного айтема контейнера уже нет), статусы своего покемона (sad/happy/dying/poke/evolved), появление чужого (`appeared`), урон бомбы по выжившим. Если спрайт исчезает — float уходит с ним (для bomb-фатала вместо него покажется `died`).
  - **`OrphanFloat` (игрок уже исчез)** — единственный случай: `died`. Спрайта нет → штампуется по last-known `x,y` (из `PresenceTracker.lastKnownPlayers`) и рендерится в оверлее сцены через директиву + `scenePositionClampX`.
- **Продюсеры** — семейство эффектов (`data/services/effects/`, по файлу `*-effect.service.ts` на продюсер): `EatEffect`, `SelfMoodEffect` (signal-driven по `me()`: sad/happy/dying-переходы; + `pokeSelf` easter-egg), `ReactiveMoodEffect`, `EvolutionEffect`, `PresenceTracker` (appeared из диффа `snapshot.players`, died из `fainted`), `DetonationEffect`, `BumpEffect`, `HitBurstEffect`, `ShieldBlockEffect`, `IntroQuipsEffect`, `NpcQuipEffect`, `EmissionSoundEffect`, `PlayerEffectsTracker`. Хелперы очередей/жизни сообщений — `transient-list.ts`, `owner-release-queue.ts`. Все пушат в `FloatingMessagesStore` (`pushOwned*`/`pushOrphan*`); `FrenzyEffectsService` — тонкий оркестратор, фанит `messages$` по хендлерам и реэкспозит `ownedFloats`/`orphanFloats`. Новый продюсер — новый файл в `effects/` по тому же шаблону, не раздувай существующие.

### Frenzy item art pipeline (спрайты падающих предметов)

**Источник — один цельный набор: [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji), стиль 3D (глянцевые рендеры), лицензия MIT** (атрибуция не обязательна). Один набор на все предметы → визуальное единство сцены. Не подбирай предметам случайные картинки из разных источников и не рисуй наспех SVG — бери глиф из Fluent.

**Как добавить спрайт для нового типа предмета:**

1. **Подбери глиф** в наборе под смысл предмета (еда/буст/опасность). Raw-путь 3D-PNG:
   `https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/<Имя>/3D/<snake_name>_3d.png`
   (папка — с пробелами и Capitalized, напр. `assets/Red apple/3D/red_apple_3d.png`; пробел в URL → `%20`). Проверь `curl -sfL` (200).
2. **Адаптируй:** ресайз до **120px** (2× от 60px-бокса сцены — `FRENZY.physicalSizePx.item`, чёткость на retina). В окружении нет webp-кодера (нет `cwebp`/`sharp`/imagemagick, `npx` упирается в реестр E401, `sips` не пишет webp), поэтому пока **PNG через `sips -Z 120 in.png --out out.png`** — выходит ~8–16 КБ/файл, near-webp вес. Если появится конвертер (`cwebp`/`sharp`) — предпочитай **WebP** (тот же 120px), он легче.
3. **Положи** в `public/frenzy/items/<kebab-name>.png` (kebab-case, как остальные ассеты; имя = ключ типа: `rare-candy.png`, `golden-berry.png`, `easter-egg.png`). Покемоньи спрайты лежат отдельно — `public/frenzy/pokemon/sprites/<line>.gif`. Пути строятся в `pokemon-registry.ts`: `itemSpritePathFor` → `/frenzy/items/…`, `spritePathFor` → `/frenzy/pokemon/sprites/…`.
4. **Пропиши** одной записью в `ITEM_ART` (`Record<ItemType, { sprite; dotColor; sandPuff }>` в `ui/constants/pokemon-registry.ts`) — `<type>: { sprite: '<kebab-name>.png', dotColor: '…', sandPuff: <0..1.3> }`. Единый источник на предмет: спрайт, цвет точки миникарты/легенды (`ITEM_DOT_COLOR` проецируется из него) и интенсивность sand-puff'а (`sandPuffWeightFor` читает его) — три грани в одной строке, дрейфовать не могут. Рендер (`<img>` в `scene.component.html` через пайп `itemSprite`) и сглаживание в `scene.component.scss` (bilinear, без `image-rendering: pixelated` — правильно для гладких рендеров) трогать не нужно.
5. **Добавь в HUD-легенду** (`ui/components/item-legend/`): запись в `ITEM_GROUP` (это `Record<ItemType, …>` — пропуск нового типа = ошибка компиляции, страховка) + название в i18n `frenzy.legend.items.<type>` (en/ru). Цвет точки уже задан полем `dotColor` в `ITEM_ART` (шаг 4) — отдельной правки не требует. **Легенда обязана перечислять ВСЕ падающие предметы — не оставляй новый тип без группы/названия.**
6. **Удали** старый ассет, если заменяешь, и сверь `grep`-ом, что на его имя файла не ссылаются вне реестра.

Действующий маппинг: food→🍎, rotten→🦴, rareCandy→🍬, goldenBerry→🍊 (Tangerine), mushroom→🍄, vitamin→💊, crumb→🍪, easterEgg→🥚, poop→💩, rock→🪨 — это PNG (дефолт — Fluent 3D). Исключения (SVG, подобраны/нарисованы отдельно): bomb→💣 `bomb.svg` (редизайн морской мины), brick→🧱 — Twemoji (вектор), shield→🛡️ — кастомный SVG. NPC angry-bomb — отдельная машинерия: `angry-bomb.svg` в `public/frenzy/npc/`, запись в `NPC_SPRITES` (keyed by `NpcKind`), НЕ в `ITEM_ART` и не в `POKEMON_LINES` (picker не должен предлагать NPC). То есть набор НЕ строго одно-исходниковый: дефолт — Fluent, но если глиф не читается под смысл предмета (как камень), бери ясную векторную альтернативу (Twemoji/OpenMoji) или оставляй существующий кастомный SVG.

## Angular skills (project-scoped)

Three Angular-specific Claude skills live **committed** in `.agents/skills/` (`angular-developer`, `angular-best-practices-signalstore`, `angular-best-practices-transloco`), so fresh clones and cloud environments get them out of the box. Each has a `SKILL.md` with frontmatter (`name:`, `description:`) and reference material. Loaded automatically by Claude Code when the project is opened — invoke by topic match in conversation. The `.claude/skills/angular-*` entries are committed symlinks into `.agents/skills/`, maintained by the `skills` CLI.

**When writing or reviewing Angular/Taiga code, consult these first, in this order:** the matching skill below for the pattern (read the `angular-developer/references/*.md` file the umbrella points to for depth) → the `angular-cli` MCP for version-correct Angular APIs the skill doesn't settle → the `taiga-ui` MCP for any `Tui*` symbol/package/snippet (see "MCP servers" below). Don't assert a v22 Angular or Taiga v5 API from memory — both drift from training data.

Available skills:

| Skill                                | Use case                                                                                                                                                                                                                                           |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `angular-developer`                  | **Umbrella** for everyday Angular work — components, signals/`linkedSignal`/`resource`/`effect`, forms, DI, routing, ARIA, styling/Tailwind, testing, CLI/tooling. Body is an index into `references/*.md`; read the matching reference for depth. |
| `angular-best-practices-signalstore` | NgRx SignalStore patterns (`@ngrx/signals`, `@ngrx/signals/entities`, `rxMethod`)                                                                                                                                                                  |
| `angular-best-practices-transloco`   | Transloco i18n integration (runtime translation, per-route lazy translation files, test mocking)                                                                                                                                                   |

> The earlier sprawl of ~19 overlapping third-party Angular skills was removed in favour of the official `angular-developer` umbrella (from `github.com/angular/skills`, ships its full `references/` folder) plus the two project-specific add-ons that the umbrella does **not** cover (NgRx SignalStore + Transloco — both used here). Don't re-add granular per-topic skills (`angular-component`, `angular-signals`, `angular-routing`, …); their content lives inside `angular-developer/references/`.

**Upgrading:** run `npx skills update -p` in the repo root — it refreshes the three skills above from their source repos (`angular/skills`, `alfredoperez/angular-best-practices`). It rewrites the **committed** copies in `.agents/skills/`, so land the result through the normal commit → PR flow. (The old `skills-lock.json` scheme is retired.)

## MCP servers (`.mcp.json`)

Two MCP servers are configured for this project in `.mcp.json` — prefer them over memory for library-version-sensitive questions, since both Taiga v5 and Angular v22+ APIs drift from training data.

| Server        | Command                           | Use it for                                                                                                                                                                                                                                                                                                                                                           |
| ------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `taiga-ui`    | `@taiga-ui/mcp` (`llms-full.txt`) | Source of truth for Taiga UI components — which package a `Tui*` symbol comes from, the right component for a use case, real usage snippets, migration guides. Check it **before** writing or recommending any Taiga code (a wrong-package import is a compile error). Tools: `get_overview`, `get_list_components`, `get_component_example`, `get_migration_guide`. |
| `angular-cli` | `@angular/cli mcp`                | Angular workspace + version-correct guidance — `list_projects` (discover workspace/projects, run first), `get_best_practices` (load before writing Angular code), `search_documentation` (API/concept lookups), `onpush_zoneless_migration`. Prefer over shelling out to `ng` for equivalent actions.                                                                |

When an MCP server is unavailable, fall back to the conventions in this file (Taiga section, Component conventions) and say in your output that you couldn't verify against the live docs — don't assert an API you can't confirm.

## Workspace structure (pnpm)

Проект использует `pnpm-workspace.yaml`. Кроме корневого Angular-приложения есть workspace:

- `partykit-server/` — отдельный `package.json` с своими deps (partykit, vitest, typescript). Realtime-фичи. **Generic-движок** живёт в `partykit-server/src/engine/` (core-проходы + verbs + NPC-реестр, см. секцию «Frenzy engine»); **Multi-party**: каждая активность = named party в `partykit.json` + папка `partykit-server/src/parties/<game>/`: `index.ts` (тонкий `Party.Server`-адаптер — транспорт+lifecycle, хранит `players`/`items` массивами, зовёт СВЯЗАННЫЙ движок), `game.ts` (composition root: `createEngine(дефиниция, NPC-реестр)`), `slices/<kind>/` (runtime-код NPC, см. ниже), `parse-client-message.ts` (типизированный guard границы `onMessage`), `validate-join.ts`, `serialize-server-message.ts`, adapter-concerns `check-click-rate`/`mark-disconnected`/`restore-connected`, `__tests__/` (включая themed-спеки оркестратора `apply-tick.spec` и golden master — они тестируют СВЯЗАННУЮ игру, поэтому живут здесь, а не в движке). Сейчас одна — `frenzy` (Feeding Frenzy); клиент коннектится с `party: '<game>'` (endpoint `/parties/<game>/<roomId>`). Менял путь entry в `partykit.json` — перезапусти `partykit dev` (конфиг не hot-reload'ится). Серверные `console.log` спрятаны за `room.env.DEBUG` (`true`/`'true'`/`'1'`) — в prod молчат.

### Frenzy engine — чистая архитектура (придерживаться при доработках)

Движок — **generic и game-agnostic**, живёт в `partykit-server/src/engine/` (`core/` — оркестратор+проходы, `core/tick/` — тиковые проходы, `verbs/`, `npc/` — реестр `NpcRuntime`, `create-engine.ts`, generic-спеки движка — в `src/engine/__tests__/`, БЕЗ импортов из `parties/`). Каждый проход — **чистая generic-функция** над `<TItemId, TEffectId, TNpcId>`: тюнинг приходит ПАРАМЕТРОМ `game: GameDefinition` (первый аргумент), никаких module-scope импортов `FRENZY` в движке (санкционированные исключения — `crownIdOf`/`steerVelocity` из `@game/frenzy/`, generic по сигнатуре). **`createEngine(game, npcRegistry?)`** связывает движок с игрой и отдаёт `Engine` (`applyTick`/`applyClick`/`applyEmissions`/`applySteer`/`createPlayer`/`spawnItem`); derived-структуры (список emitters, hooks из NPC-реестра) мемоизируются там один раз — не пересобирать per-tick. Composition root — `parties/frenzy/game.ts` (`frenzyEngine` + `FRENZY_NPC_REGISTRY` + `frenzyNpcHooks` для спеков); адаптер `index.ts` зовёт только связанный `frenzyEngine.*`. Выносимая логика — в маленькие именованные функции с JSDoc.

- **`core/apply-tick.ts` — тонкий оркестратор**, который треды́т `working`-стейт через проходы из подпапки **`core/tick/`** (+ NPC-проходы через шов `npc.move`/`npc.applyBlasts`/`npc.coolAnger` — `NpcHooks` из `npc/types.ts`, собираются из per-kind реестра `npcHooksFromRegistry`; frenzy-реализация — слайс `parties/frenzy/slices/angry-bomb/`): `prune-effects` → `move-items` (+ сплит survivors/expired в оркестраторе) → `move-players` (люди) / `npc.move` (NPC, ищет еду вдоль дна) → `separate-players` (+ `apply-bumps`/`apply-impulses`, только при включённой player-collision) → `arm-emitted-items` (снять owner-immunity с разлетевшихся эмиссий) → `resolve-collisions` → `resolve-landings` → NPC-blast/cool-anger + `apply-scores` (kills; краун hp-лидера снимается ДО тика) → (только на decay-тиках) `apply-decay-step`. Общие хелперы прохода — `tick/collision-target.ts` (`findCollisionTarget`) и `tick/detonated.ts` (билдер `DetonatedEvent`; радиус приходит из `ItemInteraction.explodes.radius`). Порядок проходов менять осознанно — на нём держатся снапшот-инварианты.
- **`verbs/` — ЗАКРЫТЫЙ набор verb-примитивов, по файлу на verb** (`eat`, `gamble`, `grant-effect`, `nudge`, `explode`; blast-математика — `compute-blast.ts`, общая с NPC). Поведение предмета — это ДАННЫЕ: verb-дескрипторы в слайсе `shared-game/frenzy/definition/items/<item>.ts` (`interactions.onClick/onCollide/onLand` → `CoreInteractionSpec`), которые `resolve-interaction.ts` диспатчит в резолверы (там же — redirect клик-бюджета бомбы на explode-спеку). `index.ts` ре-экспортирует `resolveInteraction` и типы (`ItemInteraction`/`HpDelta`/`EffectGrant`/`PlayerImpulse` из `types.ts`), поэтому импортёры пишут `from './verbs'`. `toInventory` — зарезервированный шов без резолвера (бросает), `none` — триггер игнорируется. **Новый предмет — БЕЗ правок движка: слайс дефиниции `shared-game/frenzy/definition/items/<item>.ts` (verb-дескрипторы/веса/флаг/физика) + строка в агрегаторе `definition/items/index.ts` + клиентский арт одной записью в `ITEM_ART` (sprite/dotColor/sandPuff) + HUD-легенда (`ITEM_GROUP` + i18n `frenzy.legend.items`, см. art-pipeline шаги 4–5). Новая механика вне словаря = осознанное расширение: новый файл verb'а + вариант `CoreInteractionSpec` + ветка диспатча.**
- **Хелперы `core/`** (рядом с оркестратором): `apply-click.ts` (click диспатчит в `grantEffectResult`/`detonateClickResult`/`nudgeResult`/`eatResult`), `apply-hp-deltas.ts` (`applyHpDeltas` → `HpDeltaResult`: `groupByPlayer` + `netAmount` с `damageTaken`-множителями + `resolvePlayerHp`), плюс `apply-effect`, `apply-steer`, `apply-emissions` (+`buildEmitters`), `apply-bumps`, `apply-impulses` (cap per-impulse `maxFactor`), `apply-scores`, `faint-cause`, `calculate-stage`, `create-player`, `spawn-item`, `pick-item-type`, `effect-modifiers` — тот же стиль «чистая функция-проход на файл». Adapter-concerns (`check-click-rate`, `mark-disconnected`/`restore-connected`) — НЕ движок, лежат в `parties/frenzy/`.
- **NPC-runtime живёт в слайсе игры `parties/frenzy/slices/<kind>/`** (сейчас один — `angry-bomb`: per-NPC `move-npc`/`cool-anger`, state-level `npc-blast`, фабрика `create-npc`, poke-математика `anger`; `runtime.ts` собирает их в `NpcRuntime`). В движке (`src/engine/npc/types.ts`) — только generic-шов: интерфейс `NpcRuntime`, реестр `NpcRegistry` (`Partial<Record<NpcKind, NpcRuntime>>`) и адаптер `npcHooksFromRegistry` (диспатч по `npc.npcKind`; незарегистрированный kind инертен). Реестр регистрируется в composition root (`game.ts`); шедулинг спавна/anger в адаптере читает данные напрямую из слайса дефиниции `shared-game/frenzy/definition/npcs/angry-bomb.ts` (дескриптор + anger/strongBlast/seek-список + гейт `enabled`). NPC — это `Player` с `isNPC`-признаком, не отдельная сущность в снапшоте.
- **Feature-flags — единая точка гейтинга в `pickItemType`** (`core/pick-item-type.ts`, generic: rng + предикат `isEnabled` + пул-веса — все параметры обязательны, themed-дефолтов больше нет; движок передаёт `game.items[type].enabled`). Этим гейтятся ОБА пути спавна (обычный дроп `engine.spawnItem()` и эмиссии в `apply-emissions.ts`) одним флагом; NPC-спавн гейтится полем `enabled` его `NpcDefinition` в адаптере так же. Инвариант: ≥1 предмет `enabled`. **Вторая, компайл-тайм половина флага (фаза 6):** публичные юнионы `ItemType`/`PlayerEffectKind` выводятся только из ВКЛЮЧЁННЫХ слайсов (`EnabledKey` в `shared-game/engine/definition.ts` фильтрует по литералу `enabled`; у эффектов `enabled?` — чисто type-level гейт, рантайм-пути спавна у эффекта нет). Дремлющий (`enabled: false`) слайс сидит в ростере и в пуле, но его литерала нет в юнионах → клиентские exhaustive-Record'ы не требуют арт/i18n; флип флага роняет компиляцию ровно в местах, которые надо заполнить. Реальный компайл-гейт связки флагов — явные type-args `<ItemType, PlayerEffectKind, NpcKind>` на границе связывания в `game.ts` (и там, где результат generic-вызова с `FRENZY_DEFINITION` присваивается суженным типам — `npc-blast.ts`, golden-master/separate-players спеки); вызов без явных args инферит полный `keyof` ростера — это безвредно, пока результат никуда узкому не присваивается (так живёт `apply-tick.spec`), но на такие места гейт не рассчитывай.

### Frenzy cookbook — как добавить предмет / эффект / NPC / verb

Живой шаблон — дремлющий демо-слайс **barbed-wire** (`definition/items/barbed-wire.ts` + `definition/effects/barbed-wire.ts`, спеки в `partykit-server/src/parties/frenzy/slices/barbed-wire/__tests__/`): предмет+эффект «двойной исходящий bump-урон на 10с», НОЛЬ правок движка. Включение = флип двух `enabled`; дальше компилятор сам ведёт по чеклисту.

- **Предмет:** 1) слайс `shared-game/frenzy/definition/items/<item>.ts` (`enabled`, physics, `spawn.world`-вес обязателен + опц. кураторские пулы, verb-дескрипторы `onClick`/`onCollide`/`onLand`); 2) строка в `definition/items/index.ts` — ТОЛЬКО В ХВОСТ (порядок ключей rng-load-bearing); 3) при `enabled: true` клиент не соберётся, пока не заполнишь: `ITEM_ART` (art-pipeline шаги 1–4), `ITEM_GROUP` + i18n легенды (шаг 5), `emptyCounts()` в `frenzy-stats.store.ts` (+ литеральные `Record<ItemType,…>` в спеках, напр. `fainted-modal.component.spec` — компилятор покажет); 4) поведение чисто словарное → хватает контракт-снапшотов; нетривиальная комбинация → спек в `parties/frenzy/slices/<item>/__tests__/` (шаблон — barbed-wire).
- **Эффект:** 1) слайс `definition/effects/<effect>.ts` (modifiers `decayPaused`/`damageTaken`/`damageDealt`, `emission`, `exclusiveGroup`; `enabled?: false` — пока дремлет); 2) строка в `definition/effects/index.ts` (порядок важен только для emitters: побеждает ПЕРВЫЙ активный); 3) грант — `grantEffect`-дескриптор предмета или `spawnEffects.onJoin`; 4) при включении клиент уронит tsc в `EFFECT_AURA_CLASS`, `STATUS_FOR_EFFECT`, `soundForEffect`. **Связка флагов:** включил предмет, забыл его эффект → не соберётся `game.ts` (грант-спека не лезет в суженный юнион).
- **NPC:** 1) дефиниция `definition/npcs/<kind>.ts` (`NpcDefinition` + kind-специфичный тюнинг; `enabled` — рантайм-гейт в адаптере); 2) строка в `FRENZY_NPCS` (`definition/index.ts`); 3) runtime в `parties/frenzy/slices/<kind>/` (`NpcRuntime`: `move`/`applyBlasts`/`coolAnger`) + регистрация в `FRENZY_NPC_REGISTRY` (`game.ts`); 4) клиент: спрайт в `NPC_SPRITES`.
- **Verb (расширение ЗАКРЫТОГО словаря — осознанное решение, не дефолт):** файл `engine/verbs/<verb>.ts` + вариант `CoreInteractionSpec` (`shared-game/engine/definition.ts`) + ветка диспатча в `resolve-interaction.ts` + generic-спек в `engine/__tests__/`. Нужен, только если механика не выражается существующими verb'ами/модификаторами эффектов.

Любая команда workspace-а: `pnpm --filter @ng-kitty/partykit-server <script>`.

`pnpm dev` запускает обе половинки через `concurrently` (Angular на 4200, PartyKit на 1999).

**Гомогенность tooling:** в обоих workspaces — TypeScript strict, ESLint, Vitest, тот же `interface`-style. У каждого workspace свой `eslint.config.js` и `tsconfig.json`. ESLint требует `tsconfigRootDir: import.meta.dirname` в **обоих** конфигах — иначе он не знает, какой tsconfig корневой при пересечении проектов.

`node_modules` в .gitignore написан БЕЗ leading slash (`node_modules`, не `/node_modules`) — иначе nested `partykit-server/node_modules/` попадает в commit.

### Сервер держим pokemon/theme-agnostic (принцип + roadmap)

**Принцип:** контракт `shared-game/frenzy/` и движок `partykit-server/` НЕ должны перечислять тематические сущности (ростер покемонов, «эволюция на 200/500»). Всё, что зависит от конкретного актёра — **внешний вид, физический размер, скорость, пороги стадий** — приходит с клиента на `join` непрозрачными числами, сервер их только хранит на `Player` и применяет, как и `appearance`. Сейчас так сделано для:

- `Player.appearance` — непрозрачная строка (клиент резолвит в `Line`/спрайт, фолбэк на неизвестное в `pokemon-registry.ts`).
- `Player.body: PlayerBody` (per-stage `{ width, height, speed, maxSpeed, hp }`) — размер, крейсер/кап скорости и **HP-гейты стадий** едут на `join`; `calculateStage(hp, body)` читает гейты игрока, а не `FRENZY.thresholds` (их больше нет). AABB-коллизия (`tick/collision-target.ts`) и size-aware границы (`tick/move-players.ts`) читают `body`. Клиентская таблица — `STAGE_BODY` в `pokemon-registry.ts`, валидация формы в `parse-client-message.ts` + политика/границы → код причины в `validate-join.ts` (→ `ServerMessage` `joinRejected`).

**Roadmap оставшихся связностей (от крупной к мелкой):**

- **`ItemType`-юнион** — поведение предметов data-driven (verb-дескрипторы в слайсах + `engine/verbs/`), generic-движок ИЗВЛЕЧЁН в `src/engine/` с `createEngine(game)` (фаза 4 плана в `.planning/` — done); юнион остаётся выводимым из ростера дефиниций (компайл-тайм exhaustiveness на клиенте — фича, не связность). NPC-runtime-реестр (фаза 5) — done. **todo:35 ЗАКРЫТ** (фаза 6 — done): barbed-wire-демо (дремлющий слайс) + cookbook (секция выше).
- **`PlayerEffectKind`** — тематические эффекты (shield/wellFed/laying/pooping); уйдут вместе с предметами.
- **HP-экономика и «аквариум/дно»** — физика нейтральная, тематично только именование; трогать при появлении второй темы (другой сайт/тематика в своей party-комнате).

## Key ESLint rules to know

- `@typescript-eslint/explicit-member-accessibility` — all class members need explicit access modifiers (`public`/`private`/`protected`); exceptions: `constructor`, `transform`
- `@typescript-eslint/consistent-type-definitions` — use `interface` for object shapes; `type` is OK for unions, primitives, mapped types
- `@typescript-eslint/consistent-type-imports` — type-only imports must use `import type`. E.g. `import type { OnInit } from '@angular/core'` separate from value imports
- `@typescript-eslint/no-explicit-any` — banned (relaxed in `*.spec.ts` and `*.mock.ts`)
- `import/no-cycle` — circular imports are errors
- `sort-imports` — members inside one `import { a, b, c }` must be sorted alphabetically (case-insensitive). Imports across lines NOT sorted, only within braces
- `unicorn/prevent-abbreviations` — most abbreviations banned. Allow list: `acc`, `env`, `i`, `j`, `props`, `Props`, `args`, `ImportMetaEnv`. Everything else needs full word: `Msg → Message`, `prod → production`, `ctx → context`, `req → request`, `cfg → config`
- `unicorn/filename-case` — kebab-case OR camelCase. Same abbreviation rules apply to filenames: `environment.prod.ts` fails, must be `environment.production.ts`
- Member ordering enforced: static fields → instance fields → constructor → methods (public → protected → private)
- `@stylistic/padding-line-between-statements` — blank line required before `return`, after `import` block, between variable declarations and other statements
- `no-console` is **not configured** in this project — do NOT write `// eslint-disable-next-line no-console`, ESLint will flag it as "Unused eslint-disable directive"

## Common pitfalls (learned the hard way)

- **Gitignore границы `.claude/`**: `.planning/` и локальная часть `.claude/` (settings, worktrees, сессии) — gitignored, их правки живут только локально. **Исключения — обычные коммитящиеся файлы репо**: `CLAUDE.md`, папка `.agents/skills/` (Angular-скиллы + matt-набор), `.claude/commands/`, три папки скиллов — `.claude/skills/pr-review/`, `.claude/skills/codebase-audit/`, `.claude/skills/_shared/` — и симлинки `.claude/skills/angular-*` (закоммичены, чтобы облачные routines видели их в свежем клоне). Правки в исключениях проходят обычный flow: commit → PR → push.
- **Relative path counting**: глубокие `../../../../../` хрупкие — используй path alias. Для environments есть `@environments/*` (`@environments/environment`), для общей логики — `@game/frenzy/*`. Если всё же считаешь относительный путь и сомневаешься — сперва `pnpm typecheck`.
- **Husky `pre-commit`** runs `lint-staged + typecheck`. `lint-staged` includes `format:fix` on staged JSON/MD which **modifies** them. If commit fails (e.g. typecheck) — re-stage modified files before retry.
- **Husky `pre-push`** runs `pnpm lint + pnpm test`. Full lint over whole project + full test suite. Don't bypass with `--no-verify` unless explicitly authorized.
- **`pnpm typecheck`** uses `tsc -b --noEmit` (project references). New non-`src/` folders aren't checked automatically — add them to `tsconfig.app.json` `include` (e.g. `shared-game/**/*.ts`).
- **Branch naming pattern** is enforced — see `validate-branch-name` in `package.json`. Requires at least one `_` or `-` separator AFTER the type prefix: `feat/foo_bar` ✓, `feat/foo` ✗.
- **Vitest exits 1 if no tests found.** Either add a smoke spec or use `--passWithNoTests` flag. CI-friendly default is to keep at least one spec per workspace.

## Agent skills

`docs/agents/` is **local-only (gitignored)**, like `.planning/` — in a fresh clone these files are absent; fall back to the one-line summaries below.

### Issue tracker

Local markdown — issues and PRDs live under `.scratch/<feature-slug>/` in this repo (gitignored). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary — each triage role string equals its canonical name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
