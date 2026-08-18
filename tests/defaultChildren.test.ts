import { describe, expect, it } from 'vitest';
import { materializeRequiredDefaultChildren } from '../src/defaultChildren.js';

describe('materializeRequiredDefaultChildren', () => {
  it('creates catalog card children for a Kanban that would otherwise render blank cards', () => {
    const result = materializeRequiredDefaultChildren([{
      name: 'ticketBoard',
      type: 'Kanban',
      properties: { cardData: { value: '{{queries.tickets.data}}' } },
      layout: { top: 10, left: 2, width: 39, height: 490 },
    }]);

    expect(result.materializedChildren).toBe(2);
    expect(result.components).toHaveLength(3);
    const [kanban, title, description] = result.components;
    expect(kanban.clientRef).toMatch(/^__mcp_default_parent_/);
    expect(title).toMatchObject({
      name: 'ticketBoardCardTitle',
      type: 'Text',
      parentRef: kanban.clientRef,
      properties: { text: { value: '{{cardData.title}}' } },
      styles: { fontWeight: { value: 'bold' }, textSize: { value: 16 } },
      layout: { top: 20, left: 4, height: 30 },
    });
    expect(title.layout?.width).toBeCloseTo((6 * 100) / 43);
    expect(description).toMatchObject({
      name: 'ticketBoardCardDescription',
      type: 'Text',
      parentRef: kanban.clientRef,
      properties: { text: { value: '{{cardData.description}}' } },
      layout: { top: 50, left: 4, height: 30 },
    });
    expect(result.warnings.join(' ')).toMatch(/materialized 2 catalog default children/i);
  });

  it('does not add defaults when a custom Kanban child is supplied', () => {
    const input = [
      { name: 'ticketBoard', type: 'Kanban', properties: {}, clientRef: 'board' },
      {
        name: 'ticketCard',
        type: 'Html',
        parentRef: 'board',
        properties: { rawHtml: { value: '<div>{{cardData.title}}</div>' } },
        layout: { top: 10, left: 4, width: 290, height: 80 },
      },
    ];

    const result = materializeRequiredDefaultChildren(input);

    expect(result.components).toEqual(input);
    expect(result.materializedChildren).toBe(0);
    expect(result.warnings).toEqual([]);
  });

  it('does not instantiate optional defaults for unrelated containers', () => {
    const input = [{ name: 'panel', type: 'Container', properties: {} }];
    expect(materializeRequiredDefaultChildren(input)).toEqual({
      components: input,
      warnings: [],
      materializedChildren: 0,
    });
  });
});
