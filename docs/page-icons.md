# Page icon contract

ToolJet renders page icons by looking up an exact named export from `@tabler/icons-react`.
It does not translate CSS names: `chart-line` silently renders the fallback, whereas
`IconChartLine` selects the intended icon.

`data/page-icons.json` is a deterministic snapshot of all icon exports (including aliases)
from the ToolJet frontend package/version recorded in the file. It is not a curated theme
or a restricted set of design choices. No SVGs, React runtime, or icon list is added to model
prompts. The names are used locally for constant-time membership checks.

Regenerate when the target ToolJet frontend updates its icon dependency:

```sh
TOOLJET_ROOT=/path/to/ToolJet npm run generate:page-icons
npm run build:plugin
```

The checkout's frontend dependencies must be installed. Generation reads the ESM export
declarations without evaluating package code. Commit the catalog with the MCP release.
An older snapshot cannot certify new exports in a newer deployment; refresh it rather
than accepting arbitrary strings or guessing an icon from an `Icon` prefix.

New/planned icon values and icon updates reject unsupported names with exact-name suggestions.
The client preflights the entire page batch before any deployment request, including callers
that bypass the MCP schema. Unrelated edits/reorders do not revalidate unchanged legacy icons.
`validate_app` reports unsupported saved icons as warnings so an unrelated functional repair
can still proceed. Missing icons on native Home retain their existing fallback behavior.

No automatic rewriting, duplicate-icon prohibition, app migration, or extra model call is
introduced. Existing apps need an explicit page-icon update to repair their saved metadata.
