# ToolJet for Kiro

Use ToolJet's maintained app-builder skill as a Kiro power for dashboards,
spreadsheet-to-app projects, internal tools, back-office apps and workflows.
The package follows Agent Plugins 1.0, using the same shared guidance as the
other ToolJet clients. It is a skills-only power; configure Cloud OAuth separately.

## Build and install locally

```sh
npm run build:kiro-power
```

The ignored output is `plugins/tooljet-kiro/`. In Kiro's Powers panel choose
Add Custom Power → Import power from a folder and select that directory. Kiro
CLI with Powers support can use:

```sh
kiro-cli powers install /absolute/path/to/tooljet-mcp/plugins/tooljet-kiro
```

Review the native install prompt and test activation with a relevant task. Do not
edit or commit copied skills: update the shared generator/references and rebuild.
The package contains no MCP runtime, credential helper, hooks or auto-approval
configuration. It does not configure a PAT fallback.

## Connect a Cloud workspace through OAuth

1. Open the intended Cloud workspace and copy its UUID from
   `https://app.tooljet.ai/<workspace-id>`. Use a dedicated workspace for testing.
2. In a separate project, merge this into `.kiro/settings/mcp.json`, replacing
   `YOUR-WORKSPACE-UUID` before saving. Preserve other server settings and do not
   put secrets in the file. Native CLI configuration can differ by version; check
   `kiro-cli mcp --help` before choosing its equivalent add command.

   ```json
   {
     "mcpServers": {
       "tooljet": {
         "url": "https://mcp-oauth.tooljet.com/mcp/YOUR-WORKSPACE-UUID"
       }
     }
   }
   ```

3. Enable only the intended connection. Kiro can discover the OAuth authorization
   server and dynamically register a public client; no client secret is needed.
   Personally review and approve ToolJet's browser consent for that workspace.
4. Verify native discovery and power activation. Before writing, ask Kiro to check
   the runtime and active workspace. Restart if `restart_required` is true.

Sign-in to Kiro and approval of ToolJet access are separate. ToolJet's Cloud
service requests app, data, workflow and workspace-user scopes; your workspace
permissions still apply. Revoke access in ToolJet profile settings → Connected AI
clients. These instructions do not establish self-hosted OAuth support.

## Starting prompts

- "Build a ToolJet dashboard for our operations team using synthetic tickets.
  Include search and status filters, validate it and verify the saved app."
- "Plan a shared internal app to replace our spreadsheet approval tracker.
  Explain the ToolJet data model and authorization rules before importing data."
- "Inspect this ToolJet back-office app and add a summary of open requests.
  Preserve its permissions and queries and verify the change."

## Sharing and curated listing

Kiro supports powers imported from public GitHub repositories as well as local
folders. Its docs allow multiple powers in separate directories. Our generated
directory is ignored, so a reviewed public distribution is still required; the
MCP source root is a different package. Record an immutable source/distribution
commit and test importing it before asking users to install it.

A custom import does not make ToolJet a curated partner power. The public intake
is https://kiro.dev/powers/submit/ and requires a complete, tested power in a public
GitHub repository, a privacy link and support contact. It also accepts Publisher
Terms on submission; the account owner must review that separately. Kiro's enterprise MCP registry is an
administrator allowlist, not the public Powers catalog. Nothing in this builder
publishes a power, accepts terms or changes an existing account.

## Verification status

On 29 October 2026, Kiro CLI 2.36.0 installed the generated v0.11.0 power in an
isolated profile. The manifest passed the official Agent Plugins 1.0 schema.
Kiro account sign-in, conversation activation, ToolJet consent, live app editing
and reconnection remain pending. CLI installation does not prove IDE or Web
installation; another client's OAuth success is not Kiro evidence.

Support: https://github.com/ToolJet/tooljet-mcp/issues

ToolJet privacy policy: https://tooljet.com/privacy

## Primary references

- https://kiro.dev/docs/powers/create/
- https://kiro.dev/docs/powers/installation/
- https://kiro.dev/docs/mcp/configuration/

ISC; see LICENSE. Kiro and ToolJet account/service terms remain separate.
