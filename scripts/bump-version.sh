#!/usr/bin/env bash
# Bumps the plugin version everywhere it's duplicated, regenerates the committed plugin
# artifacts so they match, and opens a PR. Run from a clean main:
#   ./scripts/bump-version.sh              # prompts for patch/minor/major/custom
#   ./scripts/bump-version.sh <patch|minor|major|X.Y.Z>   # non-interactive
#
# Does NOT tag — that's scripts/tag-release.sh, run separately once you're ready.
set -euo pipefail
cd "$(dirname "$0")/.."

BUMP="${1:-}"
if [[ -z "$BUMP" ]]; then
  echo "Bump which part?"
  select choice in patch minor major "custom version"; do
    case "$choice" in
      patch|minor|major) BUMP="$choice"; break ;;
      "custom version") read -rp "Enter version (X.Y.Z): " BUMP; break ;;
      *) echo "Pick 1-4." ;;
    esac
  done
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "error: working tree not clean" >&2
  exit 1
fi
if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "error: not on main" >&2
  exit 1
fi
git pull --ff-only origin main

CURRENT=$(jq -r .version package.json)

if [[ "$BUMP" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  NEW="$BUMP"
else
  IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
  case "$BUMP" in
    patch) NEW="$MAJOR.$MINOR.$((PATCH + 1))" ;;
    minor) NEW="$MAJOR.$((MINOR + 1)).0" ;;
    major) NEW="$((MAJOR + 1)).0.0" ;;
    *) echo "error: bump must be patch, minor, major, or X.Y.Z (got '$BUMP')" >&2; exit 1 ;;
  esac
fi

echo "Bumping $CURRENT -> $NEW"

# ponytail: four hand-maintained copies of the same version, not a shared config file — this
# script exists so they can't silently drift, not to fix the duplication itself.
jq --arg v "$NEW" '.version = $v' package.json > package.json.tmp && mv package.json.tmp package.json
jq --arg v "$NEW" '.version = $v' .claude-plugin/plugin.json > .claude-plugin/plugin.json.tmp && mv .claude-plugin/plugin.json.tmp .claude-plugin/plugin.json
jq --arg v "$NEW" '.version = $v' .codex-plugin/plugin.json > .codex-plugin/plugin.json.tmp && mv .codex-plugin/plugin.json.tmp .codex-plugin/plugin.json
jq --arg v "$NEW" '.plugins[0].version = $v' .claude-plugin/marketplace.json > .claude-plugin/marketplace.json.tmp && mv .claude-plugin/marketplace.json.tmp .claude-plugin/marketplace.json

npm run generate:catalogs
npm run generate:skill
npm run build:plugin
npm test

BRANCH="release/v$NEW"
git checkout -b "$BRANCH"
git add -A
git commit -m "Chore: bump version to $NEW"
git push -u origin "$BRANCH"

gh pr create --base main --head "$BRANCH" --title "Chore: release v$NEW" --body "$(cat <<EOF
Version bump: \`$CURRENT\` → \`$NEW\`, across \`package.json\`, \`.claude-plugin/plugin.json\`, \`.claude-plugin/marketplace.json\`, \`.codex-plugin/plugin.json\`. Bundle/skill regenerated to match current \`main\`.

No tag yet — run \`scripts/tag-release.sh\` once this merges.
EOF
)"

echo "Done. Merge the PR with a regular merge commit (not squash) if you want scripts/tag-release.sh's tag to land in main's real history."
