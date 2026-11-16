import { describe, expect, it } from 'vitest';
import { lintPlannedApp } from '../src/appSpecLint.js';

// Review, PR #142: slot_name takes any identifier, for a pack container's own canvases. A plan that parents a child to a
// component already on the page by its id was checked without that parent, so "content" under a ToolJet Container
// passed lint and the child was saved where nothing draws it. (lint_app_spec hands lintPlannedApp slot_name as slotName.)
const CONTAINER = 'cccccccc-1111-4111-8111-cccccccccccc';
const TABS = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const existing = {
  app_id: 'app1',
  version_id: 'v1',
  queries: [],
  events: [],
  pages: [
    {
      id: 'home',
      name: 'Home',
      handle: 'home',
      components: [
        { id: CONTAINER, name: 'box', type: 'Container', properties: {}, layouts: { desktop: { top: 0, left: 0, width: 20, height: 300 } } },
        {
          id: TABS,
          name: 'tabs',
          type: 'Lib_shadcn_TabsContainer',
          properties: { tabs: { value: [{ id: 'details', label: 'Details' }] } },
          layouts: { desktop: { top: 400, left: 0, width: 20, height: 300 } },
        },
      ],
    },
  ],
};
const lintChild = (parent: string, slotName: string) =>
  lintPlannedApp(
    {
      pages: [
        {
          client_ref: 'home',
          name: 'Home',
          icon: 'IconHome2',
          components: [
            { name: 'note', type: 'Text', parent, slotName, properties: { text: 'Hi' }, layout: { top: 10, left: 1, width: 10, height: 40 } },
          ],
        },
      ],
    } as never,
    existing as never
  );
const slotErrors = (result: { errors: string[] }) => result.errors.filter((e) => e.includes('"note"') && /slot|canvas/.test(e));

describe('a planned child of a component already on the page', () => {
  it('is refused on a canvas a ToolJet Container does not draw', () => {
    expect(slotErrors(lintChild(CONTAINER, 'content'))).toHaveLength(1);
  });

  it('is refused on a tab a pack TabsContainer does not have', () => {
    expect(slotErrors(lintChild(TABS, 'tab_gone'))).toHaveLength(1);
  });

  it('is accepted on a canvas its parent draws', () => {
    expect(slotErrors(lintChild(CONTAINER, 'body'))).toEqual([]);
    expect(slotErrors(lintChild(TABS, 'tab_details'))).toEqual([]);
  });
});
