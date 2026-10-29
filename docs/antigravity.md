# Antigravity distribution

The Antigravity package is generated separately so native Antigravity requirements do not
change the existing Claude Code, Codex or Agent Plugins manifests.

## Build and validate

```sh
npm ci
npm run build:plugin
npm run build:antigravity-plugin
agy plugin validate --strict ./plugins/tooljet-antigravity
agy plugin install ./plugins/tooljet-antigravity
agy plugin list --json
```

The output is ignored by Git. Rebuild it for each release so bundle, data catalogs, shared skill
and manifest version agree. The source skill is copied unchanged; regenerate that source through
its existing generator when changing guidance. No credentials or environment files are packaged.
The package uses the repository's MIT LICENSE file.

Antigravity CLI 1.4.10 validated and installed this package. Its native `mcp_config.json` declares
one stdio server with user-prompted variables. The installed plugin stays disabled until configured.
Node.js 20+ must be available on PATH. Supply the API and frontend origins separately when the
ToolJet instance uses split-origin hosting; otherwise enter the deployment origin in both fields.

## Submission checks

- Strict validation must report zero errors and warnings.
- Install and confirm one shared skill and one MCP server are discovered.
- Verify the packaged server starts from outside the source checkout.
- Without credentials, initialization must explain the missing token and expose only its read-only
  `tooljet_status` tool. This checks startup and safe failure; it is not an authenticated app test.
- Before claiming end-to-end support, configure a dedicated ToolJet test workspace through the
  Antigravity credential dialog. Build a small app, check saved components/queries, reopen it in
  ToolJet and verify the main interactions. Never use a production customer's workspace for QA.
- Include the README, bundled logo, version and public support URL. State any unverified behavior
  in the marketplace application; do not imply the plugin is already listed.

Google's partner intake is linked from https://antigravity.google/docs/marketplace.
A marketplace listing requires Google's review; local validation does not confer listing status.

Logo: the existing ToolJet favicon from ToolJet/ToolJet, docs/static/img/tooljet-favicon.svg.
