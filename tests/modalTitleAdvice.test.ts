import { describe, expect, it } from 'vitest';
import {
  lintModalChildren,
  lintRenderedGeometryAdvisory,
  lintRenderedGeometryBlocking,
  type LintComponent,
} from '../src/lint.js';

describe.each(['clientRef', 'persisted'] as const)('modal title advice (%s)', (mode) => {
  function fixture(bodyText: string, headerText?: string): LintComponent[] {
    const placement = (slot: 'body' | 'header'): Partial<LintComponent> => mode === 'clientRef'
      ? { parentRef: 'modal', slotName: slot }
      : { parent: slot === 'body' ? 'modal' : 'modal-header' };
    return [
      {
        ...(mode === 'clientRef' ? { clientRef: 'modal' } : { id: 'modal' }),
        name: 'contactModal', type: 'ModalV2',
        properties: { showHeader: { value: true }, showFooter: false, modalHeight: 400 },
      },
      ...(headerText === undefined ? [] : [{
        name: 'nativeTitle', type: 'Text', ...placement('header'),
        properties: { text: { value: headerText } },
        layouts: { desktop: { top: 0, left: 2, width: 30, height: 40 } },
      }]),
      {
        name: 'selectedCustomerHeading', type: 'Text', ...placement('body'),
        properties: { text: bodyText },
        styles: { textSize: { value: 24 }, fontWeight: { value: 'bold' } },
        layouts: { desktop: { top: 10, left: 2, width: 30, height: 40 } },
      },
    ];
  }

  const titles = (components: LintComponent[]) => lintModalChildren(components)
    .filter((warning) => warning.includes('title-like'));

  it.each([
    ['Contact details', 'Contact details'],
    ['<h2> CONTACT &amp; details </h2>', 'Contact & details'],
    ['<strong>Contact&nbsp; details</strong>', ' contact  details '],
    ['{{ "Contact details" }}', '<span>Contact details</span>'],
    ['Contact {{ "details" }}', '{{ `Contact details` }}'],
    ['{{ "<h2>Contact details</h2>" }}', 'Contact details'],
  ])('flags a known duplicate: %s', (body, header) => {
    const components = fixture(body, header);
    expect(titles(components)).toHaveLength(1);
    expect(titles(components)[0]).toContain('repeats the native header text');
    expect(lintRenderedGeometryBlocking(components)).toEqual([]);
    expect(lintRenderedGeometryAdvisory(components).join(' ')).toContain('title-like');
  });

  it.each(['Add contact', '<h2>Contact details</h2>', '{{ "Add a test case" }}']) (
    'advises moving a credible heading into an empty header: %s', (body) => {
      const components = fixture(body);
      expect(lintModalChildren(components).join(' ')).toContain('native header slot is empty');
      expect(titles(components)[0]).toContain('Move that Text to slot_name:"header"');
      expect(lintRenderedGeometryBlocking(components)).toEqual([]);
    },
  );

  it.each([
    'Avery Patel',
    'Acme Corp',
    'Contact history',
    'Edit this price',
    '{{components.customers.selectedRow?.name}}',
    '<h2>{{components.customers.selectedRow?.name}}</h2>',
    '{{components.customers.selectedRow?.name || "Contact details"}}',
  ])('allows a distinct record identity or heading beneath a native title: %s', (body) => {
    expect(titles(fixture(body, 'Contact details'))).toEqual([]);
  });

  it.each([
    'Add the contact details...',
    'Add the contact details',
    'Add contact details below',
    'Add a contact to continue',
    'Enter contact details',
    'Please fill in the fields',
    '<p>Add the contact details and click Save.</p>',
    '{{ "Add the contact details below" }}',
    'Mark this invoice as paid?',
  ])('does not treat instructions as a title even with heading styling: %s', (body) => {
    expect(titles(fixture(body, 'Add contact'))).toEqual([]);
    const emptyHeader = fixture(body);
    expect(titles(emptyHeader)).toEqual([]);
    expect(lintModalChildren(emptyHeader).join(' ')).toContain('native header slot is empty');
  });

  it.each([
    '{{components.customers.selectedRow?.name}}',
    '<h2>{{components.customers.selectedRow?.name}}</h2>',
    '{{components.customers.selectedRow?.name',
    '',
    '<span> </span>',
  ])('does not infer a heading from unknown or empty display text: %s', (body) => {
    expect(titles(fixture(body))).toEqual([]);
  });

  it.each(['{{ foo( }}', '{{ a + }}', '<h2>{{ "Contact" }} {{ a + }}</h2>'])(
    'leaves malformed bindings to syntax lint without throwing: %s', (text) => {
      for (const components of [fixture(text), fixture(text, 'Contact details'), fixture('Contact details', text)]) {
        expect(() => lintModalChildren(components)).not.toThrow();
        expect(titles(components)).toEqual([]);
      }
    },
  );

  it('does not equate unknown bindings by removing them', () => {
    expect(titles(fixture('Contact {{variables.customer}}', 'Contact {{variables.owner}}'))).toEqual([]);
    expect(titles(fixture('Contact details', '{{variables.title}}'))).toEqual([]);
  });

  it('does not use action verbs or component names alone as heading evidence', () => {
    const components = fixture('Add contact');
    components.at(-1)!.styles = {};
    expect(titles(components)).toEqual([]);
  });

  it('recognizes heading markup and named bold headings without a large textSize', () => {
    for (const text of ['<h2>Contact details</h2>', 'Contact details']) {
      const components = fixture(text);
      components.at(-1)!.styles = { fontWeight: 600 };
      expect(titles(components)).toHaveLength(1);
    }
  });

  it('limits title advice to the top of the body and a visible ModalV2 header', () => {
    const components = fixture('Contact details', 'Contact details');
    components.at(-1)!.layouts!.desktop!.top = 110;
    expect(titles(components)).toEqual([]);
    components.at(-1)!.layouts!.desktop!.top = 10;
    components[0]!.properties!.showHeader = { value: '{{false}}' };
    expect(titles(components)).toEqual([]);
    components[0]!.properties!.showHeader = true;
    components[0]!.type = 'Modal';
    expect(titles(components)).toEqual([]);
  });

  it('compares only the same modal header and ignores footer text', () => {
    const components = fixture('Contact details', 'Add contact');
    components.push({ ...components[1]!, name: 'otherHeader', parent: 'other-header', parentRef: 'other' });
    components.at(-1)!.properties = { text: 'Contact details' };
    components.push({ ...components[1]!, name: 'footer', slotName: 'footer', properties: { text: 'Contact details' } });
    expect(titles(components)).toEqual([]);
  });

  it('preserves blocking rendered bounds and does not mutate the input', () => {
    const components = fixture('Contact details', 'Contact details');
    components[0]!.properties!.modalHeight = 100;
    const before = structuredClone(components);
    expect(lintRenderedGeometryBlocking(components).join(' ')).toMatch(/modalHeight 100px.*needs at least 150px/);
    expect(lintRenderedGeometryBlocking(components).join(' ')).not.toContain('title-like');
    expect(components).toEqual(before);
  });
});
