# Skills & agent docs — maintenance

Read this before running the `skills` CLI or touching `.agents/skills/`, `.claude/skills/`, `AGENTS.md`, `CLAUDE.md` or `GEMINI.md`. Day-to-day you don't need any of it — your agent already lists the installed skills with their descriptions.

## Layout

| Path               | What                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `.agents/skills/`  | Source of truth. Read directly by Codex/Copilot/Gemini-class agents.                                                |
| `.claude/skills/`  | Mirror of the above (**real copies**, see below) — the only place Claude Code looks. Plus the hand-authored skills. |
| `skills-lock.json` | Locks every installed skill: source repo + path + content hash.                                                     |

All three are tracked, so fresh clones and cloud routines get skills out of the box. Changes land through the normal commit → PR flow.

**Hand-authored skills** — `pr-review`, `codebase-audit`, `codebase-audit-workspace`, `_shared` — live directly in `.claude/skills/`, are not in the lockfile, and no CLI command touches them.

## Upgrading

```bash
pnpm skills:update      # skills update -p  +  pnpm skills:sync
```

Never run the bare CLI: `skills update -p` refreshes `.agents/skills/` and the lockfile but leaves the `.claude/skills/` mirror stale (or re-symlinked). `pnpm skills:sync` (`scripts/sync-agent-skills.mjs`) re-mirrors every locked skill as a real directory; it is idempotent and ignores the hand-authored ones.

## Why copies, not symlinks

The `skills` CLI symlinks `.claude/skills/<name>` → `../../.agents/skills/<name>` by default, and Git for Windows probes NTFS and sets `core.symlinks=false`. A symlink is then checked out as a **plain text file containing the target path**. Claude Code reads only `.claude/skills/`, so a teammate on Windows finds files where skill folders should be and loads **no skills at all — silently, with no error**.

Same reasoning for the agent docs: `CLAUDE.md` and `GEMINI.md` hold an import directive (`@AGENTS.md` / `@./AGENTS.md`) rather than being symlinks to `AGENTS.md`. Import directives are plain text and survive any checkout.

The duplication is the price. It is markdown, not binaries, and it beats a silent per-developer failure.

## The installed set is curated — don't restore what was cut

`npx skills add mattpocock/skills` installs **all 39** upstream skills. We keep 22 (upstream `engineering` + `productivity`) and cut 17:

- upstream `deprecated/` — `qa`, `design-an-interface`, `request-refactor-plan`, `ubiquitous-language`
- upstream `in-progress/` — `claude-handoff`, `loop-me`, `setup-ts-deep-modules`, `wizard`, `writing-beats`, `writing-fragments`, `writing-shape`
- Matt's personal ones — `obsidian-vault`, `edit-article`
- course-authoring ones — `scaffold-exercises`, `migrate-to-shoehorn`
- setup-only — `setup-pre-commit`, `git-guardrails-claude-code`

Re-running `add` brings all 17 back. Prune them again **and delete them from `skills-lock.json`**, or the next `update -p` reinstates them.

`setup-pre-commit` is the sharp one: it is model-invocable, and this repo already has Husky + lint-staged + typecheck + tests — it can re-scaffold a working config out from under you.

Plus the three Angular skills (`angular-developer` from `angular/skills`, `angular-best-practices-signalstore` / `-transloco` from `alfredoperez/angular-best-practices`). Don't re-add granular per-topic Angular skills (`angular-component`, `angular-signals`, …) — that content lives inside `angular-developer/references/`.

## CLI traps

- **`skills <command> --help` RUNS the command.** The CLI does not treat `--help` on a subcommand as a help request — `skills update --help` performs an update, `skills experimental_install --help` performs an install. Only the bare `skills --help` prints usage. Don't probe subcommands on a dirty tree.
- **Personal skills shadow project skills.** Same-named skills under `~/.claude/skills/` (a separate global lockfile, `~/.agents/.skill-lock.json`) win over the project copies. Updating only the project set leaves your stale global copy in charge — update both.
