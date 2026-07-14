# Issue tracker: Local Markdown

Issues and PRDs for this repo live as markdown files in `.scratch/` (gitignored — drafts stay local, like `.planning/`).

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The PRD is `.scratch/<feature-slug>/PRD.md`
- Implementation issues are `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Note on GitHub

This repo also has GitHub Issues + a Projects board (used by the `pr-review` / `codebase-audit` routines). Those flows are separate — the engineering skills covered by this file (`to-spec`, `to-tickets`, `triage`) work against `.scratch/` unless the user explicitly points them at GitHub.
