#!/usr/bin/env bash
set -euo pipefail

# submit_pr_review.sh
# Submits a batched PR review using comments previously staged by post_inline_comment.sh
# Usage: ./submit_pr_review.sh <PR_NUMBER> <EVENT_TYPE> [BODY]
# EVENT_TYPE must be COMMENT, APPROVE, or REQUEST_CHANGES

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <PR_NUMBER> <EVENT_TYPE> [BODY]"
  echo "EVENT_TYPE must be COMMENT, APPROVE, or REQUEST_CHANGES"
  exit 1
fi

PR_NUMBER="$1"
EVENT="$2"
BODY_ARG="${3:-}"
COMMENT_FILE="/tmp/angular_pr_${PR_NUMBER}_comments.json"

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

if ! command -v gh &> /dev/null; then
    echo "Error: gh CLI could not be found. Please install and authenticate."
    exit 1
fi

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)

# Get the latest commit SHA of the PR head (required by GitHub API)
COMMIT_SHA=$(gh pr view "$PR_NUMBER" --json headRefOid -q .headRefOid)

# Check if there are staged comments
COMMENTS="[]"
if [ -f "$COMMENT_FILE" ]; then
  COMMENTS=$(cat "$COMMENT_FILE")
fi

echo "Submitting review for PR #${PR_NUMBER} (commit: ${COMMIT_SHA:0:7})..."

# Create the payload with commit_id
PAYLOAD_FILE="/tmp/angular_pr_${PR_NUMBER}_payload.json"
jq -n --arg event "$EVENT" --arg body "$BODY" --argjson comments "$COMMENTS" --arg commit "$COMMIT_SHA" \
  '{event: $event, body: $body, comments: $comments, commit_id: $commit}' > "$PAYLOAD_FILE"

# Post the review using the GitHub Pull Request Reviews API
if gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "/repos/${REPO}/pulls/${PR_NUMBER}/reviews" \
  --input "$PAYLOAD_FILE"; then
  echo "Review submitted successfully!"
  rm -f "$COMMENT_FILE"
  rm -f "$PAYLOAD_FILE"
else
  EXIT_CODE=$?
  echo "ERROR: Review submission failed (exit code: $EXIT_CODE)."
  echo "Staged comments preserved at: $COMMENT_FILE"
  echo "Payload preserved at: $PAYLOAD_FILE"
  echo ""
  echo "To retry: $0 $PR_NUMBER $EVENT"
  rm -f "$PAYLOAD_FILE"
  exit $EXIT_CODE
fi
