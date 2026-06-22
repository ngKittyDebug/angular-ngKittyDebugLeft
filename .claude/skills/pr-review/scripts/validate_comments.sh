#!/usr/bin/env bash
set -euo pipefail

# validate_comments.sh
# Validates staged inline comments against the actual PR diff.
# Removes invalid comments (wrong file or line not in diff) and reports them.
# Usage: ./validate_comments.sh <PR_NUMBER>

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <PR_NUMBER>"
  exit 1
fi

PR_NUMBER="$1"
COMMENT_FILE="/tmp/angular_pr_${PR_NUMBER}_comments.json"

if ! command -v gh &> /dev/null; then
    echo "Error: gh CLI could not be found. Please install and authenticate."
    exit 1
fi

if [ ! -f "$COMMENT_FILE" ]; then
  echo "No staged comments found for PR #${PR_NUMBER}."
  exit 0
fi

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)

# Build valid file:line pairs from the diff in a single API call (pure jq, no awk)
VALID_LINES_FILE="/tmp/angular_pr_${PR_NUMBER}_valid_lines.txt"

gh api \
  -H "Accept: application/vnd.github+json" \
  "/repos/${REPO}/pulls/${PR_NUMBER}/files" \
  --paginate \
  --jq '
    .[] | select(.status != "removed") |
    .filename as $file | (.patch // "") | split("\n") |
    reduce .[] as $line (
      {cur: 0, out: []};
      if ($line | test("^@@")) then
        .cur = ($line | capture("\\+(?<n>[0-9]+)") | .n | tonumber)
      elif ($line | test("^\\+")) then
        .out += [$file + ":" + (.cur | tostring)] | .cur += 1
      elif ($line | test("^-")) then
        .
      else
        .cur += 1
      end
    ) | .out[]
  ' | sort > "$VALID_LINES_FILE"

# Validate each comment using grep against valid lines
TOTAL=$(jq length "$COMMENT_FILE")
VALID_FILE="/tmp/angular_pr_${PR_NUMBER}_comments_valid.json"
INVALID_FILE="/tmp/angular_pr_${PR_NUMBER}_comments_invalid.json"

echo "[]" > "$VALID_FILE"
echo "[]" > "$INVALID_FILE"

# Check for empty bodies first — an empty body means the shell mangled the variable
EMPTY_BODY_COUNT=$(jq '[.[] | select(.body == "" or .body == null)] | length' "$COMMENT_FILE")
if [ "$EMPTY_BODY_COUNT" -gt 0 ]; then
  echo ""
  echo "ERROR: $EMPTY_BODY_COUNT comment(s) have an empty body (shell likely mangled the variable):"
  jq -r '.[] | select(.body == "" or .body == null) | "  ✗ \(.path):\(.line)"' "$COMMENT_FILE"
  echo ""
  echo "Fix: write the body to a temp file with a heredoc and pass @/tmp/body.txt to post_inline_comment.sh"
  echo "Aborting — fix empty bodies before submitting."
  exit 1
fi

# Extract all path:line from comments and check in batch
jq -r '.[] | .path + ":" + (.line | tostring)' "$COMMENT_FILE" | while IFS= read -r key; do
  if grep -qxF "$key" "$VALID_LINES_FILE"; then
    echo "VALID:$key"
  else
    echo "INVALID:$key"
  fi
done > "/tmp/angular_pr_${PR_NUMBER}_results.txt"

# Build valid/invalid arrays based on results
jq --slurpfile results <(
  paste -d'\t' \
    <(jq -r '.[] | .path + ":" + (.line | tostring)' "$COMMENT_FILE") \
    <(cat "/tmp/angular_pr_${PR_NUMBER}_results.txt") | \
  awk -F'\t' '{print $2}' | \
  jq -R '.' | jq -s '.'
) '[ to_entries[] | select($results[0][.key] | startswith("VALID")) | .value ]' \
  "$COMMENT_FILE" > "$VALID_FILE"

jq --slurpfile results <(
  paste -d'\t' \
    <(jq -r '.[] | .path + ":" + (.line | tostring)' "$COMMENT_FILE") \
    <(cat "/tmp/angular_pr_${PR_NUMBER}_results.txt") | \
  awk -F'\t' '{print $2}' | \
  jq -R '.' | jq -s '.'
) '[ to_entries[] | select($results[0][.key] | startswith("INVALID")) | .value ]' \
  "$COMMENT_FILE" > "$INVALID_FILE"

VALID_COUNT=$(jq length "$VALID_FILE")
INVALID_COUNT=$(jq length "$INVALID_FILE")

echo "Validation complete: ${VALID_COUNT} valid, ${INVALID_COUNT} invalid."

if [ "$INVALID_COUNT" -gt 0 ]; then
  echo ""
  echo "INVALID comments (line not in diff):"
  jq -r '.[] | "  ✗ \(.path):\(.line)"' "$INVALID_FILE"
  echo ""
  echo "These comments will be removed from the staged file."
fi

# Replace staged file with only valid comments
mv "$VALID_FILE" "$COMMENT_FILE"
rm -f "$INVALID_FILE" "$VALID_LINES_FILE" "/tmp/angular_pr_${PR_NUMBER}_results.txt"

echo "Staged comments updated: ${VALID_COUNT} comments ready to submit."
