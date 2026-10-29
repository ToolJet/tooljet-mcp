// Generate an isolated Antigravity package from the released MCP bundle and shared skill.
// Run build:plugin first when changing MCP source. No credentials are read or packaged.
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'plugins/tooljet-antigravity');
const version = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version;
for (const path of ['bundle/index.js', 'data', 'skills/tooljet-app-builder/SKILL.md', 'assets/antigravity/logo.svg']) {
  if (!existsSync(resolve(root, path))) throw new Error(`Missing ${path}; build the MCP plugin first.`);
}
function verifyTree(path) {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) throw new Error(`Refusing symlink: ${path}`);
  if (stat.isDirectory()) for (const file of readdirSync(path)) verifyTree(resolve(path, file));
  else if (/\.(?:env|pem|key)$/.test(path)) throw new Error(`Refusing credential file: ${path}`);
}
for (const path of ['bundle', 'data', 'skills/tooljet-app-builder']) verifyTree(resolve(root,path));
rmSync(output, { recursive: true, force: true });
mkdirSync(resolve(output, 'assets'), { recursive: true });
for (const path of ['bundle', 'data', 'LICENSE']) cpSync(resolve(root,path),resolve(output,path),{recursive:true});
cpSync(resolve(root,'skills/tooljet-app-builder'),resolve(output,'skills/tooljet-app-builder'),{
  recursive:true, filter:path=>!path.includes('/references/catalog'),
});
cpSync(resolve(root,'assets/antigravity/logo.svg'),resolve(output,'assets/logo.svg'));
const writeJson=(path,value)=>writeFileSync(resolve(output,path),JSON.stringify(value,null,2)+'\n');
writeJson('plugin.json',{
  $schema:'https://antigravity.google/schemas/v1/plugin.json',
  name:'tooljet',displayName:'ToolJet',version,
  description:'Build dashboards, internal tools and business apps on your data. Refine them in ToolJet’s visual builder and share them with your team.',
  logo:'assets/logo.svg',author:{name:'ToolJet',url:'https://tooljet.com'},
  homepage:'https://tooljet.com/mcp',repository:'https://github.com/ToolJet/tooljet-mcp',license:'MIT',
  keywords:['tooljet','dashboards','internal-tools','business-apps','low-code','spreadsheets'],
  suggestedPrompts:[
    'Build a dashboard my team can use, connected to our existing data.',
    'Turn a spreadsheet into an internal app with forms, permissions and approval steps.',
    'Build an operations tool and verify its queries and main user flows.',
  ],
});
const server={
  command:'node',args:['${PLUGIN_ROOT}/bundle/index.js'],
  env:{TOOLJET_URL:'${TOOLJET_URL}',TOOLJET_DEPLOYMENT_URL:'${TOOLJET_DEPLOYMENT_URL}',TOOLJET_PAT:'${TOOLJET_PAT}'},
  variables:[
    {name:'TOOLJET_DEPLOYMENT_URL',title:'ToolJet deployment URL',description:'Browser URL of your ToolJet deployment, such as your ToolJet Cloud or self-hosted origin.',link:'https://docs.tooljet.com/docs/build-with-ai/mcp/overview/'},
    {name:'TOOLJET_URL',title:'ToolJet API URL',description:'API origin for the deployment. Use the deployment URL again when UI and API share one origin.'},
    {name:'TOOLJET_PAT',title:'ToolJet personal access token',description:'Generate a personal access token in the target workspace’s Settings > Access tokens. Actions use your identity and permissions.',link:'https://docs.tooljet.com/docs/build-with-ai/mcp/overview/'},
  ],
};
// Native Antigravity loader; do not alter root mcp.json used by other clients.
writeJson('mcp_config.json',{mcpServers:{tooljet:server}});
writeFileSync(resolve(output,'README.md'),`# ToolJet for Antigravity\n\nBuild dashboards, internal tools and business apps with ToolJet’s MCP server and shared app-builder skill. Apps remain editable in ToolJet’s visual builder.\n\n## Requirements\n\n- Node.js 20 or later on your PATH.\n- A ToolJet deployment with MCP/PAT support and a workspace you are authorized to use. Deployment and plan capabilities vary.\n- A personal access token for that workspace. Never put it in a prompt, screenshot, repository or support issue.\n\n## Setup\n\nInstall this plugin directory using Antigravity’s plugin manager or run:\n\n\`\`\`sh\nagy plugin install ./plugins/tooljet-antigravity\n\`\`\`\n\nEnable ToolJet in Customizations > Installed (or /plugin) and fill in its three configuration fields. Use the same URL for deployment and API on a shared-origin instance. For split-origin hosting, use the browser origin for deployment and the API origin for API URL. Enter your PAT only in the credential dialog. This package ships no credentials.\n\nOnly enable one ToolJet app-builder skill/server package per session. Existing connections should not be duplicated.\n\n## Try it\n\n- Build a dashboard my team can use, connected to our existing data.\n- Turn a spreadsheet into an internal app with forms, permissions and approval steps.\n- Build an operations tool and verify its queries and main user flows.\n\nThe skill asks for data and permission requirements, uses available component contracts, and verifies the result. Review generated queries, write actions and access controls before release. A spreadsheet request does not automatically authorize importing its records. Features depend on your deployment and plan.\n\n## Data and permissions\n\nThe local Node.js MCP process calls your configured ToolJet API using your PAT. ToolJet operations run with that identity’s permissions. Model processing is governed by your Antigravity setup. Publishing this plugin does not make your apps or data public.\n\n## Support\n\nOpen an issue at https://github.com/ToolJet/tooljet-mcp/issues with your ToolJet/plugin versions and a redacted error. Do not include tokens or confidential data.\n\n## License\n\nThe bundled server, shared skill and this package use the repository’s MIT license. Version ${version}.\n`);
console.log(`Built ${output}`);
