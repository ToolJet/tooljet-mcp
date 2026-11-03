# ToolJet for GitHub Copilot

Use Copilot to build and edit ToolJet dashboards, internal tools and business
applications through your own ToolJet MCP connection. The plugin packages the same
maintained app-builder skill used by the other ToolJet integrations. It supplies
planning, component/query guidance and validation; the connected MCP server supplies
the actual tools and current contracts.

## Install the skill

This package is being prepared for marketplace review and is not yet listed in
Awesome Copilot. A maintainer can build and test it locally:

```sh
npm run build:copilot-plugin
copilot --plugin-dir ./plugins/tooljet-copilot
```

Run this preview outside the MCP source checkout (using an absolute package path)
when testing Cloud OAuth, so the repository's PAT configuration cannot shadow it.
A native install smoke test should use a temporary local marketplace referencing
the built package, then `copilot plugin install tooljet@<temporary-marketplace>`.

For release, use a reviewed public immutable distribution commit and the client's
marketplace installation flow. Do not point a listing at this ignored build directory
on the source branch. See the maintainer notes below.

## Connect your workspace once

1. Open the intended ToolJet Cloud workspace and copy its UUID from
   `https://app.tooljet.ai/<workspace-id>`. Start with a dedicated test workspace.
2. Add its remote server with Copilot's native command:

   ```sh
   export TOOLJET_WORKSPACE_ID='YOUR-WORKSPACE-UUID'
   copilot mcp add --transport http tooljet "https://mcp-oauth.tooljet.com/mcp/${TOOLJET_WORKSPACE_ID}"
   ```

   Your shell substitutes the non-secret workspace ID before Copilot stores the URL.
   It is not a PAT or password. Check `copilot mcp get tooljet` afterward. If a ToolJet
   server is already configured, inspect it first rather than silently replacing it.
3. Start Copilot outside the MCP source checkout. Its separate project `.mcp.json`
   is a PAT configuration and must not shadow your chosen Cloud connection.
4. In Copilot, use `/mcp auth tooljet` when sign-in is required. Review the selected
   workspace and requested permissions on ToolJet's consent screen and approve
   personally. Copilot manages the OAuth credentials; do not paste them into chat.
5. Ask Copilot to report the connected workspace and MCP runtime before changing apps.

The skill-only package deliberately ships no remote URL template. Copilot's standard
Agent Plugins format passes remote URL values literally, without environment-variable
expansion. Your workspace-specific connection belongs in native user configuration,
not in a public package. There are no install hooks, credential helpers, PAT fallbacks
or additional local MCP runtimes in this plugin.

ToolJet currently advertises app, data, workflow and workspace-user OAuth scopes.
Operations remain limited by the consenting user's existing workspace permissions.
Disconnect the client in ToolJet profile settings → Connected AI clients. For an
existing self-hosted MCP connection, keep its approved setup and use this skill with
that connection; Cloud OAuth instructions do not establish self-hosted compatibility.

## Try a useful task

- "Build a shared support-ticket dashboard in ToolJet with synthetic data, a searchable
  table and status filters. Keep it private for review."
- "Plan how to turn our spreadsheet request tracker into an internal ToolJet app.
  Explain the data model and employee/manager access rules before importing data."
- "Inspect this ToolJet operations app and add an approval status summary. Preserve
  existing permissions and validate the saved result."

Review connected data sources, permissions, SQL and custom code before real deployment.
The skill does not make an app public or guarantee authorization from a visual preview.
It must not claim a successful build or tool result without verifying it.

## Supported surfaces and QA status

Copilot CLI and VS Code document remote MCP OAuth, but each surface needs its own
configuration and live checks. On 29 October 2026, Copilot CLI 1.0.105 passed a
bounded Cloud OAuth test in a private ToolJet test workspace: user-approved login,
workspace and runtime identity, one existing Text component update, exact readback,
and structural validation with no errors or warnings. The app was also checked in
a browser. A fresh native Copilot process read the saved change more than ten
minutes after initial authentication without another login. This demonstrates
successful reconnection beyond the advertised access-token lifetime; token-store
contents and refresh HTTP traffic were not inspected.

The generated package passed the official Agent Plugins manifest schema,
Microsoft Vally 0.20.0 skill lint (spec compliance and references), and native local
marketplace installation with its shared skill enabled. These local checks are not
an upstream marketplace acceptance or a test of a published immutable release.
VS Code and a complete app build have not been tested in this preparation.

Copilot cloud-agent and code-review MCP settings currently have different OAuth
limitations. Do not describe this package as verified across every Copilot surface.
Grok or Codex OAuth success does not establish Copilot compatibility.

## Maintainer notes

Run `npm run build:copilot-plugin`; it regenerates the existing shared skill and builds
`plugins/tooljet-copilot/` as ignored output. Never edit or commit the copied skill.
The source of the skill remains the shared generator, references and browser audit.
Run `node --test tests/copilotPackage.test.mjs` before release.

The Copilot artifact can be reviewed from CI. Before submission, publish a reviewed
immutable release/distribution, run Awesome Copilot's lint and native install checks,
and complete live OAuth QA with synthetic data in a private test workspace. Submit
through Awesome Copilot's external-plugin issue form, not a direct catalog-addition PR.
Record a release tag and full SHA, version, license, author and setup requirements.
Neither this build command nor CI submits a marketplace application.

Support: https://github.com/ToolJet/tooljet-mcp/issues

## Primary references

- https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference
- https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers
- https://github.com/github/awesome-copilot/blob/main/CONTRIBUTING.md#adding-external-plugins

## License

ISC; see LICENSE. GitHub Copilot and ToolJet account/service terms remain separate.
