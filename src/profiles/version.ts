/** True when semver `a` is newer than `b`. Anything unparsable counts as oldest. */
export function newerVersion(a: unknown, b: unknown): boolean {
  const parts = (v: unknown) => (typeof v === 'string' ? v.split('.').map((n) => Number.parseInt(n, 10) || 0) : [0, 0, 0]);
  const pa = parts(a), pb = parts(b);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return false;
}
