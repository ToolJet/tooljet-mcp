import { describe, expect, it, vi } from 'vitest';
import { lintComponentSlots } from '../src/lint.js';
import { lintPlannedApp } from '../src/appSpecLint.js';
import { validatePersistedAppSummary } from '../src/appValidation.js';
import { updateComponentsTool } from '../src/tools/updateComponents.js';

// 2026-11-13: validate_app and lint_app_spec passed apps whose pack children can never render: a child of a pack
// component that draws no canvas (a Button), and a child saved on a pack container's bare id, which update_components
// itself wrote when a child was moved under a pack container without slot_name. A pack draws a canvas only on
// "<id>-<slot>", its body on "<id>-body" (packSlots.test.ts: SkyLine's Ant Card children on the bare id never drew).
const ID = 'cccccccc-3333-4333-8333-cccccccccccc';
const button = { id: ID, name: 'btn', type: 'Lib_shadcn_Button', properties: {} };
const card = { id: ID, name: 'crd', type: 'Lib_shadcn_Card', properties: {} };
const kid = (parent: string) => ({ id: 'id-kid', name: 'kid', type: 'Text', parent });
const persisted = (components: unknown[]) =>
  validatePersistedAppSummary({ app_id: 'a', queries: [], events: [], pages: [{ id: 'home', name: 'Home', handle: 'home', components }] } as never);

describe('a child of a pack component that draws no canvas', () => {
  it('is refused', () => {
    const errors = lintComponentSlots([button, kid(`${ID}-body`)] as never);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/"kid".*"btn".*no canvas/);
  });

  it('is refused in a plan (lint_app_spec)', () => {
    const result = lintPlannedApp({ pages: [{ clientRef: 'home', name: 'Home', icon: 'IconHome2', components: [
      { clientRef: 'b', name: 'btn', type: 'Lib_shadcn_Button', properties: {}, layout: { left: 0, top: 0, width: 10, height: 40 } },
      { name: 'kid', type: 'Text', parentRef: 'b', properties: { text: 'x' }, layout: { left: 0, top: 0, width: 5, height: 30 } },
    ] }] } as never);
    expect(result.errors.join(' ')).toMatch(/"kid".*"btn".*no canvas/);
  });

  it('is reported by validate_app', () => {
    expect(persisted([button, kid(`${ID}-body`)]).errors.join(' ')).toMatch(/"kid".*no canvas/);
  });
});

describe('a child saved on a pack container bare id', () => {
  it('is reported by validate_app', () => {
    expect(persisted([card, kid(ID)]).errors.join(' ')).toMatch(/"kid".*"crd".*slot_name/);
  });

  it('is not reported on the container body canvas', () => {
    expect(persisted([card, kid(`${ID}-body`)]).errors.join(' ')).not.toMatch(/"kid"/);
  });
});

describe('update_components moving a child under a pack container', () => {
  const move = (container: Record<string, unknown>, update: Record<string, unknown>) => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue({ app_id: 'a', queries: [], events: [], pages: [{ id: 'home', name: 'Home', components: [container, { id: 'id-kid', name: 'kid', type: 'Text' }] }] }),
      updateComponents: vi.fn().mockResolvedValue({ updated: 1 }),
      updateLayouts: vi.fn(),
    };
    const result = updateComponentsTool(client as never).handler({ app_id: 'a', version_id: 'v', page_id: 'home', updates: [{ component_id: 'kid', ...update }] } as never);
    return { client, result };
  };

  it('puts it on the body canvas when no slot is named, not the bare id', async () => {
    const { client, result } = move(card, { parent: 'crd' });
    const out = await result;
    expect(out.isError, String(out.content[0]!.text)).toBeFalsy();
    const written = client.updateComponents.mock.calls[0]![0].updates[0];
    expect(written.parent).toBe(`${ID}-body`);
  });

  it('refuses it under a Stepper, which has no body, naming the steps', async () => {
    const stepper = { id: ID, name: 'stp', type: 'Lib_shadcn_Stepper', properties: { steps: { value: [{ id: 'account' }] } } };
    const { client, result } = move(stepper, { parent: 'stp' });
    const out = await result;
    expect(out.isError).toBe(true);
    expect(String(out.content[0]!.text)).toMatch(/step_account/);
    expect(client.updateComponents).not.toHaveBeenCalled();
  });
});
