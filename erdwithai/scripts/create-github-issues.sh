#!/bin/bash
# Bulk create GitHub Issues from Business Rules System tickets
# Usage: ./scripts/create-github-issues.sh

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
PROJECT="businessappwithai/app-withai"

echo "Creating 39 GitHub Issues for Business Rules System implementation..."
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
  echo "❌ GitHub CLI (gh) not installed."
  echo "Install it from: https://cli.github.com/"
  echo "Then run: gh auth login"
  exit 1
fi

# Check authentication
if ! gh auth status &> /dev/null; then
  echo "❌ Not authenticated with GitHub CLI."
  echo "Run: gh auth login"
  exit 1
fi

# Read CSV and create issues
tail -n +2 "$REPO_ROOT/docs/BUSINESS_RULES_SYSTEM_TICKETS.csv" | while IFS=',' read -r ticket_id title priority file estimate week status dependencies; do
  # Skip empty lines
  [ -z "$ticket_id" ] && continue

  # Clean up fields (remove quotes, trim whitespace)
  title=$(echo "$title" | tr -d '"')
  priority=$(echo "$priority" | tr -d '"')
  file=$(echo "$file" | tr -d '"')
  estimate=$(echo "$estimate" | tr -d '"')
  week=$(echo "$week" | tr -d '"')
  dependencies=$(echo "$dependencies" | tr -d '"')

  # Build issue body
  body="**Ticket ID:** $ticket_id
**Priority:** $priority
**File:** \`$file\`
**Estimate:** $estimate hours
**Week:** $week
**Status:** $status
**Dependencies:** $dependencies

---

### Description

See full ticket details in: [BUSINESS_RULES_SYSTEM_TICKETS.md](../docs/BUSINESS_RULES_SYSTEM_TICKETS.md)

### Acceptance Criteria

See CEO Plan: [2025-04-02-business-rules-system.md](../.gstack/projects/businessappwithai-app_with_ai/ceo-plans/2025-04-02-business-rules-system.md)
"

  # Create labels
  echo "Creating issue: $title"

  gh issue create \
    --repo "$PROJECT" \
    --title "[$ticket_id] $title" \
    --body "$body" \
    --label "priority:$priority" \
    --label "week:$week" \
    --label "component:rules-engine"

  echo "✅ Created issue for $ticket_id"
  echo ""
done

echo "✅ All 39 GitHub Issues created!"
echo "View project board: https://github.com/$PROJECT/issues"
