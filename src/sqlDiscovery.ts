export type SqlDiscoveryPurpose =
  | 'count'
  | 'preview'
  | 'distinct'
  | 'primary_keys'
  | 'foreign_keys'
  | 'indexes'
  | 'views';

const DIALECTS = {
  postgresql: { quote: 'double', limit: 'limit', metadata: 'postgresql' },
  mysql: { quote: 'backtick', limit: 'limit', metadata: 'mysql' },
  mssql: { quote: 'bracket', limit: 'top', metadata: 'mssql' },
  snowflake: { quote: 'double', limit: 'limit' },
  bigquery: { quote: 'backtick', limit: 'limit' },
  oracledb: { quote: 'double', limit: 'fetch' },
} as const;

type SqlKind = keyof typeof DIALECTS;

export interface PreparedSqlQuery {
  purpose: SqlDiscoveryPurpose;
  name: string;
  datasource_id: string;
  options: Record<string, unknown>;
}

function assertIdentifier(identifier: string, label: string): void {
  if (!identifier.trim() || identifier.length > 256 || /[\0-\x1f\x7f;`"\[\]\\]/.test(identifier)) {
    throw new Error(`${label} contains unsupported or unsafe identifier characters.`);
  }
}

function quote(kind: SqlKind, identifier: string): string {
  assertIdentifier(identifier, 'SQL identifier');
  const style = DIALECTS[kind].quote;
  if (style === 'backtick') return `\`${identifier}\``;
  if (style === 'bracket') return `[${identifier}]`;
  return `"${identifier}"`;
}

function literal(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function source(kind: SqlKind, schema: string | undefined, table: string): string {
  return schema ? `${quote(kind, schema)}.${quote(kind, table)}` : quote(kind, table);
}

function boundedSelect(kind: SqlKind, projection: string, from: string, limit: number, distinct = false): string {
  const prefix = `SELECT ${distinct ? 'DISTINCT ' : ''}`;
  if (DIALECTS[kind].limit === 'top') return `${prefix}TOP (${limit}) ${projection} FROM ${from}`;
  if (DIALECTS[kind].limit === 'fetch') return `${prefix}${projection} FROM ${from} FETCH FIRST ${limit} ROWS ONLY`;
  return `${prefix}${projection} FROM ${from} LIMIT ${limit}`;
}

function options(kind: SqlKind, query: string): Record<string, unknown> {
  return {
    mode: 'sql',
    query,
    ...(!['snowflake'].includes(kind) ? { query_params: [] } : {}),
    runOnPageLoad: false,
  };
}

function metadataSql(
  kind: SqlKind,
  purpose: Exclude<SqlDiscoveryPurpose, 'count' | 'preview' | 'distinct'>,
  schema: string | undefined,
  table: string | undefined
): string | undefined {
  const metadata = 'metadata' in DIALECTS[kind] ? DIALECTS[kind].metadata : undefined;
  if (!metadata) return undefined;
  if (purpose !== 'views' && !table) throw new Error(`${purpose} discovery requires table.`);
  if (metadata !== 'mysql' && !schema) throw new Error(`${purpose} discovery for ${kind} requires schema.`);
  const schemaFilter = metadata === 'mysql' && !schema ? 'DATABASE()' : literal(schema!);
  const tableFilter = table ? literal(table) : undefined;

  if (metadata === 'postgresql') {
    if (purpose === 'primary_keys') return `SELECT kcu.column_name, kcu.ordinal_position, tc.constraint_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_catalog = kcu.constraint_catalog AND tc.constraint_schema = kcu.constraint_schema AND tc.constraint_name = kcu.constraint_name WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = ${schemaFilter} AND tc.table_name = ${tableFilter} ORDER BY kcu.ordinal_position`;
    if (purpose === 'foreign_keys') return `SELECT kcu.constraint_name, kcu.column_name, ccu.table_schema AS referenced_schema, ccu.table_name AS referenced_table, ccu.column_name AS referenced_column FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_catalog = kcu.constraint_catalog AND tc.constraint_schema = kcu.constraint_schema AND tc.constraint_name = kcu.constraint_name JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_catalog = tc.constraint_catalog AND ccu.constraint_schema = tc.constraint_schema AND ccu.constraint_name = tc.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = ${schemaFilter} AND tc.table_name = ${tableFilter} ORDER BY kcu.constraint_name, kcu.ordinal_position`;
    if (purpose === 'indexes') return `SELECT indexname AS index_name, indexdef AS definition FROM pg_indexes WHERE schemaname = ${schemaFilter} AND tablename = ${tableFilter} ORDER BY indexname`;
    return `SELECT table_schema, table_name AS view_name FROM information_schema.views WHERE table_schema = ${schemaFilter} ORDER BY table_name`;
  }

  if (metadata === 'mysql') {
    if (purpose === 'primary_keys') return `SELECT column_name, ordinal_position, constraint_name FROM information_schema.key_column_usage WHERE table_schema = ${schemaFilter} AND table_name = ${tableFilter} AND constraint_name = 'PRIMARY' ORDER BY ordinal_position`;
    if (purpose === 'foreign_keys') return `SELECT constraint_name, column_name, referenced_table_schema AS referenced_schema, referenced_table_name AS referenced_table, referenced_column_name AS referenced_column FROM information_schema.key_column_usage WHERE table_schema = ${schemaFilter} AND table_name = ${tableFilter} AND referenced_table_name IS NOT NULL ORDER BY constraint_name, ordinal_position`;
    if (purpose === 'indexes') return `SELECT index_name, column_name, non_unique, seq_in_index FROM information_schema.statistics WHERE table_schema = ${schemaFilter} AND table_name = ${tableFilter} ORDER BY index_name, seq_in_index`;
    return `SELECT table_schema, table_name AS view_name FROM information_schema.views WHERE table_schema = ${schemaFilter} ORDER BY table_name`;
  }

  if (purpose === 'primary_keys') return `SELECT kcu.COLUMN_NAME AS column_name, kcu.ORDINAL_POSITION AS ordinal_position, tc.CONSTRAINT_NAME AS constraint_name FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA AND tc.TABLE_NAME = kcu.TABLE_NAME WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY' AND tc.TABLE_SCHEMA = ${schemaFilter} AND tc.TABLE_NAME = ${tableFilter} ORDER BY kcu.ORDINAL_POSITION`;
  if (purpose === 'foreign_keys') return `SELECT fk.name AS constraint_name, pc.name AS column_name, rs.name AS referenced_schema, rt.name AS referenced_table, rc.name AS referenced_column FROM sys.foreign_key_columns fkc JOIN sys.foreign_keys fk ON fk.object_id = fkc.constraint_object_id JOIN sys.tables pt ON pt.object_id = fkc.parent_object_id JOIN sys.schemas ps ON ps.schema_id = pt.schema_id JOIN sys.columns pc ON pc.object_id = pt.object_id AND pc.column_id = fkc.parent_column_id JOIN sys.tables rt ON rt.object_id = fkc.referenced_object_id JOIN sys.schemas rs ON rs.schema_id = rt.schema_id JOIN sys.columns rc ON rc.object_id = rt.object_id AND rc.column_id = fkc.referenced_column_id WHERE ps.name = ${schemaFilter} AND pt.name = ${tableFilter} ORDER BY fk.name, fkc.constraint_column_id`;
  if (purpose === 'indexes') return `SELECT i.name AS index_name, c.name AS column_name, i.is_unique, ic.key_ordinal FROM sys.indexes i JOIN sys.tables t ON t.object_id = i.object_id JOIN sys.schemas s ON s.schema_id = t.schema_id JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id WHERE s.name = ${schemaFilter} AND t.name = ${tableFilter} AND i.is_hypothetical = 0 ORDER BY i.name, ic.key_ordinal`;
  return `SELECT TABLE_SCHEMA AS table_schema, TABLE_NAME AS view_name FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_SCHEMA = ${schemaFilter} ORDER BY TABLE_NAME`;
}

function boundMetadata(kind: SqlKind, sql: string): string {
  if (DIALECTS[kind].limit === 'top') return sql.replace(/^SELECT\s+/i, 'SELECT TOP (100) ');
  if (DIALECTS[kind].limit === 'fetch') return `${sql} FETCH FIRST 100 ROWS ONLY`;
  return `${sql} LIMIT 100`;
}

function safeName(value: string): string {
  return value.replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'table';
}

export function prepareSqlDiscoveryQueries(args: {
  kind: string;
  datasourceId: string;
  schema?: string;
  table?: string;
  columns?: string[];
  distinctColumns?: string[];
  purposes: SqlDiscoveryPurpose[];
  limit: number;
  namePrefix?: string;
}): { queries: PreparedSqlQuery[]; unsupported: Array<{ purpose: SqlDiscoveryPurpose; reason: string }> } {
  if (!(args.kind in DIALECTS)) throw new Error(`Datasource kind "${args.kind}" is not supported by SQL discovery.`);
  const kind = args.kind as SqlKind;
  if (args.schema) assertIdentifier(args.schema, 'schema');
  if (args.table) assertIdentifier(args.table, 'table');
  for (const column of [...(args.columns ?? []), ...(args.distinctColumns ?? [])]) assertIdentifier(column, 'column');
  const tablePurposes = args.purposes.filter((purpose) => purpose !== 'views');
  if (tablePurposes.length && !args.table) throw new Error('Table-scoped SQL discovery requires table.');
  if (args.purposes.includes('preview') && !args.columns?.length) {
    throw new Error('Preview discovery requires one or more explicit columns; SELECT * is never generated.');
  }
  if (args.purposes.includes('distinct') && !args.distinctColumns?.length) {
    throw new Error('Distinct discovery requires one or more explicit distinct_columns.');
  }

  const from = args.table ? source(kind, args.schema, args.table) : undefined;
  const prefix = safeName(args.namePrefix ?? args.table ?? args.schema ?? 'schema');
  const queries: PreparedSqlQuery[] = [];
  const unsupported: Array<{ purpose: SqlDiscoveryPurpose; reason: string }> = [];
  for (const purpose of [...new Set(args.purposes)]) {
    let sql: string | undefined;
    if (purpose === 'count') sql = `SELECT COUNT(*) AS row_count FROM ${from}`;
    else if (purpose === 'preview') {
      sql = boundedSelect(kind, args.columns!.map((column) => quote(kind, column)).join(', '), from!, args.limit);
    } else if (purpose === 'distinct') {
      sql = boundedSelect(kind, args.distinctColumns!.map((column) => quote(kind, column)).join(', '), from!, args.limit, true);
    } else {
      sql = metadataSql(kind, purpose, args.schema, args.table);
      if (!sql) {
        unsupported.push({
          purpose,
          reason: `${args.kind} does not expose a verified ${purpose} selector and MCP has no curated read-only SQL contract for it yet.`,
        });
        continue;
      }
      sql = boundMetadata(kind, sql);
    }
    queries.push({
      purpose,
      name: `${prefix}_${purpose}`,
      datasource_id: args.datasourceId,
      options: options(kind, sql),
    });
  }
  return { queries, unsupported };
}
