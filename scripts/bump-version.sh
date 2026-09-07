#!/usr/bin/env bash
# Bumps the plugin version everywhere it's duplicated — nothing else. Run from a clean tree:
#   ./scripts/bump-version.sh              # prompts for patch/minor/major/custom
#   ./scripts/bump-version.sh <patch|minor|major|X.Y.Z>   # non-interactive
#
# On main: branches off into release/vX.Y.Z and opens a PR against main.
# On any other branch (e.g. an existing release/* branch): bumps and pushes IN PLACE,
# no new branch, no PR — you already have one for that branch.
#
# Deliberately just the version fields — not catalogs/skill/bundle regeneration, so this can't be
# blocked by an unrelated generator breaking (it happened). Run those yourself when you actually want
# fresh content: npm run generate:catalogs && npm run generate:skill && npm run build:plugin.
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
CURRENT_BRANCH="$(git branch --show-current)"
git pull --ff-only origin "$CURRENT_BRANCH"

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

# ponytail: five hand-maintained copies of the same version, not a shared config file — this
# script exists so they can't silently drift, not to fix the duplication itself.
jq --arg v "$NEW" '.version = $v' package.json > package.json.tmp && mv package.json.tmp package.json
jq --arg v "$NEW" '.version = $v' plugin.json > plugin.json.tmp && mv plugin.json.tmp plugin.json
jq --arg v "$NEW" '.version = $v' .claude-plugin/plugin.json > .claude-plugin/plugin.json.tmp && mv .claude-plugin/plugin.json.tmp .claude-plugin/plugin.json
jq --arg v "$NEW" '.version = $v' .codex-plugin/plugin.json > .codex-plugin/plugin.json.tmp && mv .codex-plugin/plugin.json.tmp .codex-plugin/plugin.json
jq --arg v "$NEW" '.plugins[0].version = $v' .claude-plugin/marketplace.json > .claude-plugin/marketplace.json.tmp && mv .claude-plugin/marketplace.json.tmp .claude-plugin/marketplace.json

if [[ "$CURRENT_BRANCH" == "main" ]]; then
  git checkout -b "release/v$NEW"
fi

git add package.json plugin.json .claude-plugin/plugin.json .claude-plugin/marketplace.json .codex-plugin/plugin.json
git commit -m "Chore: bump version to $NEW"

if [[ "$CURRENT_BRANCH" == "main" ]]; then
  BRANCH="release/v$NEW"
  git push -u origin "$BRANCH"

  gh pr create --base main --head "$BRANCH" --title "Chore: release v$NEW" --body "$(cat <<EOF
Version bump only: \`$CURRENT\` → \`$NEW\`, across \`package.json\`, \`plugin.json\`, \`.claude-plugin/plugin.json\`, \`.claude-plugin/marketplace.json\`, \`.codex-plugin/plugin.json\`. No catalog/skill/bundle regeneration — run those separately if this release needs fresh content too.

No tag yet — run \`scripts/tag-release.sh\` once this merges.
EOF
)"
  echo "Done. Merge the PR with a regular merge commit (not squash) if you want scripts/tag-release.sh's tag to land in main's real history."
else
  git push
  echo "Done. Bumped in place on $CURRENT_BRANCH, pushed — no new branch, no PR (this branch already has its own)."
fi
