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

# A published tag can't be fixed, only superseded, so refuse to tag a stale bundle. v0.5.0 and
# v0.12.0 both shipped one: the rebuild was skipped, or only bundle/index.js was staged while the
# version constant lives in a chunk. Two checks: the cheap one names the version, and the CI one
# catches any other stale chunk (test.yml rebuilds and diffs bundle/).
if ! git grep -q "TOOLJET_MCP_VERSION = \"$VERSION\"" HEAD -- bundle; then
  echo "error: bundle/ at HEAD does not report $VERSION. Run: npm run build:plugin && git add bundle" >&2
  exit 1
fi
SHA=$(git rev-parse HEAD)
CI=$(gh run list --commit "$SHA" --workflow test.yml --json status,conclusion -q '.[0] | "\(.status) \(.conclusion)"')
if [[ "$CI" != "completed success" ]]; then
  echo "error: test.yml for $SHA is '${CI:-not found}', not 'completed success'. Wait for it, or fix it; don't tag over it." >&2
  exit 1
fi

git tag "$TAG"
git push origin "$TAG"
echo "Tagged and pushed $TAG. Draft the GitHub Release from it in the GitHub UI."
