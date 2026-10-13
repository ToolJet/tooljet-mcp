import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type Section = Record<string, unknown>;
type PackDefinition = { properties?: Section; styles?: Section; others?: Section };

let cached: Record<string, PackDefinition> | undefined;

/** Sample content in the palette defaults (shown when a person drops the widget) that an agent-built component never
 *  asked for: a todo app's hero read "Sun, 11 Oct · 14 bookings · 3 need a reply" because the build set no meta. These
 *  properties start empty instead; a build that wants them sets them. */
const SAMPLE_BLANKS: Record<string, Record<string, unknown>> = {
  ShadHero: { eyebrow: '', subtitle: '', meta: '{{[]}}', actionLabel: '' },
  ShadCardGrid: { badgeField: '', descriptionField: '', metaFields: '' },
  ShadRecordList: { metaFields: '', valueField: '', valueFormat: 'auto' },
  // The sample's budget fields (spent, budget, note, status) are not a build's data: the config's own names stand.
  ShadProgressList: {
    labelField: 'label',
    valueField: 'value',
    targetField: 'target',
    captionField: '',
    statusField: '',
    valueFormat: 'auto',
  },
  ShadSchedule: { resourceField: 'resource', resourceTitle: '' },
  // The sample's delivery stops (customer, address, eta, driver) are not a build's data: no rows, generic fields.
  ShadMap: { data: '{{[]}}', titleField: 'name', subtitleField: '', popupFields: '' },
  // 'auto' reads money from a figure's label; the 'currency' default showed counts of rooms as dollars.
  ShadSummaryStrip: { valueFormat: 'auto' },
  ShadTags: { tags: '{{[]}}', tagColors: '{{{}}}' },
  ShadAvatar: { names: '' },
  ShadLink: { linkTarget: '' },
  ShadCombobox: { searchPlaceholder: 'Search...' },
  ShadMultiselect: { searchPlaceholder: 'Search...' },
  ShadTagsInput: { suggestions: '{{[]}}' },
  // The sample greeting talks about orders, invoices and deliveries; a build's chat starts from its own history.
  ShadChat: { initialChat: '{{[]}}' },
  // The sample's 'set up your workspace' line is not a build's; completeTitle alone reads fine.
  ShadQuestionnaire: { completeText: '' },
};

/** The default definition of a component-pack widget (data/pack-default-definitions.json, generated from the
 *  frontend's pack configs), or undefined for any other type. The server merges no defaults over pack types, so a
 *  pack component is stored with these filled in, as the editor's drag and drop does. */
export function packDefaultDefinition(type: string): PackDefinition | undefined {
  if (!cached) {
    try {
      const path = resolve(dirname(fileURLToPath(import.meta.url)), '../data/pack-default-definitions.json');
      cached = (JSON.parse(readFileSync(path, 'utf8')) as { definitions: Record<string, PackDefinition> }).definitions ?? {};
      for (const [type, blanks] of Object.entries(SAMPLE_BLANKS)) {
        const def = cached[type];
        if (!def?.properties) continue;
        for (const [key, value] of Object.entries(blanks)) {
          if (key in def.properties) def.properties[key] = { ...(def.properties[key] as object), value };
        }
      }
    } catch {
      cached = {};
    }
  }
  return cached[type];
}
