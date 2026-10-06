/**
 * ToolJet freezes the editor of a version promoted past development (or of a git-synced app that disallows editing)
 * and refuses query writes to it ("You cannot create queries in the promoted version"). A build that did not know
 * created tables and seeded rows, then failed part-way (batch 3 edits, 2026-09-25). Refuse before any write.
 */
export function frozenAppRefusal(summary: { editor_frozen?: boolean; environment?: string } | undefined): string | undefined {
  if (!summary?.editor_frozen) return undefined;
  const where = summary.environment ? ` is in the ${summary.environment} environment and` : '';
  return `Not executed: this app's version${where} is read-only in ToolJet (the editor is frozen, and ToolJet refuses ` +
    'changes to a promoted version). Nothing was changed. Tell the user to create a new version in development ' +
    '(version menu, Create version) and ask again; do not create tables or try other tools.';
}
