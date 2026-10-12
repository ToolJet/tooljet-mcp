/* Card grids of things with a face but no picture (blind review, 2026-10-12: Luna's recipe cards were text only and
   scored 5 against 6 to 8 for the builds with food photos; "there is no imagery"). get_component_catalog's
   authoringHints.photos holds checked photo URLs for a few subjects; a grid of one of those subjects without an
   imageField gets a nudge naming the subject. Advisory. */

interface Spec {
  name?: string;
  type?: string;
  properties?: Record<string, unknown>;
}

// Subjects with checked photos (data/stock-photos.json), and the words that name them in a grid's name or fields.
const SUBJECTS: Array<[string, RegExp]> = [
  ['food', /(recipe|dish|meal|menu|food|cuisine|bake|snack|drink)/i],
  ['rooms and offices', /(room|office|suite|venue|listing|propert|apartment|hotel)/i],
  ['boats', /(boat|yacht|vessel|charter|marina)/i],
  ['pets', /(pet|dog|animal|puppy|kitten)/i],
];

const valueOf = (props: Record<string, unknown> | undefined, key: string): string => {
  const entry = props?.[key] as { value?: unknown } | undefined;
  const v = entry && typeof entry === 'object' && 'value' in entry ? entry.value : entry;
  return typeof v === 'string' ? v.trim() : '';
};

export function lintPhotolessCardGrids(components: Spec[]): string[] {
  const warnings: string[] = [];
  for (const c of components) {
    if (c.type !== 'ShadCardGrid' || valueOf(c.properties, 'imageField')) continue;
    const words = [c.name ?? '', valueOf(c.properties, 'titleField'), valueOf(c.properties, 'subtitleField')].join(' ');
    const subject = SUBJECTS.find(([, pattern]) => pattern.test(words))?.[0];
    if (!subject) continue;
    warnings.push(
      `Card grid "${c.name ?? 'ShadCardGrid'}" shows ${subject} without pictures: cards of things with a face read as ` +
        `finished with a photo. Seed an image column from get_component_catalog's authoringHints.photos ("${subject}", a ` +
        'different URL per row) and set imageField to it.'
    );
  }
  return warnings;
}
