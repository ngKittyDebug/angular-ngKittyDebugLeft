#!/usr/bin/env bash
set -euo pipefail

# resolve_thread.sh <PR_NUMBER> list
# resolve_thread.sh <PR_NUMBER> unresolve <THREAD_ID>
# resolve_thread.sh <PR_NUMBER> resolve   <THREAD_ID>
#
# Manage PR *review threads* (the resolvable conversation a comment lives in) via GraphQL.
# REST comment IDs are NOT thread IDs — use `list` to get the GraphQL THREAD_ID (PRRT_...).
#
#   list       — print every review thread: threadId, resolved, outdated, path,
#                and each comment's REST id + author + body. Use this to decide which
#                "fixed!" claims are real before re-opening anything.
#   unresolve  — re-open a thread the student resolved but did NOT actually fix
#                (or fixed badly / differently than asked). Reply on it afterwards so
#                the student knows why it came back.
#   resolve    — mark a thread resolved (rarely needed from the mentor side).
#
# Example:
#   ./resolve_thread.sh 105 list
#   ./resolve_thread.sh 105 unresolve PRRT_kwDOSWHec86GgOae

if [ "$#" -lt 2 ]; then
  echo "Usage: resolve_thread.sh <PR_NUMBER> list"
  echo "       resolve_thread.sh <PR_NUMBER> unresolve <THREAD_ID>"
  echo "       resolve_thread.sh <PR_NUMBER> resolve   <THREAD_ID>"
  exit 1
fi

PR_NUMBER="$1"
ACTION="$2"

if ! command -v gh &> /dev/null; then
  echo "Error: gh CLI could not be found. Please install and authenticate."
  exit 1
fi

OWNER_REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
OWNER="${OWNER_REPO%%/*}"
REPO="${OWNER_REPO##*/}"

case "$ACTION" in
  list)
    gh api graphql -f query='
      query($owner:String!,$repo:String!,$pr:Int!){
        repository(owner:$owner,name:$repo){
          pullRequest(number:$pr){
            reviewThreads(first:100){
              nodes{
                id isResolved isOutdated path
                comments(first:30){ nodes{ databaseId author{login} body } }
              }
            }
          }
        }
      }' -f owner="$OWNER" -f repo="$REPO" -F pr="$PR_NUMBER" \
      --jq '.data.repository.pullRequest.reviewThreads.nodes[]
            | {threadId:.id, resolved:.isResolved, outdated:.isOutdated, path:.path,
               comments:[.comments.nodes[]|{id:.databaseId, user:.author.login, body:.body}]}'
    ;;
  unresolve|resolve)
    if [ "$#" -lt 3 ]; then
      echo "Error: ${ACTION} needs a THREAD_ID (run 'list' to get it)."
      exit 1
    fi
    THREAD_ID="$3"
    if [ "$ACTION" = "unresolve" ]; then
      MUTATION='mutation($id:ID!){ unresolveReviewThread(input:{threadId:$id}){ thread{ id isResolved } } }'
    else
      MUTATION='mutation($id:ID!){ resolveReviewThread(input:{threadId:$id}){ thread{ id isResolved } } }'
    fi
    gh api graphql -f query="$MUTATION" -f id="$THREAD_ID" \
      --jq '.data | to_entries[0].value.thread | "\(.id) -> isResolved=\(.isResolved)"'
    ;;
  *)
    echo "Error: unknown action '$ACTION'. Use list | unresolve | resolve."
    exit 1
    ;;
esac
