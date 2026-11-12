import { describe, expect, it, vi } from 'vitest';
import type { Auth } from '../src/auth.js';
import type { Config } from '../src/config.js';
import { decodeComponentParent, encodeComponentParent, isPackContainerType } from '../src/componentParent.js';
import { createClient } from '../src/tooljetClient.js';

// SkyLine in Ant Design (2026-11-01): an Ant Card's Statistic and Sparkline were saved with the bare card id and never
// drew. A pack widget draws each slot, its body included, on the canvas "<id>-<slot>" (SdkComponentHost renderSlot),
// while ToolJet's own containers keep body children on the bare id.
describe('pack widget slots', () => {
  const card = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
  it('suffix the body under a pack widget only', () => {
    expect(encodeComponentParent(card, 'body', 'Lib_antd_Card')).toBe(`${card}-body`);
    expect(encodeComponentParent(card, 'body', 'PackComponent')).toBe(`${card}-body`);
    expect(encodeComponentParent(card, 'body', 'FlexContainer')).toBe(card);
    expect(encodeComponentParent(card, 'body')).toBe(card);
    expect(encodeComponentParent(card, 'header', 'ModalV2')).toBe(`${card}-header`);
  });
  // Claude Code's SkyLine run left slot_name out, body being the default, and every card on all five pages drew empty
  it('suffix the body under a pack widget when no slot is named', () => {
    expect(encodeComponentParent(card, undefined, 'PackComponent')).toBe(`${card}-body`);
    expect(encodeComponentParent(card, undefined, 'FlexContainer')).toBe(card);
  });
  it('decode the body canvas back to its parent', () => {
    expect(decodeComponentParent(`${card}-body`)).toEqual({ parentId: card, slotName: 'body' });
    expect(encodeComponentParent(`${card}-body`, 'body', 'Lib_antd_Modal')).toBe(`${card}-body`);
  });
  it('know the pack types', () => {
    expect(isPackContainerType('Lib_mui_Card')).toBe(true);
    expect(isPackContainerType('LibraryComponent')).toBe(true);
    expect(isPackContainerType('ModalV2')).toBe(false);
  });
});

// Review, 2026-11-11: a child added to a pack card already on the page was saved on the bare card id (only the batch's
// own types were known), so it saved and never drew inside the card.
describe('a child added to a pack widget already on the page', () => {
  const card = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
  const write = async (slotName?: 'body') => {
    const diffs: Array<Record<string, { parent?: string }>> = [];
    const authedFetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/components') && init?.method === 'POST') diffs.push(JSON.parse(String(init.body)).diff);
      return new Response('{}', { status: 200 });
    });
    const client = createClient({ authedFetch } as unknown as Auth, {} as Config);
    await client.createComponents({
      appId: 'a1', versionId: 'v1', pageId: 'p1',
      pageComponents: [{ id: card, type: 'PackComponent' }],
      components: [{ name: 'note', type: 'Text', parent: card, ...(slotName ? { slotName } : {}), properties: {}, layout: { top: 0, left: 0, width: 4, height: 4 } } as never],
    });
    return Object.values(diffs[0]!)[0]!.parent;
  };
  it('goes on its body canvas when no slot is named', async () => {
    expect(await write()).toBe(`${card}-body`);
  });
  it('goes on its body canvas when the body slot is named', async () => {
    expect(await write('body')).toBe(`${card}-body`);
  });
});
