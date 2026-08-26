#!/usr/bin/env bash
# Run on the VM, inside the tooljet-mcp checkout, whenever the repo has new commits to pick up:
#   ./scripts/update-mcp.sh
# ponytail: a manual pull-and-rebuild. Wire this to a systemd timer or a post-push
# webhook later if hands-off updates turn out to matter; until then, this is the button.
set -euo pipefail
cd "$(dirname "$0")/.."

git pull --ff-only
docker compose -f docker-compose.mcp.yml up -d --build
echo "tooljet-mcp updated to $(git rev-parse --short HEAD)"
