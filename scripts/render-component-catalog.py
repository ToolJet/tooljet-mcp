"""Pre-render every component contract into the skill so a sandbox can read them off disk.
Regenerating the skill wipes this directory, so run it AFTER generate-skill.mjs."""
import asyncio, json, os, pathlib, sys
from mcp import ClientSession
from mcp.client.streamable_http import create_mcp_http_client, streamable_http_client
OUT = pathlib.Path(os.environ["TOOLJET_MCP_DIR"]) / "skills/tooljet-app-builder/references/catalog"
SECTIONS = ["overview","properties","styles","events","actions","exposedVariables","authoringHints"]
async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    async with streamable_http_client("http://127.0.0.1:8787/mcp",
        http_client=create_mcp_http_client(headers={"Authorization": f"Bearer {os.environ['TOOLJET_MCP_TOKEN']}"})) as st:
        async with ClientSession(st[0], st[1]) as s:
            await s.initialize()
            idx = await s.call_tool("get_component_catalog", {})
            body = "".join(getattr(p, "text", "") for p in (idx.content or []))
            (OUT / "_index.json").write_text(body)
            types = [c["type"] for c in json.loads(body) if c.get("type")]
            for t in types:
                r = await s.call_tool("get_component_catalog", {"types": [t], "sections": SECTIONS})
                text = "".join(getattr(p, "text", "") for p in (r.content or []))
                if text.strip():
                    (OUT / f"{t}.json").write_text(text)
            files = sorted(OUT.glob("*.json"))
            print(f"catalog: {len(files)} files, {sum(f.stat().st_size for f in files):,} bytes")
asyncio.run(main())
