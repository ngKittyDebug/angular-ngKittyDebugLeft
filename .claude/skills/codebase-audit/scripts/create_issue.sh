#!/usr/bin/env bash
set -euo pipefail

# create_issue.sh
# Creates one GitHub issue, labels it, adds it to the org project board, and moves
# it into the "AI technical debt" column. One issue per invocation.
#
# Usage: ./create_issue.sh <TITLE> <BODY|@FILE> [PRIORITY] [SIZE] [SCOPES] [CLASS_SLUG]
#
# BODY|@FILE: issue body, or @/path/to/file to read body from a file.
#   Use the @file form for bodies with Cyrillic, single quotes, backticks, or `$`
#   (everything an audit report contains). Write it with a quoted heredoc:
#     cat > /tmp/issue.md << 'EOF'
#     ## Почему создана
#     ...
#     EOF
#     ./create_issue.sh "🔴 Заголовок" @/tmp/issue.md P0 S auth
#
# PRIORITY: optional — P0 | P1 | P2. Sets the board's Priority field. Omit to leave it unset.
#   Map from finding severity (the skill decides): 🔴/🤮 → P0, 👺/💩 → P1, 🟡/🫥 → P2.
# SIZE: optional — XS | S | M | L | XL. Sets the board's Size field — estimated effort to FIX.
#   Omit to leave it unset.
# SCOPES: optional — comma-separated scope name(s) of the feature/layer where the finding lives,
#   e.g. `auth` or `about,core`. Each becomes a `scope:<name>` label (created idempotently) so the
#   board can be filtered/grouped by area. Derive scope from the source path of the occurrences
#   (the skill documents the path→scope mapping). An issue spanning N areas gets N scope labels.
#   To set scopes but leave Priority/Size unset, pass them empty: `... "" "" auth,core`.
# CLASS_SLUG: optional — deterministic kebab-case id of the problem class (e.g. `onpush-missing`).
#   Embedded into the provenance marker as `<!-- ai-codebase-audit:class=<slug> -->` so a re-run
#   can match this exact class mechanically (not just by fuzzy title). Omit → bare marker.
#
# Board wiring (verified against ngKittyDebug/projects/2 — override via env if it moves):
#   PROJECT_OWNER, PROJECT_NUMBER, PROJECT_ID, STATUS_FIELD_ID, STATUS_OPTION_ID,
#   PRIORITY_FIELD_ID, SIZE_FIELD_ID, ISSUE_LABEL, SCOPE_LABEL_COLOR

PROJECT_OWNER="${PROJECT_OWNER:-ngKittyDebug}"
PROJECT_NUMBER="${PROJECT_NUMBER:-2}"
PROJECT_ID="${PROJECT_ID:-PVT_kwDOD5XT9c4BW6Ab}"
STATUS_FIELD_ID="${STATUS_FIELD_ID:-PVTSSF_lADOD5XT9c4BW6AbzhSKn2E}"
STATUS_OPTION_ID="${STATUS_OPTION_ID:-c1e91e05}" # "AI technical debt"
PRIORITY_FIELD_ID="${PRIORITY_FIELD_ID:-PVTSSF_lADOD5XT9c4BW6AbzhSKoGA}"
SIZE_FIELD_ID="${SIZE_FIELD_ID:-PVTSSF_lADOD5XT9c4BW6AbzhSKoGE}"
ISSUE_LABEL="${ISSUE_LABEL:-AI TechDebt}"
SCOPE_LABEL_COLOR="${SCOPE_LABEL_COLOR:-1D76DB}" # one shared color for all scope:* labels

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <TITLE> <BODY|@FILE> [PRIORITY: P0|P1|P2] [SIZE: XS|S|M|L|XL] [SCOPES: csv] [CLASS_SLUG]"
  exit 1
fi

TITLE="$1"
BODY_ARG="$2"
PRIORITY="${3:-}"
SIZE="${4:-}"
SCOPES="${5:-}"
CLASS_SLUG="${6:-}"

if [ -n "$CLASS_SLUG" ] && ! printf '%s' "$CLASS_SLUG" | grep -Eq '^[a-z0-9]+(-[a-z0-9]+)*$'; then
  echo "Warning: CLASS_SLUG '$CLASS_SLUG' is not kebab-case — using the bare marker instead."
  CLASS_SLUG=""
fi

# Resolve PRIORITY label → single-select option id (verified board ids)
PRIORITY_OPTION_ID=""
case "$PRIORITY" in
  P0) PRIORITY_OPTION_ID="79628723" ;;
  P1) PRIORITY_OPTION_ID="0a877460" ;;
  P2) PRIORITY_OPTION_ID="da944a9c" ;;
  "") : ;; # not provided — leave Priority unset
  *) echo "Warning: unknown PRIORITY '$PRIORITY' (expected P0|P1|P2) — leaving it unset." ;;
esac

# Resolve SIZE label → single-select option id (verified board ids)
SIZE_OPTION_ID=""
case "$SIZE" in
  XS) SIZE_OPTION_ID="6c6483d2" ;;
  S)  SIZE_OPTION_ID="f784b110" ;;
  M)  SIZE_OPTION_ID="7515a9f1" ;;
  L)  SIZE_OPTION_ID="817d0097" ;;
  XL) SIZE_OPTION_ID="db339eb2" ;;
  "") : ;; # not provided — leave Size unset
  *) echo "Warning: unknown SIZE '$SIZE' (expected XS|S|M|L|XL) — leaving it unset." ;;
esac

if ! command -v gh &> /dev/null; then
  echo "Error: gh CLI could not be found. Please install and authenticate (needs 'project' scope)."
  exit 1
fi

if [ -z "$TITLE" ]; then
  echo "Error: issue title is empty. Refusing to create a titleless issue."
  exit 1
fi

# Resolve body: @file → read from file, otherwise materialize literal into a temp file
if [[ "$BODY_ARG" == @* ]]; then
  BODY_FILE="${BODY_ARG:1}"
  if [ ! -f "$BODY_FILE" ]; then
    echo "Error: body file not found: $BODY_FILE"
    exit 1
  fi
else
  BODY_FILE="$(mktemp /tmp/audit_issue_body.XXXXXX)"
  printf '%s' "$BODY_ARG" > "$BODY_FILE"
fi

if [ ! -s "$BODY_FILE" ]; then
  echo "Error: issue body is empty. Refusing to create an empty issue."
  exit 1
fi

# Append a minimal, invisible provenance marker so a re-run can find issues this skill
# already filed (dedup anchor, greppable via `gh issue list --search "ai-codebase-audit in:body"`).
# With CLASS_SLUG the marker also carries the problem-class id (`class=<slug>`), letting a re-run
# match the exact class mechanically. HTML comment — renders to nothing on GitHub. Idempotent on
# re-used body files.
FINAL_BODY_FILE="$(mktemp /tmp/audit_issue_final.XXXXXX)"
cat "$BODY_FILE" > "$FINAL_BODY_FILE"
if ! grep -q "ai-codebase-audit" "$FINAL_BODY_FILE"; then
  if [ -n "$CLASS_SLUG" ]; then
    printf '\n\n<!-- ai-codebase-audit:class=%s -->\n' "$CLASS_SLUG" >> "$FINAL_BODY_FILE"
  else
    printf '\n\n<!-- ai-codebase-audit -->\n' >> "$FINAL_BODY_FILE"
  fi
fi

# Ensure the audit label exists (idempotent — no-op if already there)
gh label create "$ISSUE_LABEL" --color "5319E7" \
  --description "Technical debt surfaced by the AI codebase audit" 2>/dev/null || true

# Build the label set: the audit label, plus one scope:<name> label per supplied scope.
# Each scope label is created idempotently so the board can filter/group by area.
LABEL_ARGS=(--label "$ISSUE_LABEL")
if [ -n "$SCOPES" ]; then
  IFS=',' read -ra SCOPE_LIST <<< "$SCOPES"
  for raw in "${SCOPE_LIST[@]}"; do
    # trim surrounding whitespace
    scope="$(printf '%s' "$raw" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
    [ -z "$scope" ] && continue
    scope_label="scope:${scope}"
    gh label create "$scope_label" --color "$SCOPE_LABEL_COLOR" \
      --description "Audit finding located in the ${scope} feature/layer" 2>/dev/null || true
    LABEL_ARGS+=(--label "$scope_label")
    echo "  scope label: ${scope_label}"
  done
fi

echo "Creating issue: ${TITLE}"
ISSUE_URL="$(gh issue create --title "$TITLE" --body-file "$FINAL_BODY_FILE" "${LABEL_ARGS[@]}")"

if [ -z "$ISSUE_URL" ]; then
  echo "Error: issue creation returned no URL — aborting before board wiring."
  exit 1
fi
echo "  created: $ISSUE_URL"

# Board wiring is BEST-EFFORT from here on: the issue already exists, and the token may lack
# the `project` scope (typical for cloud-routine tokens). A board failure must not abort the
# script with a non-zero exit after the issue was created — warn and leave manual instructions.
echo "Adding to project ${PROJECT_OWNER}/projects/${PROJECT_NUMBER}..."
ITEM_ID="$(gh project item-add "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" --url "$ISSUE_URL" \
  --format json --jq '.id' 2>/dev/null)" || ITEM_ID=""

if [ -z "$ITEM_ID" ]; then
  echo "Warning: could not add the issue to the project board (missing 'project' scope?)."
  echo "  Issue is created and labeled. Move it manually to 'AI technical debt': $ISSUE_URL"
  exit 0
fi

# Move it into the "AI technical debt" column (Status single-select)
echo "Setting Status → AI technical debt..."
gh project item-edit \
  --id "$ITEM_ID" \
  --project-id "$PROJECT_ID" \
  --field-id "$STATUS_FIELD_ID" \
  --single-select-option-id "$STATUS_OPTION_ID" \
  || echo "Warning: could not set Status — set the column manually: $ISSUE_URL"

# Set Priority if one was supplied
if [ -n "$PRIORITY_OPTION_ID" ]; then
  echo "Setting Priority → ${PRIORITY}..."
  gh project item-edit \
    --id "$ITEM_ID" \
    --project-id "$PROJECT_ID" \
    --field-id "$PRIORITY_FIELD_ID" \
    --single-select-option-id "$PRIORITY_OPTION_ID" \
    || echo "Warning: could not set Priority — set it manually: $ISSUE_URL"
fi

# Set Size if one was supplied
if [ -n "$SIZE_OPTION_ID" ]; then
  echo "Setting Size → ${SIZE}..."
  gh project item-edit \
    --id "$ITEM_ID" \
    --project-id "$PROJECT_ID" \
    --field-id "$SIZE_FIELD_ID" \
    --single-select-option-id "$SIZE_OPTION_ID" \
    || echo "Warning: could not set Size — set it manually: $ISSUE_URL"
fi

echo "  done: $ISSUE_URL → column 'AI technical debt'${PRIORITY:+, priority ${PRIORITY}}${SIZE:+, size ${SIZE}}"
