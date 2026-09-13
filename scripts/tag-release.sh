#!/usr/bin/env bash
# Tags whatever's currently checked out and pushes the tag. Run after scripts/bump-version.sh's
# PR has merged (or against any commit you want tagged):
#   ./scripts/tag-release.sh              # prompts, defaults to package.json's version
#   ./scripts/tag-release.sh X.Y.Z        # non-interactive
# Draft the actual GitHub Release from the pushed tag yourself, in the GitHub UI.
set -euo pipefail
cd "$(dirname "$0")/.."

CURRENT=$(jq -r .version package.json)
VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  read -rp "Version to tag [$CURRENT]: " VERSION
  VERSION="${VERSION:-$CURRENT}"
fi
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "error: version must look like X.Y.Z (got '$VERSION')" >&2
  exit 1
fi
TAG="v$VERSION"

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "error: tag $TAG already exists" >&2
  exit 1
fi

git tag "$TAG"
git push origin "$TAG"
echo "Tagged and pushed $TAG. Draft the GitHub Release from it in the GitHub UI."
