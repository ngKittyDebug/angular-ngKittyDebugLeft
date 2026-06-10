#!/usr/bin/env bash
set -euo pipefail

# post_inline_comment.sh
# Adds an inline comment to a specific line in a PR via the GitHub API.
# Usage: ./post_inline_comment.sh <PR_NUMBER> <FILE_PATH> <LINE_NUMBER> <BODY|@FILE> [SIDE]
#
# BODY|@FILE: comment text, or @/path/to/file to read body from a file.
#   Use the @file form for bodies containing single quotes, Cyrillic, backticks,
#   or any text that shell would mangle when expanded inside "...".
#   Write the file with a heredoc:
#     cat > /tmp/body.txt << 'EOF'
#     body text here — no escaping needed
#     EOF
#     ./post_inline_comment.sh 89 src/foo.ts 42 @/tmp/body.txt
#
# SIDE: RIGHT (default) or LEFT (for deleted lines)

if [ "$#" -lt 4 ]; then
  echo "Usage: $0 <PR_NUMBER> <FILE_PATH> <LINE_NUMBER> <BODY|@FILE> [SIDE]"
  exit 1
fi

PR_NUMBER="$1"
FILE_PATH="$2"
LINE="$3"
BODY_ARG="$4"
SIDE="${5:-RIGHT}"

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
  echo "Error: comment body is empty. Refusing to stage an empty comment."
  exit 1
fi

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)

echo "Staging inline comment for PR #${PR_NUMBER} on ${FILE_PATH}:${LINE} (${SIDE})..."

COMMENT_FILE="/tmp/angular_pr_${PR_NUMBER}_comments.json"
if [ ! -f "$COMMENT_FILE" ]; then
  echo "[]" > "$COMMENT_FILE"
fi

# Append the new comment to the JSON array (with side)
jq --arg path "${FILE_PATH}" --argjson line "${LINE}" --arg body "${BODY}" --arg side "${SIDE}" \
  '. += [{"path": $path, "line": $line, "body": $body, "side": $side}]' "$COMMENT_FILE" > "${COMMENT_FILE}.tmp" && mv "${COMMENT_FILE}.tmp" "$COMMENT_FILE"

echo "Comment successfully staged locally. Remember to call submit_pr_review.sh when finished to publish all comments as a single review!"
