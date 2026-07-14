# AGENTS.md

This file provides guidance to coding agents working in this repository.

**This is the single source of truth.** `CLAUDE.md`, `GEMINI.md` and `AGENT.md` are symlinks to this file — edit `AGENTS.md`, never a symlink, and every agent picks the change up. Don't re-fork them into standalone copies; that is exactly the drift this layout removes.

## Working principles

- **Think before coding.** State assumptions explicitly; if multiple interpretations exist, present them — don't pick silently. If something is unclear, stop and ask. Push back when a simpler approach exists.
- **Simplicity first.** Minimum code that solves the problem: no speculative features, abstractions for single-use code, or "configurability" nobody asked for. If 200 lines could be 50, rewrite.
- **Surgical changes.** Touch only what the task requires: don't "improve" adjacent code or formatting, match existing style, mention unrelated dead code instead of deleting it. Do remove imports/variables that YOUR change orphaned. Every changed line should trace to the request.
- **Goal-driven execution.** Turn tasks into verifiable goals ("fix the bug" → "write a failing test that reproduces it, make it pass"). For multi-step work, state a brief plan with a verify step per item.

## Project board

Tasks and issues are tracked on GitHub Projects: https://github.com/orgs/ngKittyDebug/projects/2

## Commands

```bash
pnpm start          # dev server at http://localhost:4200
pnpm dev            # Angular (4200) + PartyKit (1999) via concurrently
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

Run a single test file: `pnpm ng test --include="**/main-catalog-page.component.spec.ts"`
Any workspace script: `pnpm --filter @ng-kitty/partykit-server <script>`

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

## Frenzy deep-dives (docs/)

The realtime game's detailed docs live in `docs/`:

- [docs/frenzy-architecture.md](docs/frenzy-architecture.md) — shared contract (`@game`), definition slices + derived unions + feature flags, theme-agnostic server principle/roadmap, PartyKit workspace layout, engine clean architecture (tick passes, verbs, NPC runtime), client data layer, scene elements.
- [docs/frenzy-cookbook.md](docs/frenzy-cookbook.md) — recipes: add an item / effect / NPC / verb; item art pipeline (Fluent Emoji, sizes, `ITEM_ART`, HUD legend).

Consult them BEFORE changing `shared-game/`, `partykit-server/`, or `features/frenzy/` — pass order, pool-key order and union derivation are load-bearing.

## Testing style

Test structure/naming rules live in `docs/Стайлгайд тестирование.md` (AAA, one meaning per test, `describe` hierarchy, mocks/fixtures conventions). The other `docs/Стайлгайд *.md` files cover PR, commits, naming and folder structure — the review skills enforce them.

## Skills (project-scoped)

Skills live **committed** in `.agents/skills/` and are symlinked into `.claude/skills/`, so fresh clones and cloud environments get them out of the box. The lockfile `skills-lock.json` at the repo root tracks every one (source repo + path + content hash). Both are tracked — changes land through the normal commit → PR flow.

**25 skills from two sources:**

| Source                                                      | Count | Skills                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `angular/skills` + `alfredoperez/angular-best-practices`    | 3     | `angular-developer` (umbrella — components, signals, forms, DI, routing, ARIA, styling, testing; body is an index into `references/*.md`), `angular-best-practices-signalstore` (NgRx SignalStore), `angular-best-practices-transloco` (Transloco i18n)                                                                                                                                              |
| [`mattpocock/skills`](https://github.com/mattpocock/skills) | 22    | **engineering:** `tdd`, `triage`, `code-review`, `research`, `prototype`, `implement`, `diagnosing-bugs`, `codebase-design`, `domain-modeling`, `improve-codebase-architecture`, `resolving-merge-conflicts`, `to-spec`, `to-tickets`, `wayfinder`, `grill-with-docs`, `ask-matt`, `setup-matt-pocock-skills` — **productivity:** `grilling`, `grill-me`, `handoff`, `teach`, `writing-great-skills` |

Project-specific skills (`pr-review`, `codebase-audit`, `codebase-audit-workspace`, `_shared`) are hand-authored and live directly in `.claude/skills/` — they are not in the lockfile and `skills update` never touches them.

**When writing or reviewing Angular/Taiga code, consult in this order:** the matching skill (read the `angular-developer/references/*.md` file the umbrella points to) → the `angular-cli` MCP for version-correct Angular APIs the skill doesn't settle → the `taiga-ui` MCP for any `Tui*` symbol/package/snippet. Don't assert a v22 Angular or Taiga v5 API from memory — both drift from training data.

> Don't re-add granular per-topic Angular skills (`angular-component`, `angular-signals`, …) — their content lives inside `angular-developer/references/`.

**Upgrading:** `npx skills update -p` in the repo root refreshes every locked skill from its source and updates `.agents/skills/` + `skills-lock.json` together.

**Two traps:**

- **The mattpocock set is deliberately curated — don't restore what was cut.** `npx skills add mattpocock/skills` installs all 39 upstream skills; 17 were removed as irrelevant here: everything under upstream `deprecated/` and `in-progress/`, Matt's `personal/` ones (`obsidian-vault`, `edit-article`), course-authoring ones (`scaffold-exercises`, `migrate-to-shoehorn`), and the setup-only pair (`setup-pre-commit`, `git-guardrails-claude-code`). Re-running `add` brings them all back — prune again, and delete them from `skills-lock.json` too, or `update -p` reinstates them. `setup-pre-commit` is the sharp one: it is model-invocable and this repo already has Husky + lint-staged + typecheck + tests, so it can re-scaffold a working config.
- **Personal skills shadow project skills.** Same-named skills in `~/.claude/skills/` (a separate global lockfile, `~/.agents/.skill-lock.json`) win over the project copies. Updating only the project set leaves your stale global copy in charge. Update both: `npx skills update -p` here, and refresh the global set separately.

## MCP servers (`.mcp.json`)

Two MCP servers are configured — prefer them over memory for library-version-sensitive questions, since both Taiga v5 and Angular v22+ APIs drift from training data.

| Server        | Command                           | Use it for                                                                                                                                                                                 |
| ------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `taiga-ui`    | `@taiga-ui/mcp` (`llms-full.txt`) | Source of truth for Taiga UI — which package a `Tui*` symbol comes from, the right component for a use case, usage snippets, migration guides. Check it **before** writing any Taiga code. |
| `angular-cli` | `@angular/cli mcp`                | Workspace + version-correct guidance — `list_projects` (run first), `get_best_practices` (load before writing Angular code), `search_documentation`, `onpush_zoneless_migration`.          |

When an MCP server is unavailable, fall back to the conventions in this file and say you couldn't verify against live docs — don't assert an API you can't confirm.

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
- **Husky `pre-commit`** runs `lint-staged + typecheck`. lint-staged includes `format:fix` on staged JSON/MD, which **modifies** them. If the commit fails (e.g. typecheck) — re-stage the modified files before retrying.
- **Husky `pre-push`** runs `pnpm lint + pnpm test` — full lint + full test suite. Don't bypass with `--no-verify` unless explicitly authorized.
- **`pnpm typecheck`** uses `tsc -b --noEmit` (project references). New non-`src/` folders aren't checked automatically — add them to `tsconfig.app.json` `include` (e.g. `shared-game/**/*.ts`).
- **Branch naming pattern** requires at least one `_` or `-` separator AFTER the type prefix: `feat/foo_bar` ✓, `feat/foo` ✗.
- **Vitest exits 1 when no tests are found.** Either add a smoke spec or use `--passWithNoTests`. Keep at least one spec per workspace.

## Agent skills

`docs/agents/` is **local-only (gitignored)**, like `.planning/` — absent in a fresh clone; fall back to the one-line summaries below.

- **Issue tracker:** local markdown — issues and PRDs live under `.scratch/<feature-slug>/` (gitignored). See `docs/agents/issue-tracker.md`.
- **Triage labels:** default vocabulary — each triage role string equals its canonical name. See `docs/agents/triage-labels.md`.
- **Domain docs:** single-context — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
