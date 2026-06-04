#!/usr/bin/env bash
set -euo pipefail

conflict_files=(
  "functions/api/_utils.js"
  "functions/api/admin/grants.js"
  "scripts/check-auth-admin.mjs"
)

branch="$(git branch --show-current)"
if [[ -z "$branch" || "$branch" == "main" || "$branch" == "master" ]]; then
  echo "ERROR: Check out the admin-console pull-request branch before running this script." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: Commit or stash your existing changes before resolving the merge." >&2
  git status --short
  exit 1
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "ERROR: The repository does not have an origin remote." >&2
  exit 1
fi

echo "Fetching the latest main branch..."
git fetch origin main

echo "Merging origin/main into $branch..."
if git merge --no-edit origin/main; then
  echo "The merge completed without conflicts."
else
  unresolved="$(git diff --name-only --diff-filter=U)"
  if [[ -z "$unresolved" ]]; then
    echo "ERROR: Merge failed without reporting resolvable file conflicts." >&2
    exit 1
  fi

  while IFS= read -r file; do
    allowed=false
    for expected in "${conflict_files[@]}"; do
      if [[ "$file" == "$expected" ]]; then
        allowed=true
        break
      fi
    done

    if [[ "$allowed" != true ]]; then
      echo "ERROR: Unexpected conflict in $file. Resolve it manually before continuing." >&2
      exit 1
    fi
  done <<< "$unresolved"

  echo "Keeping the hardened pull-request versions of the expected conflict files..."
  for file in "${conflict_files[@]}"; do
    if git diff --name-only --diff-filter=U -- "$file" | grep -q .; then
      git checkout --ours -- "$file"
      git add "$file"
    fi
  done
fi

if [[ -n "$(git diff --name-only --diff-filter=U)" ]]; then
  echo "ERROR: Unresolved conflicts remain:" >&2
  git diff --name-only --diff-filter=U >&2
  exit 1
fi

if rg -n '^(<<<<<<<|=======|>>>>>>>)' "${conflict_files[@]}"; then
  echo "ERROR: Conflict markers remain in an admin conflict file." >&2
  exit 1
fi

echo "Running verification checks..."
node scripts/check-auth-admin.mjs
node scripts/check-inquiries.mjs
node scripts/check-otp.mjs
node --check functions/api/_utils.js
node --check functions/api/admin/grants.js
node --check scripts/check-auth-admin.mjs
git diff --check

if git rev-parse -q --verify MERGE_HEAD >/dev/null; then
  git commit -m "Merge main and resolve admin API conflicts"
fi

echo "Pushing resolved branch $branch..."
git push origin "$branch"

echo "Merge conflicts resolved and pushed successfully."
