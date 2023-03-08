#!/usr/bin/env bash

OWNER="tvandinther"
REPO="stocker"

OPEN_ISSUES=$(gh api graphql --paginate -F owner="$OWNER" -F name="$REPO" -f query='
query ($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    issues(states: OPEN, first: 100) {
      nodes {
        id
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
}' | jq -r '.data.repository.issues.nodes[].id')

for ID in $OPEN_ISSUES
do
  echo "Deleting issue $ID"
  gh api graphql -F issueId="$ID" -f query='
  mutation ($issueId: ID!) {
    deleteIssue(input: {issueId: $issueId}) {
      clientMutationId
    }
  }'
done
