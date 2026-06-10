# gh CLI bootstrap & fallback (headless / cloud environments)

Both review skills drive GitHub through the `gh` CLI — every script in their `scripts/` folders
wraps it, and the staging → validate → submit pipeline (pr-review) and the provenance-marker
machinery (codebase-audit) live in those scripts. Cloud routine sandboxes may not have `gh`
preinstalled. Before concluding "no gh — I'll improvise", walk this ladder IN ORDER: each rung
preserves more of the skills' guard rails than the one below it.

## Rung 1 — install the static binary (no root, ~30s)

`gh` is a single Go binary. Cloud sandboxes are linux; download the release tarball into /tmp:

```bash
if ! command -v gh >/dev/null 2>&1; then
  case "$(uname -m)" in x86_64) A=amd64 ;; aarch64|arm64) A=arm64 ;; esac
  VER=$(curl -fsSL https://api.github.com/repos/cli/cli/releases/latest \
        | grep -om1 '"tag_name": *"v[^"]*"' | grep -o '[0-9][^"]*')
  curl -fsSL "https://github.com/cli/cli/releases/download/v${VER}/gh_${VER}_linux_${A}.tar.gz" \
    | tar -xz -C /tmp
  export PATH="/tmp/gh_${VER}_linux_${A}/bin:$PATH"
fi
gh --version
```

**Shell state does not persist between your Bash calls.** Persist the environment once and prefix
every later command with it:

```bash
printf 'export PATH="%s"\nexport GH_TOKEN="%s"\n' "$PATH" "${GH_TOKEN:-}" > /tmp/gh-env.sh
# every subsequent command:
source /tmp/gh-env.sh && gh pr list ...
```

## Rung 2 — authenticate

`gh` honors `GH_TOKEN`/`GITHUB_TOKEN`. If neither is set, harvest the same credentials git used
to clone the repo (the sandbox's credential helper has them):

```bash
if ! gh auth status >/dev/null 2>&1 && [ -z "${GH_TOKEN:-}${GITHUB_TOKEN:-}" ]; then
  GH_TOKEN=$(printf 'protocol=https\nhost=github.com\n' | git credential fill 2>/dev/null \
             | sed -n 's/^password=//p')
  export GH_TOKEN
fi
gh api user -q .login   # verify; this login also feeds MENTOR_LOGINS (pr-review)
```

If the login resolves — you have the full toolchain; run the skill exactly as written, scripts
included. Note in the run report that `gh` was bootstrapped.

## Rung 3 — last resort: GitHub MCP tools

Only when rungs 1–2 genuinely fail (no network egress to github.com releases, no harvestable
token). The MCP tools can do the same operations but bypass the scripts, so YOU must uphold the
semantics the scripts normally enforce:

**pr-review:**

- Aim for **one review object per PR** (batch the inline comments into a single review
  submission). Replies to existing threads may have to go as separate calls — acceptable — but
  the review-summary + its inline comments must not be scattered across several review objects.
- Re-check every guard manually before posting: no comment on a `(file, line)` that already has
  one from a `MENTOR_LOGINS` login; the per-run comment cap; only `+`-lines of the diff;
  `COMMENT`/`APPROVE` only, never `REQUEST_CHANGES`.
- The MCP appends a "Generated with Claude Code" footer you cannot remove — tolerated, don't
  fight it; do NOT add your own signature on top.

**codebase-audit:**

- `create_issue.sh` won't run, so its invisible work becomes YOUR work: append the provenance
  marker `<!-- ai-codebase-audit:class=<slug> -->` to every issue body yourself (without it the
  dedup of every future run is broken — this is the single most important line), and apply the
  `AI TechDebt` label plus one `scope:<name>` label per derived scope (create missing labels).
- Board wiring (project column, Priority, Size) is not reachable without `gh project` — skip it
  and say so explicitly in the run report so a human can place the issues on the board.

Whatever rung you end up on, state it in the run report: "gh preinstalled" / "gh bootstrapped" /
"MCP fallback (reason)". The next run's operator needs to know which path actually executed.
