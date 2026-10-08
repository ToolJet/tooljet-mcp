import { describe, expect, it } from 'vitest';
import { lintComponents } from '../src/lint.js';
import { lintPlannedApp } from '../src/appSpecLint.js';

// ToolJet's Form submits when the Button whose component id is buttonToSubmit is clicked (Form.jsx). A plan cannot
// know that id before apply, so it names the Button by its client_ref and createComponents resolves it; lint makes
// sure the name is a Button inside that Form.
describe('lint of a Form button to submit', () => {
  const form = (buttonToSubmit: unknown) => ({ name: 'f', type: 'Form', clientRef: 'f', properties: { buttonToSubmit: { value: buttonToSubmit } } });
  const button = (name: string, parentRef?: string, slotName?: string) =>
    ({ name, type: 'Button', clientRef: name, parentRef, slotName, properties: {} });
  const submitErrors = (components: unknown[]) => lintComponents(components as never).errors.filter((e) => /buttonToSubmit/.test(e));

  it('accepts a Button in the form, by client_ref, in its body, header or footer', () => {
    expect(submitErrors([form('go'), button('go', 'f')])).toEqual([]);
    expect(submitErrors([form('go'), button('go', 'f', 'footer')])).toEqual([]);
    expect(submitErrors([form('go'), button('go', 'f', 'header')])).toEqual([]);
  });
  it('accepts a persisted parent written as the form id with its slot suffix', () => {
    const persisted = { id: 'form-id', name: 'f', type: 'Form', properties: { buttonToSubmit: { value: 'go' } } };
    expect(submitErrors([persisted, { name: 'go', type: 'Button', parent: 'form-id-footer', properties: {} }])).toEqual([]);
  });
  it('accepts an existing Button id, a binding and "none", and a form without the property', () => {
    expect(submitErrors([form('0b6b1c8e-7d0e-4a57-9d0c-2f8a1d3c4b5e')])).toEqual([]);
    expect(submitErrors([form('{{components.x.id}}')])).toEqual([]);
    expect(submitErrors([form('none')])).toEqual([]);
    expect(submitErrors([{ name: 'f', type: 'Form', properties: {} }])).toEqual([]);
  });
  it('refuses a name that is not a Button inside that form', () => {
    expect(submitErrors([form('go'), button('go')]).join(' ')).toMatch(/must name a Button inside this Form/);
    expect(submitErrors([form('nope')])).toHaveLength(1);
    expect(submitErrors([form('go'), { name: 'go', type: 'Text', clientRef: 'go', parentRef: 'f', properties: {} }])).toHaveLength(1);
    expect(submitErrors([form('go'), button('go', 'otherForm')])).toHaveLength(1);
  });
  it('does not also report the catalog allowed values for buttonToSubmit', () => {
    const errors = lintComponents([form('go'), button('go', 'f', 'footer')] as never).errors;
    expect(errors.join(' ')).not.toMatch(/buttonToSubmit/);
  });
});

// lintPlannedApp takes the plan as lint_app_spec maps it (camelCase refs).
describe('a plan with a Form that submits through its footer Button', () => {
  it('lints clean', () => {
    const result = lintPlannedApp({
      pages: [{ name: 'Shipments', icon: 'IconTruck', components: [
        { clientRef: 'f', name: 'newShipment', type: 'Form', properties: { buttonToSubmit: 'submitShipment', showHeader: false }, layout: { top: 10, left: 1, width: 20, height: 300 } },
        { clientRef: 'recipient', name: 'recipient', type: 'TextInput', parentRef: 'f', properties: { label: 'Recipient' }, styles: { alignment: 'top' }, layout: { top: 10, left: 1, width: 30, height: 40 } },
        { clientRef: 'submitShipment', name: 'submitShipment', type: 'Button', parentRef: 'f', slotName: 'footer', properties: { text: 'Create' }, layout: { top: 5, left: 30, width: 10, height: 40 } },
      ] }],
    } as never);
    expect(result.errors.filter((e) => /buttonToSubmit|allowed/i.test(e))).toEqual([]);
  });
  it('is refused when buttonToSubmit names a Button outside the Form', () => {
    const result = lintPlannedApp({
      pages: [{ name: 'Shipments', icon: 'IconTruck', components: [
        { clientRef: 'f', name: 'newShipment', type: 'Form', properties: { buttonToSubmit: 'submitShipment' }, layout: { top: 10, left: 1, width: 20, height: 300 } },
        { clientRef: 'submitShipment', name: 'submitShipment', type: 'Button', properties: { text: 'Create' }, layout: { top: 320, left: 1, width: 10, height: 40 } },
      ] }],
    } as never);
    expect(result.errors.join(' ')).toMatch(/buttonToSubmit "submitShipment" must name a Button inside this Form/);
  });
});
