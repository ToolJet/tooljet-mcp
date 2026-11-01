import { describe, expect, it } from 'vitest';
import { decodeComponentParent, encodeComponentParent, isPackContainerType } from '../src/componentParent.js';

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
