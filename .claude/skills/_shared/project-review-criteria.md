# Project Review Criteria — angular-ngKittyDebugLeft

**Shared source of truth for what good code looks like in this project.**
Read by both delivery skills — `pr-review` (inline PR comments) and `codebase-audit`
(grouped GitHub issues). These criteria are channel-agnostic: they describe _what_ to
flag, not _how_ to deliver it. Severity taxonomy (👺 🔴 🟡 🫥 💩 🤮) is defined by the
calling skill; this file maps findings to those severities.

---

## 1. Project Context

- **Stack**: Angular v22, Standalone components, Taiga UI, Transloco, TypeScript strict mode.
- **Selector prefix**: `left-paw-` — flag components/directives/pipes that don't use it.
- **ESLint**: Strictly enforced — lint errors block approval. See `CLAUDE.md` ("Key ESLint rules to know") for the full set.
- **Workspaces**: root Angular app + `partykit-server/` (realtime). Shared contract lives in `shared-game/` under `@game/*`. See `CLAUDE.md` ("Workspace structure") for the boundary rules.

---

## 2. Project Style Guides — read before analysis, enforce first

**These docs define the team's written agreements.** Violations get `👺` — the harshest severity.
Read them from `docs/` (in the checkout being reviewed) at the start of every review.

| File                                    | What it covers                                                                         | When to read                        |
| --------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------- |
| `docs/Стайлгайд нейминг и структура.md` | Component/service/form/method naming, file structure, collections, converters, facades | Always                              |
| `docs/Стайлгайд структура папок.md`     | core/shared/features layering, facade pattern, dependency rules, file placement        | Always                              |
| `docs/Стайлгайд коммиты.md`             | Conventional commit format, scope, subject rules, 100-char limit                       | Always                              |
| `docs/Стайлгайд PR.md`                  | Draft→Ready lifecycle, self-check, PR description requirements                         | Always                              |
| `docs/Стайлгайд тестирование.md`        | AAA structure, describe/it naming, fixtures, mocks, TestBed, Vitest rules              | When `*.spec.ts` files are in scope |

### Key 👺 violations to flag

**Architecture / folder structure (`Стайлгайд структура папок.md`):**

- Component calls `*ApiService` directly, bypassing facade
- Feature A imports internals of feature B
- `shared` imports feature-specific business logic
- `core` contains product code of a single feature page
- Business rules left in template or page component (not in facade/service)
- File placed in wrong layer (e.g., reusable component buried inside `<page-name>/` instead of `shared/ui`)

**Naming (`Стайлгайд нейминг и структура.md`):**

- API model named without `ApiData`/`ApiResponse` suffix
- Client model named without `Model` suffix
- Array variable missing `List` suffix
- Converter not following `convert<Entity>To<Target>` pattern
- Facade not named `<Entity>Facade`
- Form control/group/array missing `FormControl`/`FormGroup`/`FormArray` suffix
- Event handler not prefixed with `on`
- Constant not in `UPPER_SNAKE_CASE`

**Testing (`Стайлгайд тестирование.md`):**

- `it` description doesn't start lowercase
- AAA blocks not separated by blank lines
- `toHaveBeenCalled()` instead of `toHaveBeenCalledTimes(1)`
- `toHaveBeenCalledWith(...)` instead of `toHaveBeenNthCalledWith(1, ...)`
- Mock not typed with `MockedObject<Partial<T>>`
- Fixture not using `as const satisfies Type`
- `vi.mock` at module level without team exception
- Private methods tested directly instead of extracting to helper

**Commits (`Стайлгайд коммиты.md`):**

- Missing conventional prefix (`feat:`, `fix:`, etc.)
- Subject starts with capital letter or ends with period
- Line exceeds 100 characters
- Mixed logical units in one commit

---

## 3. Angular v22 Code Quality Checklist

### Angular verification — skills first, then the `angular-cli` MCP

Angular v22+ APIs drift from training data, so a v22 verdict written from memory is a liability — the same trap as a wrong-package Taiga import. Two layers of ground truth, both available during review:

1. **Project skills** (`.claude/skills/`) — `angular-developer` (umbrella; read the matching `angular-developer/references/*.md` for the deep version), `angular-best-practices-signalstore` (NgRx SignalStore), `angular-best-practices-transloco` (Transloco). Consult the matching one before any pattern-specific finding.
2. **`angular-cli` MCP** — version-correct source of truth when the skills don't settle it. `mcp__angular-cli__search_documentation` for API/concept lookups, `mcp__angular-cli__get_best_practices` for the version-pinned standards, `mcp__angular-cli__list_projects` to discover the workspace. Prefer it over asserting an API from memory.

If the MCP is unavailable, fall back to the skills + this checklist and say in the finding you couldn't verify against live docs — don't assert an API you can't confirm.

### Repo-specific verification guards — known false-positive traps

These are real traps a past audit hit. Each looks like a violation from memory but is correct **in this repo** — check before flagging, and when the MCP is unavailable, the installed type defs in `node_modules/@angular/core` are the authoritative fallback (grep them; that's how `@Service` below was confirmed).

- **Angular majors drift — trust the install, not the doc label.** Docs here say "v22" and `node_modules/@angular/core` is `22.x` today, but after the next upgrade they may diverge again. Verify version-sensitive verdicts against the installed version.
- **`@Service()` is a real decorator.** Angular v22 ships `@Service()` (a root-provided, tree-shakable sibling of `@Injectable({providedIn:'root'})`). `ThemeSwitcherService`/`LanguageSwitcherService` use it deliberately — **not** a "should be `@Injectable`" finding.
- **Private fields first is the project's order.** `eslint.config.js` `member-ordering.classes` lists `private-field` **before** `public-field`. So `private readonly x = inject(...)` ahead of public fields is _required_ here, not a violation. (The `default` order is public-first, but `classes` overrides it.)
- **`unicorn/prevent-abbreviations` only flags its built-in dictionary.** Short names it doesn't know (`fb`, `bp`, `lang`) pass lint. If lint is green, don't re-flag an abbreviation as an ESLint violation — at most a 🫥 naming nit tied to the team's word, never a 🔴.
- **Don't trust a constant's name to mean "unused" or "wrong-typed".** Confirm with `git grep` before calling code dead or a value a bug (e.g. `TABLE_BREAKPOINT='800'` looks wrong but is interpolated into `(min-width:800px)` at the use site).

When lint already passes for the whole repo (it does on `develop` — pre-push runs `pnpm lint`), treat any "this breaks rule X" finding skeptically: if ESLint would have caught it, it wouldn't be on `develop`. Reserve 🔴/🟡 ESLint-rule findings for things lint genuinely can't see (logic, architecture, template-semantics, i18n).

### Mandatory patterns — flag every violation

- **Standalone** — no `NgModule`; every component/pipe/directive must be standalone.
- **Signal inputs** — `input()` / `input.required()` instead of `@Input()`.
- **Signal outputs** — `output()` instead of `@Output() new EventEmitter()`.
- **`required` + nullish type** — `input.required<T | null>()` / `model.required<T | undefined>()` are self-contradictory: `.required` already guarantees the parent binds the input, so widening its type with `| null`/`| undefined` betrays a confusion between "binding is mandatory" and "value may be absent". `| undefined` is worse than `| null` (a required input is never `undefined` without a cast). Fix: either drop `.required` and give a default (`input<T | null>(null)`), or strip the nullish from the type. Severity: `| undefined` → 💩, `| null` → 🟡.
- **`inject()`** — prefer `inject()` over constructor injection.
- **Control flow** — `@if`, `@for`, `@switch` instead of `*ngIf`, `*ngFor`, `*ngSwitch`.
- **`import type`** — type-only imports must use `import type { ... }`.
- **`interface` not `type`** — object shapes use `interface`, not type aliases.
- **Explicit visibility** — every class member must declare `public`, `protected`, or `private`.
- **No `any`** — including casts. `@typescript-eslint/no-explicit-any` is an error.
- **Member ordering** — static fields → instance fields → constructor → methods (public → protected → private within each group).

### Performance & reactivity

- **OnPush** — all components must use `changeDetection: ChangeDetectionStrategy.OnPush`.
- **`computed()`** — use for derived state; don't compute in templates or track manually.
- **`effect()`** — only for side effects; flag any that could be `computed()` or a lifecycle hook.
- **Subscriptions** — `Observable.subscribe()` must use `takeUntilDestroyed()` or `async` pipe.

### Performance — modern APIs

- **`@defer`** — use deferrable views for heavy/non-critical UI blocks; flag eager loading of large components without `@defer`.
- **Functional interceptors** — `HttpInterceptorFn` instead of class-based `HttpInterceptor`; flag any class implementing `HttpInterceptor`.
- **`provideHttpClient()`** — verify `app.config.ts` uses the functional provider, not the deprecated `HttpClientModule`. Note: this project's own `app.config.ts` calls bare `provideHttpClient()` **without** `withFetch()`, so a missing `withFetch()` is the project baseline — at most a 🫥 nit ("стоит добавить `withFetch()` для fetch-бэкенда"), never a 🔴. Don't roast a student for matching the repo.

### TypeScript & cleanliness

- `max-classes-per-file: 1`, `prefer-const`, `curly: all`, `complexity: 20`, `no-confusing-arrow`

### Files to skip entirely — do NOT flag these

- Lock files: `pnpm-lock.yaml`, `package-lock.yaml`, `yarn.lock`
- Generated output: `dist/`, `.angular/`, `*.js.map`
- IDE / OS noise: `.idea/`, `.DS_Store`, `.vscode/`

---

## 4. RS School Criteria

- **PR Description** — 🟡 must explain _what_ and _why_; link to the task. Empty or "done" → light reminder, not a blocker. _(PR-review only — N/A for codebase audits.)_
- **Commit Messages** — 💩 non-conventional commit messages (`fix`, `update`, `changes`, bare `WIP`) get a full roast. No conventional prefix = instant 💩.
- **Task Requirements** — verify the code actually satisfies the scoring criteria.
- **Taiga UI** — prefer Taiga UI components over raw HTML for buttons, inputs, cards, dialogs. See `CLAUDE.md` ("UI library — Taiga UI v5") for the project's Taiga conventions (directives on native tags, `var(--tui-*)` colors, `TuiAvatar` + `<img>` rule).

### Taiga UI verification — use the `taiga-ui` MCP, don't trust memory

Taiga UI v5 moves fast and its API differs from what's in training data — the **#1 cause of breakage is importing a `Tui*` symbol from the wrong package**, which is a compile error, not a nit. So whenever a Taiga finding is on the line, treat the `taiga-ui` MCP server as the source of truth and check it **before** writing the finding, not after.

Reach for the MCP in two situations:

1. **The code touches Taiga** (a `Tui*` import, a `tui*` directive/attribute, a `var(--tui-*)` token, or raw HTML where a Taiga component clearly fits). Verify the right component, the right package, and the documented API shape — don't roast from memory and don't wave through a wrong-package import.
2. **You're about to recommend a Taiga component/directive/pipe** ("use `TuiAvatar` here", "this should be a `tuiButton`"). Confirm the symbol exists, lives in the package you're naming, and that your suggested snippet matches the real API — a fix that doesn't compile is worse than no fix.

The tools (full playbook in `pr-review/reference/taiga-mcp.md`):

- `mcp__taiga-ui__get_overview` — Import Map (symbol → package) + Common Mistakes checklist. Read first when unsure which package a symbol comes from.
- `mcp__taiga-ui__get_list_components` (`query`) — fuzzy-find the right component/directive for a use case.
- `mcp__taiga-ui__get_component_example` (`names`) — real usage snippets to ground a fix.
- `mcp__taiga-ui__get_migration_guide` — only when the work is a Taiga version bump.

If the MCP is unavailable, fall back to `CLAUDE.md` Taiga conventions and say in the finding that you couldn't verify against the docs — don't assert an API you can't confirm.

---

## 5. Accepted trade-offs — deliberate, do NOT flag or re-file

This is a **learning project** (RS School). A few findings that read as "inconsistency" or "tech
debt" are in fact **conscious teaching choices** the team has accepted — surfacing them only churns
the backlog and the PR threads. Unlike the false-positive traps in §3 (where the code isn't actually
wrong), here the code _is_ as described — it's just **won't-fix by team decision**.

Treat every entry below as already-resolved in **both** delivery skills:

- **`pr-review`** — don't leave a comment about it.
- **`codebase-audit`** — don't file a new issue, and **don't reopen** a closed one even though the
  code still matches (the closed issue is the decision record). Note it in the run report as
  `<slug> → принятое исключение, пропущено`.

| Accepted trade-off                                                                                                                                         | Audit class slug      | Why it's OK here                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Фича `auth` намеренно использует две парадигмы форм: Reactive Forms (`login-form`) и Signal Forms (`signup-form`, `@angular/forms/signals`) в одной фиче. | `mixed-form-paradigms` | Учебный проект: цель — показать оба form-API Angular бок о бок. Несогласованность здесь — учебная задача, а не долг к погашению. Решение зафиксировано закрытием issue #163 (label `AI TechDebt`, scope `auth`). |

Adding a new row here is a **team decision, not an audit call** — record it only after the maintainer
has explicitly signed off, and link the issue/PR that captures the decision so the row stays auditable.
