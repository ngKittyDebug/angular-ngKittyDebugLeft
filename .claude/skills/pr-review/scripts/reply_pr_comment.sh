#!/usr/bin/env bash
set -euo pipefail

# reply_pr_comment.sh <PR_NUMBER> <COMMENT_ID> <BODY|@FILE>
# Replies to an existing PR comment thread.
# COMMENT_ID must be the ID of the top-level comment in the thread.
#
# BODY|@FILE: reply text, or @/path/to/file to read body from a file.
#   Use the @file form for bodies containing single quotes, Cyrillic, or backticks.
#   Write the file with a heredoc:
#     cat > /tmp/reply.txt << 'EOF'
#     reply text here
#     EOF
#     ./reply_pr_comment.sh 89 3289667376 @/tmp/reply.txt

if [ "$#" -lt 3 ]; then
  echo "Usage: reply_pr_comment.sh <PR_NUMBER> <COMMENT_ID> <BODY|@FILE>"
  exit 1
fi

PR_NUMBER="$1"
COMMENT_ID="$2"
BODY_ARG="$3"

if ! command -v gh &> /dev/null; then
    echo "Error: gh CLI could not be found. Please install and authenticate."
    exit 1
fi

# Resolve body: @file → read from file, otherwise use as literal string
if [[ "$BODY_ARG" == @* ]]; then
  BODY_FILE="${BODY_ARG:1}"
  if [ ! -f "$BODY_FILE" ]; then
    echo "Error: body file not found: $BODY_FILE"
    exit 1
  fi
  BODY="$(cat "$BODY_FILE")"
else
  BODY="$BODY_ARG"
fi

if [ -z "$BODY" ]; then
  echo "Error: reply body is empty. Refusing to post an empty reply."
  exit 1
fi

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)

# Build JSON payload via jq to avoid shell escaping issues
PAYLOAD_FILE="$(mktemp /tmp/reply_payload_XXXXXX.json)"
jq -n --arg body "$BODY" '{"body": $body}' > "$PAYLOAD_FILE"

gh api \
  --silent \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  "/repos/${REPO}/pulls/${PR_NUMBER}/comments/${COMMENT_ID}/replies" \
  --input "$PAYLOAD_FILE"

rm -f "$PAYLOAD_FILE"
