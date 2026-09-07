import { getComponentSchema } from './catalog.js';
import { minimumTextHeight, type LintComponent } from './lint.js';

type Rect = { top?: number; left?: number; width?: number; height?: number };

interface LayoutCarrier {
  type?: string;
  name?: string;
  layout?: Rect;
  layouts?: { desktop?: Rect; mobile?: Rect };
}

/**
 * Deterministic height fixes for the two geometry errors that cost a lint round trip on most builds:
 *  - a Text whose authored height cannot show one line (models write 30 for a title; ToolJet needs ~39 at
 *    the default 14/1.5 scale, ~40 at 22px bold) is raised to the computed minimum;
 *  - a single-line form control (TextInput, DropdownV2, NumberInput, DatePickerV2, ...) authored taller than
 *    its catalog height is lowered back (oversizing never enlarges the value text; the label renders outside
 *    the box anyway).
 * Same-shape copy back so the caller's spec keeps whichever of layout/layouts it used.
 */
export function normalizePlannedLayouts<T extends LayoutCarrier>(component: T): { component: T; warnings: string[] } {
  const warnings: string[] = [];
  const label = `${component.type ?? 'component'} "${component.name ?? '?'}"`;
  const targets: Array<[string, Rect]> = [];
  if (component.layout) targets.push(['layout', component.layout]);
  if (component.layouts?.desktop) targets.push(['desktop', component.layouts.desktop]);
  if (component.layouts?.mobile) targets.push(['mobile', component.layouts.mobile]);
  if (!targets.length) return { component, warnings };

  const textMinimum = component.type === 'Text' ? minimumTextHeight(component as unknown as LintComponent) : undefined;
  const schema = component.type ? getComponentSchema(component.type) : undefined;
  const compactHeight = schema?.renderingHints?.compactFormHeight ? schema?.defaultSize?.height : undefined;

  const fixed = new Map<string, Rect>();
  for (const [name, rect] of targets) {
    if (typeof rect.height !== 'number') continue;
    if (textMinimum !== undefined && rect.height < textMinimum) {
      fixed.set(name, { ...rect, height: textMinimum });
      warnings.push(`${label}: raised ${name} height ${rect.height}px to ${textMinimum}px so one line of text renders.`);
    } else if (compactHeight !== undefined && rect.height > compactHeight) {
      fixed.set(name, { ...rect, height: compactHeight });
      warnings.push(
        `${label}: lowered ${name} height ${rect.height}px to the standard single-line ${compactHeight}px ` +
          '(oversizing does not enlarge the value text; a top label renders outside the box).'
      );
    }
  }
  if (!fixed.size) return { component, warnings };
  const next: T = { ...component };
  if (fixed.has('layout')) next.layout = fixed.get('layout');
  if (fixed.has('desktop') || fixed.has('mobile')) {
    next.layouts = {
      ...component.layouts,
      ...(fixed.has('desktop') ? { desktop: fixed.get('desktop') } : {}),
      ...(fixed.has('mobile') ? { mobile: fixed.get('mobile') } : {}),
    };
  }
  return { component: next, warnings };
}
