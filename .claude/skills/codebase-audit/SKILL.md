---
name: Codebase Audit
description: >-
  Scans the EXISTING codebase (the whole repo, a feature, or a path) for tech debt, style-guide and
  convention violations, and quality problems, then files them as grouped GitHub issues on the project
  board. ALWAYS use this skill whenever the user wants to audit, scan, sweep, ревизия, or "пройтись по"
  the codebase — or any feature/folder/path — to surface problems and turn them into a backlog of
  issues/tickets, EVEN IF they never say the words "audit" or "issue". Trigger phrasings include:
  "audit the auth feature and file them as tickets", "пройдись по src/app/features/frenzy и собери
  техдолг в issues", "просканируй core и заведи задачи на доску", "проверь кодовую базу фичи на качество
  и накидай тикетов", "сделай ревизию shared-game", "find everything that breaks our docs/ style guides
  and open an issue per problem class", "I want a backlog of all the OnPush/any/naming violations",
  "scan for facade-bypass or business logic leaking into components and file them", "оформи находки
  задачами с приоритетами". It groups findings by problem class (one issue per class), dedups against
  the board, and sets label + priority + size. Do NOT use it for: reviewing a pull request, a branch,
  or uncommitted changes (that is the pr-review skill); fixing code or implementing a change; running a
  linter or build; filing one specific already-known issue; or just listing existing issues. Not a PR
  review — no diff, no inline comments; it reads whole files from a develop worktree and creates issues.
---

# Codebase Audit → GitHub Issues for angular-ngKittyDebugLeft

Audit existing code and turn findings into a clean, actionable backlog of GitHub issues.
Same review knowledge as the `pr-review` skill — different delivery: no PR, no diff, no inline
comments. You read whole files from a `develop` worktree and file **grouped** issues.

## What this skill is for (and what it is not)

- **Is for**: sweeping the repo (or a scoped path/feature) for convention violations, tech debt,
  and quality problems, then filing them as issues a contributor can pick up.
- **Is not**: a PR review. There is no diff to scope against — you analyze full files. Don't reach
  for the `pr-review` workflow (worktree from a PR branch, inline `+`-line comments). If the user is
  reviewing a pull request, that's the other skill.

## 0. Voice — neutral and technical

Unlike `pr-review`, an audit issue is a **backlog ticket**, not a roast. It lives longer than a PR
comment and is read by whoever picks up the work — keep it precise and useful, not theatrical.

- State the problem, why it matters in this project, and exactly how to fix it.
- No jokes, no sarcasm, no emotional register. Precision is the whole job.
- **Language**: issue title and body **in Russian**. Code, APIs, file paths, links — in English.
- Severity is carried by an **emoji prefix in the title** (see below), not by tone.

### Severity → title prefix

Same taxonomy as `pr-review`, used only as a marker:

- 👺 **Style Guide** — violates a written team agreement in `docs/` (architecture, naming, structure, testing).
- 🔴 **Critical** — OnPush missing, `any`, subscription leaks, missing standalone, wrong-package Taiga import.
- 🟡 **Warning** — `prefer-const`, member ordering, missing `import type`, `required` + `| null`.
- 🫥 **Nit** — naming, minor style.
- 💩 **Shit** — copy-paste, debug leftovers, magic numbers, dead code, `required` + `| undefined`.
- 🤮 **Crap** — pervasive chaos: unreadable code, `any` everywhere.

## 1. Review criteria — the shared checklist

**The "what to flag" lives in one shared file:** `.claude/skills/_shared/project-review-criteria.md`.
Read it in full before scanning. It is shared with `pr-review` and covers project context, the
`docs/` style guides (👺 violations), the Angular v21 checklist (incl. the `required`+nullish smell),
RS School criteria, and the Angular + Taiga verification playbooks. **Apply the same verification
discipline:** validate every Angular-pattern finding against the `angular-developer` /
signalstore / transloco skills then the `angular-cli` MCP, and every Taiga finding against the
`taiga-ui` MCP, **before** you write it into an issue. A confidently-wrong issue wastes a
contributor's time and erodes trust in the backlog — worse than no issue.

---

## 2. Execution Workflow

The audit always runs against the **`develop` branch**, read from a **git worktree** — never the
mentor's current working tree. `develop` is the stable integration branch, so the backlog reflects
what's actually merged, not whatever feature branch happens to be checked out. The only writes to
GitHub are issue operations (`gh issue create` / `comment` / `reopen`) — in interactive mode each
one only after the user confirms it; in autonomous mode (see the section below) within its caps.

### Step 1 — Create a `develop` worktree, then scope

```bash
git fetch origin develop -q
REPO_SLUG=$(gh repo view --json nameWithOwner -q '.nameWithOwner | gsub("/"; "-")')
WORKTREE_PATH="/tmp/codebase-audit-${REPO_SLUG}-$$"   # $$ keeps parallel runs from colliding

# Drop stale worktree registrations from previous runs, then add ours
git worktree prune
git worktree add "$WORKTREE_PATH" origin/develop
```

All scanning and file reading happens **inside `$WORKTREE_PATH`**. The mentor's working tree is untouched.

An unbounded "audit everything" produces a flood of low-value issues. Pin the scope:

- If the user named a path/feature ("audit the frenzy feature", "проверь `src/app/features/about`") → that's the scope.
- If they said "the whole codebase" → confirm the breadth and the likely issue count before scanning; offer to narrow to the most-changed or most-critical area.
- If scope is unclear → ask. Default candidates: a single feature folder under `src/app/features/`, `partykit-server/src/`, or `shared-game/`.

Record the scope as a concrete file set **relative to the worktree**:

```bash
SCOPE="src/app/features/frenzy"
FILES=$(git -C "$WORKTREE_PATH" ls-files "$SCOPE" | grep -E '\.(ts|html|scss)$')
```

Respect the **skip list** from the shared criteria (lock files, `dist/`, `.angular/`, IDE/OS noise).

### Step 2 — Read criteria and scan

1. **Read** `.claude/skills/_shared/project-review-criteria.md` in full from the **project root**. Then read the `docs/*.md` style guides it points to **from `$WORKTREE_PATH/docs/`** (naming + folder structure always; testing guide if `*.spec.ts` is in scope) — the worktree has `develop`'s version of those.
2. **Scan** the scoped files inside `$WORKTREE_PATH`. Combine cheap pattern probes with full reads:
   - `git -C "$WORKTREE_PATH" grep`-style probes to locate candidates fast (e.g. `@Input(`, `@Output(`, `*ngIf`, `: any`, `input.required<[^>]*\| *null`, `changeDetection` absence in `@Component`).
   - Then **read the full file** (from `$WORKTREE_PATH`) for any candidate before judging — context decides whether it's a real violation.
3. **Verify before recording**: Angular-pattern findings against the skills + `angular-cli` MCP; Taiga findings against the `taiga-ui` MCP. If a tool is unavailable, say so in the issue and don't assert an API you can't confirm.

### Step 3 — Group findings by problem class

This is the core difference from `pr-review`. **Do not file one issue per occurrence** — that buries
the backlog. Group every finding by its **problem class** and file **one issue per class**, with a
checklist of all occurrences.

Examples of a "problem class":

- "Компоненты без `OnPush`"
- "`@Input()` вместо signal `input()`"
- "`required` с nullish-типом (`| null` / `| undefined`)"
- "Прямой вызов `*ApiService` в обход фасада" (👺)
- "Подписки без `takeUntilDestroyed()`"

One class with 12 occurrences = **one** issue with 12 checklist items, not 12 issues.

**Assign every class a deterministic slug** — a stable kebab-case id derived from the problem class
itself, never from the scope or the run. The slug rides inside the provenance marker
(`<!-- ai-codebase-audit:class=<slug> -->`, see below) and is what lets a re-run recognize "this
class is already filed" mechanically instead of by fuzzy title matching. Two rules keep slugs
stable across runs: (1) name the _violation_, not the location (`onpush-missing`, not
`frenzy-onpush`); (2) reuse the canonical slug when the class is a known one:

| Problem class                                           | Slug                  |
| ------------------------------------------------------- | --------------------- |
| Компоненты без `OnPush`                                 | `onpush-missing`      |
| `@Input()` вместо signal `input()`                      | `input-decorator`     |
| `@Output()` вместо `output()`                           | `output-decorator`    |
| `required` с nullish-типом (`\| null` / `\| undefined`) | `required-nullish`    |
| Использование `any`                                     | `any-usage`           |
| Прямой вызов сервисов в обход фасада                    | `facade-bypass`       |
| Подписки без `takeUntilDestroyed()`                     | `subscription-leak`   |
| Хардкод пользовательского текста мимо Transloco         | `i18n-hardcode`       |
| Type-only импорт без `import type`                      | `import-type-missing` |
| Нарушение member ordering                               | `member-ordering`     |
| Магические числа                                        | `magic-numbers`       |
| Мёртвый код / неиспользуемые символы                    | `dead-code`           |

A class not in the table gets a new slug by the same recipe (English, kebab-case, names the
violation). Mention the slug when presenting the draft so the user sees the dedup key.

Severity of the issue = the **highest** severity among its occurrences (a class is as bad as its worst case).

**Derive a board Priority (P0/P1/P2) from that severity** — it sets the project's Priority field so the
team can triage. Use judgment; the default mapping by severity:

| Severity                 | Priority |
| ------------------------ | -------- |
| 🔴 Critical · 🤮 Crap    | **P0**   |
| 👺 Style Guide · 💩 Shit | **P1**   |
| 🟡 Warning · 🫥 Nit      | **P2**   |

Adjust within reason — a 👺 that's a one-line rename is fine at P2; a 🟡 that blocks a user flow (e.g. a real validation gap) can warrant P1. Say why if you deviate.

**Also estimate a board Size (XS/S/M/L/XL)** — the effort to _fix_ the class (independent of severity).
Base it on the real work: number of occurrences, whether a new service/validator/abstraction is needed,
whether template + TS + i18n + tests all move:

| Size   | Effort to fix                                                                            |
| ------ | ---------------------------------------------------------------------------------------- |
| **XS** | One-liner / rename, single spot (e.g. `submit` → `onSubmit` in one file).                |
| **S**  | A handful of mechanical edits across 2–3 files, no new design (e.g. rename + templates). |
| **M**  | A new small unit — a validator, a service method, a constant module — plus its wiring.   |
| **L**  | Cross-cutting refactor touching many files or a shared abstraction; needs care + tests.  |
| **XL** | Large structural change (re-layering, new subsystem). Rare for one audit class.          |

**Also derive a Scope (one or more) — the feature/layer the finding lives in.** A backlog is only
useful if the team can filter it by area ("show me everything in `auth`"), so every issue carries one
or more `scope:<name>` labels. Derive the scope **from the source path of the occurrences**, not from
the topic — a finding's home is where its code sits. Mapping:

| Source path                                                | Scope                                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| `src/app/features/<feature>/…`                             | `<feature>` (e.g. `auth`, `main-catalog`, `about`, `not-found`, `frenzy`) |
| `src/app/core/…`                                           | `core`                                                                    |
| `src/app/shared/…`                                         | `shared`                                                                  |
| `src/app/app.*`, `src/main.ts`, `src/styles*`, root config | `app`                                                                     |
| `partykit-server/…`                                        | `server`                                                                  |
| `shared-game/…`                                            | `shared-game`                                                             |

A class whose occurrences span several areas gets **one label per distinct scope** — e.g. an i18n-hardcode
class found in both `about-page` and the `core` header is `scope:about` + `scope:core`. Pick scopes from
the _actual files in the "Где" checklist_, so the labels and the body never disagree. New feature folders
mint new `scope:<feature>` labels automatically (the script creates them on demand) — don't invent scopes
that don't match a real path.

### Step 4 — Draft all issues

Draft every issue using the **detailed report template** below. Don't create anything yet — Step 5
files them one at a time, with a duplicate check and your confirmation before each.

### Step 5 — Per issue: dedup → confirm → create (the interactive loop)

Issues land on the org project board (`ngKittyDebug/projects/2`), so a wrong or duplicate one is
visible to the whole team and annoying to clean up. Process **one issue at a time**, in this exact
order — never batch-create:

**5a. Check for an existing issue for this class.** Before showing each draft, search what's
already on the board so we never file a duplicate. The primary match is **mechanical, by class
slug** — fetch the bodies, not just the titles:

```bash
# Issues this skill filed before — match the exact class slug in the provenance marker
gh issue list --state all --search "ai-codebase-audit in:body" --limit 200 \
  --json number,title,state,body \
  --jq '.[] | select(.body | contains("ai-codebase-audit:class=<slug>")) | "#\(.number) [\(.state)]\t\(.title)"'
# Fallback nets — older audit issues without a slug, and manually-filed tasks:
gh issue list --state all --search "ai-codebase-audit in:body" --limit 200 --json number,title,state,url \
  --jq '.[] | "#\(.number) [\(.state)]\t\(.title)"'
gh issue list --state open --label "AI TechDebt" --limit 200 --json number,title,url \
  --jq '.[] | "#\(.number)\t\(.title)\t\(.url)"'
gh issue list --state all --search "<key phrase, e.g. OnPush>" --limit 50 --json number,title,state,url \
  --jq '.[] | "#\(.number) [\(.state)]\t\(.title)"'
```

A slug hit = same class, full stop. A fuzzy title/keyword hit = judge whether it's really the same
class. Then route by what you found — **never refile, but don't just skip either**; a periodic
audit's job is to keep the existing issue honest:

- **Existing issue is OPEN and you found occurrences NOT in its checklist** → extend it with a
  comment (don't edit the body — comments leave an audit trail):

  ```bash
  gh issue comment <NUMBER> --body-file /tmp/new_occurrences.md
  # body: одна строка контекста (когда и где сканировали) + новые пункты `- [ ] path:line`
  ```

- **Existing issue is CLOSED but the occurrences are still (or again) in the code** → reopen with
  an explanation, do NOT open a twin:

  ```bash
  gh issue reopen <NUMBER> --comment "Аудит <дата>: проблема всё ещё в коде — <path:line>, …"
  ```

- **Existing issue is OPEN and covers everything you found** → nothing to do; one line in the run
  report ("`onpush-missing` → уже #42, без изменений").
- **Nothing similar** → go to 5b.

In interactive mode, show the planned comment/reopen to the user before executing it, same as a
new issue. In autonomous mode (see below) execute directly — comments and reopens don't count
against the new-issue cap.

**5b. Present this one issue to the user and wait.** Show the full draft — title (emoji + count),
**severity + the Priority (P0/P1/P2), Size (XS–XL) and Scope(s) you derived**, and the complete body — and the dedup result ("ничего похожего не нашёл" / "есть #42, но про другое"). Then **stop and ask for explicit confirmation for this specific issue.** Do not proceed to the next issue until the user answers. They may say create / edit / skip (and they may override the priority, size, or scopes).

**5c. On confirmation → create it.** The script files the issue, applies the `AI TechDebt` label
**plus a `scope:<name>` label per derived scope**, adds it to project #2, moves it into the
**"AI technical debt"** column, and sets **Priority** + **Size** — all in one call (priority is the
3rd arg, size the 4th, scopes the 5th as a comma-separated list, **the class slug the 6th** — it
becomes the dedup marker, always pass it):

```bash
SCRIPTS="$(git rev-parse --show-toplevel)/.claude/skills/codebase-audit/scripts"
```

Write the body to a temp file (Cyrillic, backticks, `$` → always `@file`, same rule as `pr-review`):

```bash
cat > /tmp/issue_1.md << 'EOF'
## Почему создана
При аудите фичи `frenzy` найдено 2 компонента без `OnPush`. ...

## Проблематика
...

## Варианты решения
...
EOF

"$SCRIPTS/create_issue.sh" "🔴 Компоненты без OnPush (2 шт.)" @/tmp/issue_1.md P0 S main-catalog,core onpush-missing
```

The 5th arg is the comma-separated scope list (no spaces needed, the script trims), the 6th is the
class slug from Step 3. To set scopes but leave Priority/Size unset, pass them empty:
`... @/tmp/issue_2.md "" "" auth i18n-hardcode`. Each scope becomes a `scope:<name>` label, created
on the repo the first time it's used.

Use a unique suffix per issue (`issue_1.md`, `issue_2.md`, …). Then loop back to 5a for the next draft.

### Step 6 — Cleanup

When the loop is done (all classes either filed or skipped), remove the worktree:

```bash
git worktree remove "$WORKTREE_PATH" --force 2>/dev/null || rm -rf "$WORKTREE_PATH"
```

### Autonomous (routine) mode

The interactive flow above is the **default**. Autonomous mode exists for scheduled routines and
turns on **only when the invoking prompt contains the marker `Autonomous mode`** — never inferred
from context. Without the marker, behave interactively even if no one seems to be answering.

What changes (and only this):

- **Scope must be pinned by the invoking prompt.** No scope → do not scan; finish with a short
  report saying the routine prompt must name a path. Never pick a scope yourself — an unattended
  whole-repo sweep is exactly the flood Step 1 warns about.
- **Step 5b (per-issue confirmation) is skipped.** The dedup of Step 5a is NOT — it runs before
  every creation, exactly as written, including the comment/reopen update paths (those execute
  directly instead of being proposed).
- **Hard cap: 5 new issues per run.** The cap protects the board if dedup misjudges or the scope
  turns out dirtier than expected. Drafts beyond the cap are NOT filed — they go into the run
  report (title + slug + occurrence count), so the next run (or a human) can pick them up.
  Comments on existing issues and reopens don't count against the cap.
- **End every run with a report** in the final message: scope scanned, classes found, what was
  filed (links), what was extended/reopened, what was withheld by the cap, what was skipped as
  unchanged. The report is the only place a human sees what an unattended run did — write it like
  a changelog entry, not a log dump.

Everything else — criteria reading, verification against the skills/MCPs, grouping, slugs,
severity/Priority/Size/Scope derivation, the issue template, cleanup — is identical in both modes.

### Provenance marker — for dedup

`create_issue.sh` auto-appends an **invisible** marker to every issue body — the HTML comment
`<!-- ai-codebase-audit:class=<slug> -->` (or bare `<!-- ai-codebase-audit -->` if no slug was
passed). It renders to nothing on GitHub (no visual noise), but GitHub indexes it, so a re-run
finds already-filed issues via `gh issue list --search "ai-codebase-audit in:body"` (verified) and
matches the exact class by the `class=<slug>` payload in the body. That is the dedup anchor in
Step 5a. The `AI TechDebt` label and the board column are secondary signals. Don't add the marker
to your draft body — the script writes it.

### Issue body template — a detailed report, not a one-liner

Each issue is a standalone report a contributor can act on without you. Always this structure:

```
## Почему создана
[откуда взялась находка: что сканировали, что именно сработало, сколько вхождений]

## Проблематика
[в чём собственно проблема и чем она вредит ИМЕННО в этом проекте — ссылка на
 правило из docs/, ESLint-правило или Angular/Taiga-док. Конкретный механизм, не «плохо»]

## Где
- [ ] path:line — [короткая пометка при необходимости]
- [ ] path:line

## Варианты решения
1. **[Вариант A]** — что делаем. _Плюсы:_ … _Минусы:_ …
2. **[Вариант B]** — что делаем. _Плюсы:_ … _Минусы:_ …
   (если решение по сути одно — один вариант, это нормально)

## Рекомендация
[какой вариант выбрать и **почему** — увязать с конвенциями проекта/трудозатратами/рисками.
 Если вариантов несколько — дать рекомендацию по каждому, какой когда уместен]

[Link to source: docs/ guide, ESLint rule, Angular/Taiga doc]
```

The "Варианты решения" + "Рекомендация" pair is the point of this skill — surface real options and
take a position, don't just dump the defect.

---

## 3. Available Scripts

All scripts: `.claude/skills/codebase-audit/scripts/`. Require `gh` CLI authenticated **with the
`project` scope** (needed to add items to the board and set the column).

| Script            | Purpose                                                                                               | Usage                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `create_issue.sh` | Create one issue → label `AI TechDebt` + `scope:*` → add to project #2 → set column + Priority + Size | `./create_issue.sh <TITLE> <BODY\|@FILE> [P0\|P1\|P2] [XS..XL] [scope,scope] [class-slug]` |

Board wiring inside `create_issue.sh` is **best-effort**: if the token lacks the `project` scope
(typical for cloud-routine tokens), the issue is still created and labeled, and the script warns
instead of failing — the column/Priority/Size are then set manually.

The board wiring (project id, Status + Priority + Size field ids and their option ids, label) is baked
into `create_issue.sh` as verified constants, overridable via env vars if the board ever moves. Scope
labels (`scope:<name>`) are created on demand with a shared color (`SCOPE_LABEL_COLOR`). Run scripts
from the **project root**, never via a path that could be stale.

---

## 4. Reference Files

- **`.claude/skills/_shared/project-review-criteria.md`** — the review criteria (style guides, Angular v21 checklist, RS School + Taiga, plus the Angular/Taiga verification playbooks). Read in full before scanning. Shared with `pr-review`.
- The `pr-review` skill's `reference/taiga-mcp.md` — the full Taiga MCP playbook, if you need depth on verifying a Taiga symbol/package before recommending a fix.
