"""Compatibility entry point; render contracts locally without MCP credentials or a server."""
import os
from pathlib import Path
import subprocess

root = Path(os.environ.get("TOOLJET_MCP_DIR", Path(__file__).resolve().parent.parent))
subprocess.run(["npm", "run", "render:catalog"], cwd=root, check=True)
