import { describe, expect, it } from 'vitest';
import type { AppSummary, EventSpec } from '../src/tooljetClient.js';
import { UI2_RENAMES, retiredUi2Name } from '../src/ui2LegacyNames.js';
import { getComponentSchema } from '../src/catalog.js';
import { validateEvents } from '../src/eventValidation.js';
import { lintComponentStateBindings } from '../src/componentStateBindings.js';
import { lintComponentSpec } from '../src/lint.js';
import { normalizeComponentSpec } from '../src/componentNormalization.js';

// ToolJet settled the UI 2.0 widgets' names (Widgets/Shadcn/NAMING.md, legacyNames.ts). An agent that writes an old
// name from older docs or memory is told the new one instead of a bare "not valid".
describe('UI 2.0 retired names table', () => {
  it('maps own and common renames, and nothing for other types', () => {
    expect(retiredUi2Name('ShadCardGrid', 'events', 'onCardClick')).toBe('onCardClicked');
    expect(retiredUi2Name('ShadSelect', 'actions', 'visibility')).toBe('setVisibility');
    expect(retiredUi2Name('ShadImage', 'properties', 'src')).toBe('source');
    expect(retiredUi2Name('ShadCardGrid', 'events', 'onCardClicked')).toBeUndefined();
    expect(retiredUi2Name('Button', 'actions', 'visibility')).toBeUndefined();
    expect(retiredUi2Name('ShadSelect', 'events', 'toString')).toBeUndefined();
  });

  it('agrees with the catalog: every replacement is current and no retired name still is', () => {
    const current = (type: string) => {
      const schema = getComponentSchema(type)!;
      return {
        events: new Set(schema.events?.map((e) => e.id)),
        actions: new Set(schema.actions?.map((a) => a.handle)),
        exposed: new Set(schema.exposedVariables?.map((v) => v.name)),
        properties: new Set(schema.properties.map((p) => p.key)),
      };
    };
    for (const [type, renames] of Object.entries(UI2_RENAMES)) {
      expect(getComponentSchema(type), type).toBeTruthy();
      const names = current(type);
      for (const [kind, table] of Object.entries(renames) as Array<[keyof typeof names, Record<string, string>]>) {
        for (const [old, next] of Object.entries(table)) {
          expect(names[kind].has(next.split('.')[0]!), `${type} ${kind} ${next}`).toBe(true);
          expect(names[kind].has(old), `${type} ${kind} ${old} is retired`).toBe(false);
        }
      }
    }
  });
});

const app = (): AppSummary => ({
  app_id: 'app', version_id: 'v1',
  pages: [{ id: 'page', name: 'Home', handle: 'home', components: [
    { id: 'grid', name: 'recipes', type: 'ShadCardGrid' },
    { id: 'save', name: 'saveButton', type: 'ShadButton' },
    { id: 'list', name: 'orders', type: 'ShadRecordList' },
  ] }],
  queries: [],
  events: [],
});

describe('retired UI 2.0 names in events, bindings and properties', () => {
  it('names the new event id for a retired trigger', () => {
    const event: EventSpec = { sourceId: 'grid', sourceType: 'component', trigger: 'onCardClick', action: { actionId: 'show-alert', message: 'hi' } };
    const errors = validateEvents(app(), [event]).errors.join(' ');
    expect(errors).toMatch(/ShadCardGrid event "onCardClick" was renamed "onCardClicked"/);
  });

  it('names the new handle for a retired control-component action', () => {
    const event: EventSpec = {
      sourceId: 'grid', sourceType: 'component', trigger: 'onCardClicked',
      action: { actionId: 'control-component', componentId: 'save', componentSpecificActionHandle: 'visibility', componentSpecificActionParams: [] },
    };
    const errors = validateEvents(app(), [event]).errors.join(' ');
    expect(errors).toMatch(/ShadButton action "visibility" was renamed "setVisibility"/);
  });

  it('rejects a retired exposed value or action read in a binding or RunJS code', () => {
    const components = app().pages[0]!.components;
    expect(lintComponentStateBindings('{{components.orders.selectedRecord?.id}}', components, 'Text.p').join(' '))
      .toMatch(/ShadRecordList "orders" exposes selectedItem, not selectedRecord/);
    expect(lintComponentStateBindings('await components.saveButton.disable(true);', components, 'Query.code').join(' '))
      .toMatch(/action disable\(\) was renamed setDisable\(\)/);
    expect(lintComponentStateBindings('{{components.orders.selectedItem.id}}', components, 'Text.p')).toEqual([]);
    expect(lintComponentStateBindings('{{components.recipes.isVisible}}', components, 'Text.p')).toEqual([]);
  });

  it('names the new key for a retired property and keeps it through normalization so lint can say so', () => {
    const image = {
      name: 'hero', type: 'ShadImage',
      properties: { src: { value: 'https://example.com/a.png' }, alt: { value: 'A dish' } },
      layout: { top: 0, left: 0, width: 20, height: 200 },
    };
    const normalized = normalizeComponentSpec(image as never, { stripUnknownKeys: true });
    expect(Object.keys(normalized.component.properties ?? {})).toEqual(expect.arrayContaining(['src', 'alt']));
    const errors = lintComponentSpec(normalized.component as never).errors.join(' ');
    expect(errors).toMatch(/ShadImage property "src" was renamed "source"/);
    expect(errors).toMatch(/ShadImage property "alt" was renamed "alternativeText"/);
  });
});
