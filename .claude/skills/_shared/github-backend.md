# GitHub backend: gh CLI locally, GitHub MCP in cloud routines

Both review skills talk to GitHub through one of two **first-class backends**. Neither is an
improvisation — each has its own playbook, and the guard semantics (dedup, caps, markers) are
identical; only the transport differs.

- **gh CLI** — the canonical backend for local / interactive runs. All scripts in the skills'
  `scripts/` folders wrap it. If `gh` works, use the skill exactly as written.
- **GitHub MCP tools** — the canonical backend for cloud routine sandboxes. Verified empirically:
  the sandbox firewalls `api.github.com` (403) and routes git through a local proxy, so `gh` can
  never authenticate there — but git itself and the GitHub MCP tools work fine.

## Backend detection — do this first, don't waste the run

```bash
# 1. Working gh? Use it (local machines).
command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1 && echo "BACKEND: gh"

# 2. No gh — is the REST API even reachable? (cloud sandboxes: usually NOT, 403 via proxy)
curl -sf -m 5 -o /dev/null https://api.github.com/zen && echo "API reachable" || echo "BACKEND: MCP"
```

- API **unreachable** → go straight to the **MCP backend** below. Do NOT install gh — it cannot
  authenticate through the proxy; that path was tried and dead-ends.
- API reachable but gh missing → install the static binary and harvest a token (appendix at the
  bottom), then use the gh backend.

State the chosen backend in the run report.

## MCP backend playbook

Discover the tools with ToolSearch (e.g. `+github pull request review`, `+github issue`) and
**verify each mapping with one read-only call before any write**. Tool names below follow the
official GitHub MCP server; treat them as the expected shape, not gospel — map by capability.

Plain **git always works** (the proxy handles it): worktrees, fetches, local diffs need no backend.
For a PR diff without `gh pr diff`: `git fetch origin pull/<N>/head && git diff origin/<base>...FETCH_HEAD`.

### pr-review operations

| Operation (script it replaces)                                                                    | MCP capability                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity → `MENTOR_LOGINS`                                                                        | `get_me` → add `JsPowWow` to the set                                                                                                                                                                                                                                                                                                                    |
| List open PRs                                                                                     | `list_pull_requests` (state=open), drop `draft: true` yourself                                                                                                                                                                                                                                                                                          |
| Reviews / `LAST_REVIEW_SHA`                                                                       | `get_pull_request_reviews` → filter by `MENTOR_LOGINS` → last `commit_id`                                                                                                                                                                                                                                                                               |
| Existing inline comments (`get_pr_comments.sh`)                                                   | `get_pull_request_comments` — feeds Mode C AND the (file,line) guard                                                                                                                                                                                                                                                                                    |
| Changed files / commentability                                                                    | `get_pull_request_files` (a file with no `patch` → review-body only)                                                                                                                                                                                                                                                                                    |
| Stage→validate→submit (`post_inline_comment.sh` + `validate_comments.sh` + `submit_pr_review.sh`) | Pending-review flow: `create_pending_pull_request_review` → `add_comment_to_pending_pull_request_review` per comment → `submit_pending_pull_request_review` (COMMENT/APPROVE). No pending flow available → `create_and_submit_pull_request_review` with the full comments array in ONE call. Never post inline comments one-by-one as separate reviews. |
| Reply in a thread (`reply_pr_comment.sh`)                                                         | A reply-capable tool if present; if replying forces a separate review object, tolerate it — never "solve" this by re-stating the point as a fresh comment                                                                                                                                                                                               |
| Resolve/unresolve threads (`resolve_thread.sh`)                                                   | Not available via standard MCP → **skip**; the in-thread «можешь резолвить» hand-off already covers it. Note the skip in the run report.                                                                                                                                                                                                                |

The validation step does not disappear with the script: before adding each comment, check the
path is in the commentable file set and the line is a `+` line of the current diff.

The MCP appends a "Generated with Claude Code" footer to comments — tolerated; do not add your
own signature on top.

### codebase-audit operations

| Operation (script it replaces)                | MCP capability                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dedup queries (Step 5a)                       | `search_issues` with `ai-codebase-audit in:body` (fetch bodies, match `class=<slug>` exactly); `list_issues` by label as the secondary net                                                                                                                                                                                                                         |
| Create issue (`create_issue.sh`)              | `create_issue` — and the script's invisible work becomes YOURS: append `<!-- ai-codebase-audit:class=<slug> -->` to the body (without it, every future run's dedup is broken — the single most important line), pass labels `AI TechDebt` + one `scope:<name>` per derived scope (create missing labels if a tool exists; otherwise attach what exists and report) |
| Extend an open issue                          | `add_issue_comment` with the new `- [ ] path:line` items                                                                                                                                                                                                                                                                                                           |
| Reopen a closed issue                         | `update_issue` (state=open) + `add_issue_comment` explaining why it's back                                                                                                                                                                                                                                                                                         |
| Board wiring (project column, Priority, Size) | Unreachable without `gh project` → **skip** and list the created issues in the run report so a human can place them on the board                                                                                                                                                                                                                                   |

## Appendix — gh bootstrap (only when the API is reachable)

```bash
if ! command -v gh >/dev/null 2>&1; then
  case "$(uname -m)" in x86_64) A=amd64 ;; aarch64|arm64) A=arm64 ;; esac
  VER=$(curl -fsSL https://api.github.com/repos/cli/cli/releases/latest \
        | grep -om1 '"tag_name": *"v[^"]*"' | grep -o '[0-9][^"]*')
  curl -fsSL "https://github.com/cli/cli/releases/download/v${VER}/gh_${VER}_linux_${A}.tar.gz" \
    | tar -xz -C /tmp
  export PATH="/tmp/gh_${VER}_linux_${A}/bin:$PATH"
fi
# token: reuse the credentials git cloned with
if ! gh auth status >/dev/null 2>&1 && [ -z "${GH_TOKEN:-}${GITHUB_TOKEN:-}" ]; then
  GH_TOKEN=$(printf 'protocol=https\nhost=github.com\n' | git credential fill 2>/dev/null \
             | sed -n 's/^password=//p')
  export GH_TOKEN
fi
gh api user -q .login || echo "no usable auth → MCP backend"
# Shell state does not persist between Bash calls — persist and source:
printf 'export PATH="%s"\nexport GH_TOKEN="%s"\n' "$PATH" "${GH_TOKEN:-}" > /tmp/gh-env.sh
```
