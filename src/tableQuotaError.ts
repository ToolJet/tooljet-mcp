/** A workspace quota requires a user decision; changing the table name cannot fix it. */
export class TableQuotaError extends Error {
  readonly code = 'TJDB_TABLE_LIMIT_REACHED';
  readonly status = 451;
  readonly retryable = false;

  constructor() {
    super('The workspace has reached its ToolJet Database table limit. Stop creating tables. ' +
      'Ask the user to reuse existing tables, free table capacity, or increase the workspace allowance before continuing. ' +
      'Keep resources already created; do not delete tables automatically.');
    this.name = 'TableQuotaError';
  }
}

/** Preserve classification through batch and phase errors without parsing their messages. */
export function tableQuotaError(error: unknown): TableQuotaError | undefined {
  const seen = new Set<unknown>();
  while (error instanceof Error && !seen.has(error)) {
    if (error instanceof TableQuotaError) return error;
    seen.add(error);
    error = error.cause;
  }
  return undefined;
}
