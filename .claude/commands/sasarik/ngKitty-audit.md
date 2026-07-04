---
name: sasarik:ngKitty-audit
description: Audits the existing angular-ngKittyDebugLeft codebase against the project's review criteria and files grouped findings as GitHub issues on the org board (label "AI TechDebt", column "AI technical debt"). Not a PR review — scans whole files in place.
argument-hint: <path_or_feature_scope (optional)>
allowed-tools:
  - Read
  - Write
  - Bash
  - Agent
---

Read and follow ALL instructions from the skill file at:
`.claude/skills/codebase-audit/SKILL.md`

Then perform the full codebase-audit workflow, scoped to: $ARGUMENTS

If $ARGUMENTS is empty or not provided, ask the user which scope to audit (a feature folder
under `src/app/features/`, `partykit-server/src/`, `shared-game/`, or the whole repo) before
proceeding — never start an unbounded scan without confirming scope.

Remember the safety rules from the skill: draft issues grouped by problem class, check the board
for duplicates before each one, and present every new issue to the user for explicit confirmation
before creating it.
