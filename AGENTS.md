# AGENTS.md

Guidance for coding agents working in this repository.

**Single source of truth — edit this file, never `CLAUDE.md` or `GEMINI.md`.** Those two hold only an import directive pointing here, so a change lands for every agent at once. Rationale and the Windows caveat: [docs/skills.md](docs/skills.md).

## Working principles

- **Think before coding.** State assumptions explicitly; if multiple interpretations exist, present them — don't pick silently. If something is unclear, stop and ask. Push back when a simpler approach exists.
- **Simplicity first.** Minimum code that solves the problem: no speculative features, abstractions for single-use code, or "configurability" nobody asked for. If 200 lines could be 50, rewrite.
- **Surgical changes.** Touch only what the task requires: don't "improve" adjacent code or formatting, match existing style, mention unrelated dead code instead of deleting it. Do remove imports/variables that YOUR change orphaned. Every changed line should trace to the request.
- **Goal-driven execution.** Turn tasks into verifiable goals ("fix the bug" → "write a failing test that reproduces it, make it pass"). For multi-step work, state a brief plan with a verify step per item.

## Project board

Tasks and issues are tracked on GitHub Projects: https://github.com/orgs/ngKittyDebug/projects/2

## Commands

**Node 24 (`.nvmrc`) — run `nvm use` first.** There is no `engines` field to enforce it, and an older Node makes the Angular CLI fail in ways that don't name the real cause.

```bash
pnpm start          # dev server at http://localhost:4200
pnpm dev            # Angular (4200) + PartyKit (1999) via concurrently
pnpm build          # production build
pnpm test           # run tests once (Vitest via Angular builder)
pnpm test:cov       # tests with coverage report
pnpm test:party     # partykit-server tests only
pnpm lint           # ESLint check          (lint:fix   — auto-fix)
pnpm format         # Prettier check        (format:fix — auto-fix)
pnpm typecheck      # strict TypeScript check (tsc -b --noEmit)
pnpm preflight      # typecheck + lint + format + test in one shot (run before pushing)
pnpm skills:update  # refresh agent skills (see docs/skills.md — never the bare CLI)
```

Run a single test file: `pnpm ng test --include="**/main-catalog-page.component.spec.ts"`
Any workspace script: `pnpm --filter @ng-kitty/partykit-server <script>`

## Git conventions

**Branch naming** (enforced by `validate-branch-name` on pre-push) — note the separator is required **after** the prefix: `feat/foo_bar` ✓, `feat/foo` ✗.

```
(chore|feat|fix|docs|style|refactor|perf)/<word>[-_]<word>
```

**Commit types** (enforced by commitlint): `build`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`, `chore`

**Hooks:**

- `pre-commit` — lint-staged + `typecheck`. lint-staged runs `format:fix` on staged JSON/MD and **modifies** them: if the commit fails (e.g. on typecheck), re-stage before retrying.
- `pre-push` — validate-branch-name + full `pnpm lint` + full `pnpm test`. Don't bypass with `--no-verify` unless explicitly authorized.

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
│   ├── games/             # /games: hub page (authGuard) + child game routes (/games/frenzy — public; /games/tamagotchi, /games/pokemon-battle — authGuard)
│   ├── frenzy/            # /games/frenzy (data: { immersive: true }): realtime PartyKit game (see docs/frenzy-architecture.md)
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

- `@core/*` → `src/app/core/*`, `@features/*` → `src/app/features/*`, `@shared/*` → `src/app/shared/*` (Angular-internal)
- `@game/*` → `shared-game/*` — the **contract** (types/config) shared by the client and `partykit-server/`. Tuning config is `@game/frenzy/config` (NOT `constants`). Full picture — definition slices, derived unions, feature flags, theme-agnostic server: [docs/frenzy-architecture.md](docs/frenzy-architecture.md).
- `@environments/*` → `src/environments/*`

**Don't invent new aliases on the fly.** Sharing code between Angular and `partykit-server/` → extend `shared-game/` under `@game/*`. Inside Angular → extend `@core/*`, `@features/*`, `@shared/*`.

**`shared-game/<game>/` is warranted ONLY when the code is consumed by BOTH the client AND `partykit-server/`** — a genuine wire/logic contract (like `frenzy`: types + tuning config + deterministic helpers both sides run). A client-only game (no partykit party, e.g. a bot opponent computed in the browser) lives ENTIRELY in its feature — `pokemon-tamagotchi` and `pokemon-battle` are the model: types in `data/models/`, engine/logic in `data/services/`. Do not park a single-side game's implementation in `shared-game/` — the `@game` alias is a contract layer, not a dumping ground for "game-ish" code.

**Routing:** all routes lazy-load via `loadComponent`. The root route loads `LayoutComponent`, which renders child feature routes in its `<router-outlet>` (children in `features.routes.ts`). Games (frenzy, tamagotchi, pokemon-battle) are child routes of `/games` (`games.routes.ts`); `authGuard` sits on each game's own route (and on the hub page), not on the `/games` parent — except `frenzy`, which stays guard-free (public game) and carries `data: { immersive: true }` for full-bleed layout. Auth state lives in localStorage (key `loginFormData`); `authGuard`/`guestGuard` read it and cross-redirect.

**Auth forms are intentionally mixed-paradigm** (teaching demo of both form APIs): `login-form` — Reactive Forms, `signup-form` — Signal Forms (`@angular/forms/signals`). Accepted trade-off, not tech debt — recorded in `.claude/skills/_shared/project-review-criteria.md` §5 (slug `mixed-form-paradigms`), so the review skills don't flag it.

**Theming:** Taiga UI v5 dark/light mode via `ThemeSwitcherService` (wraps the `TUI_DARK_MODE` signal). Global styles in `src/styles/` — custom Taiga appearances in `buttons-taiga-appearances.scss`, color CSS variables in `root-colors.style.scss`, screen breakpoints in `_screens-width.scss`.

## UI library — Taiga UI v5

**Before hand-rolling SCSS bars, spinners, buttons, accordions, checkboxes — check for a ready Taiga component.** Custom implementations only when Taiga has no equivalent.

Imports: atomic elements (`TuiButton`, `TuiLink`, `TuiIcon`, `TuiRoot`, tokens `TUI_DARK_MODE`, `provideTaiga`) — from **`@taiga-ui/core`**; widgets (`TuiAccordion`, `TuiProgressBar`, `TuiAvatar`, …) — from **`@taiga-ui/kit`**.

Patterns:

- Most Taiga components are **directives on native tags**, not custom elements: `<progress tuiProgressBar [value]="x" [max]="100" size="m">`, not `<tui-progress-bar>`.
- Pass colors as `var(--tui-status-positive)` / `--tui-status-warning` / `--tui-status-negative` instead of hardcoded hex.
- The `size` input accepts one of `xxs | xs | s | m | l | xl | xxl` — don't invent values.
- **`TuiAvatar` with a raster image (PNG sprite, photo) — only via a child `<img>`, NOT `[tuiAvatar]="url"`.** The `[tuiAvatar]` input goes to `iconStart` and renders non-`@tui.*` values as a mono mask (`mask` + `currentColor`) → dark silhouette. Correct: `<span tuiAvatar size="s"><img [src]="url" alt=""/></span>`. `[tuiAvatar]="'@tui.user'"` for icons is fine.
- Theming goes through `provideTaiga()` in `app.config.ts` + the `TUI_DARK_MODE` signal in `ThemeSwitcherService`. Don't touch `<html>` classes directly.

In tests use `TuiRootComponentMock` from `@shared/mocks` instead of the real `TuiRoot` — otherwise TestBed drags in the theme DI graph.

## i18n — Transloco

**Every user-facing text (label, hint, button, aria-label, status) goes through Transloco. Hardcoded strings in templates are forbidden.** Numbers, user names, hp values are data, not text — bind them via `{{ value }}` without `t()`.

Locales `en`/`ru`, default `ru`; language persists via `transloco-persist-lang` (localStorage); switch via the `LanguageSwitcher` service. Feature pattern:

1. **Create a scope folder** `public/i18n/<scope>/en.json` + `ru.json` (same JSON structure both languages, camelCase keys).
2. **Register the scope in `*.routes.ts`** via `providers: [provideTranslocoScope('<scope>')]`.
3. **In the component** import `TranslocoDirective` from `@jsverse/transloco` (the standard pattern is the directive in the template — not `TranslocoPipe`, not `TranslocoService` in TS).
4. **In the template** wrap the root element: `*transloco="let t; prefix: '<scope>.<section>'"`; params go as the second argument of `t()` and substitute `{{paramName}}` in the JSON.

The loader (`src/app/transloco-loader.ts`) fetches `/i18n/<lang>.json`; for a scope Transloco requests `<scope>/<lang>`, so the file must live at `public/i18n/<scope>/<lang>.json` — renaming a scope means renaming the folder.

In tests use `TranslocoTestingModule.forRoot(...)` (see `fainted-modal.component.spec.ts`) — no real HTTP loader in the spec environment.

## Component conventions

- **Selector prefix:** `left-paw-`
- **Change detection:** always `ChangeDetectionStrategy.OnPush` (enforced by ESLint)
- **Standalone components only** (Angular 22, no NgModules)
- **Signals preferred** over observables for local state (`@angular-eslint/prefer-signals` warn)
- **File suffixes:** `.component.ts`, `.service.ts`, `.directive.ts`, `.pipe.ts`, `.resolver.ts`
- **Styles:** SCSS per component; the global style preprocessor includes `src/styles`, so partials import without relative paths
- **Code comments are English**, whatever language the conversation is in. Only write one to state a constraint the code can't show — not to narrate what the next line does.
- **Lazy-feature services are provided at the route level**, not `root` — a service only one lazy feature uses has no business in the root injector. When a component's logic outgrows it, extract a same-named facade rather than fattening the component.

## Frenzy deep-dives (docs/)

The realtime game's detailed docs live in `docs/`:

- [docs/frenzy-architecture.md](docs/frenzy-architecture.md) — shared contract (`@game`), definition slices + derived unions + feature flags, theme-agnostic server principle/roadmap, PartyKit workspace layout, engine clean architecture (tick passes, verbs, NPC runtime), client data layer, scene elements.
- [docs/frenzy-cookbook.md](docs/frenzy-cookbook.md) — recipes: add an item / effect / NPC / verb; item art pipeline (Fluent Emoji, sizes, `ITEM_ART`, HUD legend).

Consult them BEFORE changing `shared-game/`, `partykit-server/`, or `features/frenzy/` — pass order, pool-key order and union derivation are load-bearing.

## Testing style

Test structure/naming rules live in `docs/Стайлгайд тестирование.md` (AAA, one meaning per test, `describe` hierarchy, mocks/fixtures conventions). The other `docs/Стайлгайд *.md` files cover PR, commits, naming and folder structure — the review skills enforce them.

## Skills & MCP servers — consult before writing code

**Order for Angular/Taiga work:** the matching skill first (`angular-developer` is an umbrella — read the `references/*.md` it points to) → the `angular-cli` MCP for version-correct Angular APIs the skill doesn't settle → the `taiga-ui` MCP for any `Tui*` symbol/package/snippet. **Don't assert a v22 Angular or Taiga v5 API from memory — both drift from training data.** If an MCP is unavailable, fall back to this file and say you couldn't verify against live docs; don't assert an API you can't confirm.

| MCP (`.mcp.json`) | Use it for                                                                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `taiga-ui`        | Which package a `Tui*` symbol comes from, the right component for a use case, usage snippets, migration guides. Check **before** writing any Taiga code. |
| `angular-cli`     | `list_projects` (run first), `get_best_practices` (load before writing Angular code), `search_documentation`, `onpush_zoneless_migration`.               |

Skills are committed in `.agents/skills/` and mirrored into `.claude/skills/`, locked by `skills-lock.json`. Your agent already lists them with descriptions — no inventory here on purpose, it only goes stale. Upgrade with `pnpm skills:update`, **never the bare CLI**; the set is deliberately curated and the CLI has sharp edges — [docs/skills.md](docs/skills.md).

## Workspace structure (pnpm)

The repo is a `pnpm-workspace.yaml` monorepo: the root Angular app + `partykit-server/` (own `package.json`: partykit, vitest, typescript) hosting the realtime engine and party adapters — layout and engine rules in [docs/frenzy-architecture.md](docs/frenzy-architecture.md).

- Both workspaces share the tooling style: TypeScript strict, ESLint, Vitest, `interface`-style. Each has its own `eslint.config.js` + `tsconfig.json`; ESLint needs `tsconfigRootDir: import.meta.dirname` in **both** configs.
- Changed the entry path in `partykit.json`? Restart `partykit dev` — the config is not hot-reloaded. Server `console.log` is gated behind `room.env.DEBUG` — silent in prod.
- `node_modules` in `.gitignore` is written WITHOUT a leading slash (`node_modules`, not `/node_modules`) — otherwise the nested `partykit-server/node_modules/` lands in a commit.

## Key ESLint rules to know

- `@typescript-eslint/explicit-member-accessibility` — all class members need explicit access modifiers (`public`/`private`/`protected`); exceptions: `constructor`, `transform`
- `@typescript-eslint/consistent-type-definitions` — use `interface` for object shapes; `type` is OK for unions, primitives, mapped types
- `@typescript-eslint/consistent-type-imports` — type-only imports must use `import type`. E.g. `import type { OnInit } from '@angular/core'` separate from value imports
- `@typescript-eslint/no-explicit-any` — banned (relaxed in `*.spec.ts` and `*.mock.ts`)
- `import/no-cycle` — circular imports are errors
- `sort-imports` — members inside one `import { a, b, c }` must be sorted alphabetically (case-insensitive). Imports across lines NOT sorted, only within braces
- `unicorn/prevent-abbreviations` — most abbreviations banned. Allow list: `acc`, `env`, `i`, `j`, `props`, `Props`, `args`, `ImportMetaEnv`. Everything else needs the full word: `Msg → Message`, `prod → production`, `ctx → context`, `req → request`, `cfg → config`
- `unicorn/filename-case` — kebab-case OR camelCase. Same abbreviation rules apply to filenames: `environment.prod.ts` fails, must be `environment.production.ts`
- Member ordering enforced: static fields → instance fields → constructor → methods (public → protected → private)
- `@stylistic/padding-line-between-statements` — blank line required before `return`, after the `import` block, between variable declarations and other statements
- `no-console` is **not configured** — do NOT write `// eslint-disable-next-line no-console`, ESLint flags it as "Unused eslint-disable directive"

## Common pitfalls (learned the hard way)

- **Not every config path is tracked:** `.planning/`, `docs/agents/`, `docs/adr/`, `CONTEXT.md` and `.claude/settings.local.json` are gitignored — check `.gitignore` before assuming an edit lands in the repo (cloud routines only see what's committed). Tracked config changes go through the normal commit → PR flow.
- **Relative path counting:** deep `../../../../../` chains are fragile — use a path alias (`@environments/*`, `@game/frenzy/*`). If you count a relative path anyway and doubt it — `pnpm typecheck` first.
- **`pnpm typecheck`** uses `tsc -b --noEmit` (project references) and **does not check Angular templates** — verify template bindings with `pnpm build`. New non-`src/` folders aren't checked automatically either; add them to `tsconfig.app.json` `include` (e.g. `shared-game/**/*.ts`).
- **Vitest exits 1 when no tests are found.** Either add a smoke spec or use `--passWithNoTests`. Keep at least one spec per workspace.

## Agent skills

`docs/agents/` is **local-only (gitignored)**, like `.planning/` — absent in a fresh clone; fall back to the one-line summaries below.

- **Issue tracker:** local markdown — issues and PRDs live under `.scratch/<feature-slug>/` (gitignored). See `docs/agents/issue-tracker.md`.
- **Triage labels:** default vocabulary — each triage role string equals its canonical name. See `docs/agents/triage-labels.md`.
- **Domain docs:** single-context — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
