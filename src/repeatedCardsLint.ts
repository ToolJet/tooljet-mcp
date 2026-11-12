/* Records drawn as hand-copied cards (Employee onboarding, 2026-10-11: equipmentCard1..equipmentCard30, each child
   reading queries.equipment_rows.data[n]). Copies show a fixed number of rows, hide the rest, need thirty edits for
   one change, and cost a build hundreds of components. A card grid or list bound to the query draws every row from one
   template. Flagged: four or more containers of one type whose names differ only by a trailing number and that hold
   the same components; under six of them only when their contents read rows by position (a KPI row of four
   different figures is not a list). */
import { decodeComponentParent } from './componentParent.js';

interface Spec {
  id?: string;
  name?: string;
  type?: string;
  clientRef?: string;
  parentRef?: string;
  parent?: string;
  properties?: Record<string, unknown>;
}

const CONTAINER_TYPES = new Set(['FlexContainer', 'Container']);
const MIN_COPIES = 4;
const MIN_COPIES_WITHOUT_POSITION = 6;
const POSITIONAL_READ = /\.data\s*(\|\|\s*\[\s*\]\s*\))?\s*\[\s*\d+\s*\]|\)\s*\[\s*\d+\s*\]|\[\s*\d+\s*\]\s*\?\.|\[\s*\d+\s*\]\s*\./;

function parentOf(c: Spec): string | undefined {
  if (c.parentRef) return c.parentRef;
  return c.parent ? decodeComponentParent(c.parent).parentId : undefined;
}

export function lintCopiedCards(components: Spec[]): string[] {
  const byParent = new Map<string, Spec[]>();
  for (const c of components) {
    const parent = parentOf(c);
    if (parent) byParent.set(parent, [...(byParent.get(parent) ?? []), c]);
  }
  const childrenOf = (c: Spec): Spec[] => {
    const seen = new Set<Spec>();
    for (const ref of [c.clientRef, c.id, c.name]) for (const child of ref ? byParent.get(ref) ?? [] : []) seen.add(child);
    return [...seen];
  };
  const descendants = (c: Spec, depth = 0): Spec[] =>
    depth > 20 ? [] : childrenOf(c).flatMap((child) => [child, ...descendants(child, depth + 1)]);

  const groups = new Map<string, Array<{ spec: Spec; n: number }>>();
  for (const c of components) {
    if (!CONTAINER_TYPES.has(c.type ?? '')) continue;
    const match = /^(.*?[A-Za-z_])(\d+)$/.exec(c.name ?? c.clientRef ?? '');
    if (!match) continue;
    const key = `${c.type}:${match[1]!.toLowerCase()}`;
    groups.set(key, [...(groups.get(key) ?? []), { spec: c, n: Number(match[2]) }]);
  }

  const flagged = new Set<Spec>();
  const warnings: string[] = [];
  // Outer copies first, so a card's numbered inner containers (starterContent1..6 in starterCard1..6) are not reported again.
  const ordered = [...groups.values()].sort((a, b) => descendants(b[0]!.spec).length - descendants(a[0]!.spec).length);
  for (const group of ordered) {
    if (group.length < MIN_COPIES) continue;
    if (group.some(({ spec }) => [...flagged].some((outer) => descendants(outer).includes(spec)))) continue;
    const signature = (spec: Spec) => descendants(spec).map((d) => d.type ?? '?').sort().join(',');
    const bySignature = new Map<string, typeof group>();
    for (const member of group) {
      const sig = signature(member.spec);
      if (sig) bySignature.set(sig, [...(bySignature.get(sig) ?? []), member]);
    }
    const [sig, copies] = [...bySignature.entries()].sort((a, b) => b[1].length - a[1].length)[0] ?? [];
    if (!sig || !copies || copies.length < MIN_COPIES) continue;
    const positional = copies.some(({ spec }) => [spec, ...descendants(spec)].some((d) => POSITIONAL_READ.test(JSON.stringify(d.properties ?? {}))));
    if (!positional && copies.length < MIN_COPIES_WITHOUT_POSITION) continue;
    copies.forEach(({ spec }) => flagged.add(spec));
    const sorted = [...copies].sort((a, b) => a.n - b.n);
    const first = sorted[0]!.spec;
    const last = sorted[sorted.length - 1]!.spec;
    const counts = new Map<string, number>();
    for (const type of sig.split(',')) counts.set(type, (counts.get(type) ?? 0) + 1);
    const holds = [...counts.entries()].map(([type, n]) => (n > 1 ? `${n} ${type}` : type)).join(', ');
    const type = first.type ?? 'container';
    warnings.push(
      `${copies.length} ${type}s "${first.name ?? first.clientRef}" to "${last.name ?? last.clientRef}" are one card copied ` +
        `${copies.length} times (each holds ${holds})${positional ? ' and read their rows by position (data[n])' : ''}. ` +
        'Copies show a fixed number of records and hide the rest, and every change has to be made to each. Draw the records ' +
        'with one component bound to the query: ShadCardGrid (a card per row: title, subtitle, badge, description and meta ' +
        'fields; onCardClicked and selectedItem for the detail), or ShadListView with one item canvas whose children bind ' +
        '{{listItem.<field>}}. Keep separate cards only for figures that are not rows of one query.'
    );
  }
  return warnings;
}
