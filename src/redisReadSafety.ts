import type { QueryReadAssessment } from './queryExecutionSafety.js';

/** Match the plugin's single space-delimited command; never interpret shell or Redis scripts. */
export function assessRedisRead(options: Record<string, unknown>, datasourceId?: string): QueryReadAssessment {
  const base: QueryReadAssessment = {
    datasourceKind: 'redis', ...(datasourceId ? { datasourceId } : {}),
    provenRead: false, directSafe: false, countOnly: false, selectStar: false,
    requiresCountPreflight: false,
  };
  const query = options.query;
  if (typeof query !== 'string' || !query || query.includes('{{') || /[\r\n\t\0]/.test(query)) {
    return { ...base, reason: 'Redis needs one static space-delimited command in options.query.' };
  }
  const [raw, ...args] = query.split(' ');
  if (!raw || args.some((arg) => !arg)) {
    return { ...base, reason: 'Redis commands must use single spaces, matching the plugin parser.' };
  }
  const command = raw.toUpperCase();
  const scalarArity: Record<string, number> = {
    PING: 0, DBSIZE: 0, GET: 1, TYPE: 1, TTL: 1, PTTL: 1,
    STRLEN: 1, HLEN: 1, LLEN: 1, SCARD: 1, ZCARD: 1, HGET: 2, HEXISTS: 2,
    SISMEMBER: 2, ZSCORE: 2,
  };
  if (Object.hasOwn(scalarArity, command) && args.length === scalarArity[command]) {
    return { ...base, provenRead: true, directSafe: true, maxRows: 1 };
  }
  if (['MGET', 'EXISTS', 'HMGET'].includes(command)) {
    const fields = args.length - (command === 'HMGET' ? 1 : 0);
    if (fields > 0 && fields <= 1000) {
      return { ...base, provenRead: true, directSafe: true, maxRows: command === 'EXISTS' ? 1 : fields };
    }
  }
  if (['LRANGE', 'ZRANGE'].includes(command) && args.length === 3 &&
      /^\d+$/.test(args[1]!) && /^\d+$/.test(args[2]!)) {
    const start = Number(args[1]);
    const end = Number(args[2]);
    const maxRows = end - start + 1;
    if (Number.isSafeInteger(start) && Number.isSafeInteger(end) && maxRows > 0 && maxRows <= 1000) {
      return { ...base, provenRead: true, directSafe: true, maxRows };
    }
  }
  // COUNT is only a scan hint, not a hard result bound. Require singular, confirmed execution.
  const scanOffset = command === 'SCAN' ? 0 : ['HSCAN', 'SSCAN', 'ZSCAN'].includes(command) ? 1 : -1;
  let scan = scanOffset >= 0 && args.length > scanOffset && /^\d+$/.test(args[scanOffset]!);
  const seen = new Set<string>();
  if (scan) {
    for (let i = scanOffset + 1; i < args.length; i += 2) {
      const option = args[i]!.toUpperCase();
      const value = args[i + 1];
      if (!value || seen.has(option) ||
          !['MATCH', 'COUNT', ...(command === 'SCAN' ? ['TYPE'] : [])].includes(option) ||
          (option === 'COUNT' && (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 1000))) {
        scan = false;
        break;
      }
      seen.add(option);
    }
  }
  if (scan || (['HGETALL', 'HKEYS', 'HVALS', 'SMEMBERS'].includes(command) && args.length === 1)) {
    return {
      ...base, provenRead: true, requiresRemoteReadConfirmation: true,
      reason: 'Redis collection/scan reads have no hard result bound. Use singular run_query with confirmed read access; SCAN COUNT is only a hint.',
    };
  }
  return { ...base, reason: `Redis command ${command} is not a supported bounded read. Writes, scripts, KEYS and administrative commands are not automatically executed.` };
}
