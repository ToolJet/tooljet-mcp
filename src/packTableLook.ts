/* A ToolJet Table on a page built with the shadcn/ui pack draws in the pack's look (blind review, 2026-10-12: a clinic
   agenda table came out in the ToolJet look, statuses as plain text and a wide empty last column, because the build
   left styles.tableLook out). A look the build set, "default" included, is kept, and so is any page without pack
   widgets. */
import type { ComponentSpec } from './tooljetClient.js';

const lookOf = (c: ComponentSpec): unknown => {
  const entry = (c.styles as Record<string, unknown> | undefined)?.tableLook;
  return entry && typeof entry === 'object' && 'value' in (entry as object) ? (entry as { value?: unknown }).value : entry;
};

export function packTableLook<T extends ComponentSpec>(components: T[]): { components: T[]; warnings: string[] } {
  if (!components.some((c) => /^Shad[A-Z]/.test(c.type ?? ''))) return { components, warnings: [] };
  const warnings: string[] = [];
  const out = components.map((c) => {
    if (c.type !== 'Table' || lookOf(c) !== undefined) return c;
    warnings.push(`Table "${c.name ?? 'Table'}" sits among shadcn/ui pack widgets; it now draws in the pack's look (styles.tableLook "shadcn").`);
    return { ...c, styles: { ...((c.styles as object) ?? {}), tableLook: { value: 'shadcn' } } } as T;
  });
  return { components: out, warnings };
}
