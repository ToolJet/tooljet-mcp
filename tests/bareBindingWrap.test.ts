import { describe, expect, it } from 'vitest';
import { normalizeComponentSpec } from '../src/componentNormalization.js';

const value = (component: { properties: Record<string, unknown> }, key: string) =>
  (component.properties[key] as { value?: unknown } | undefined)?.value;

describe('bare expressions in true/false properties', () => {
  it('wraps a bare query expression in a loading state', () => {
    const { component, warnings } = normalizeComponentSpec({
      name: 'flightsTable',
      type: 'Table',
      properties: { loadingState: { value: 'queries.getFlightsToday.isLoading' } },
    });
    expect(value(component, 'loadingState')).toBe('{{queries.getFlightsToday.isLoading}}');
    expect(warnings.join(' ')).toMatch(/loadingState/);
  });

  it('wraps negated and compared component expressions in visibility and disable', () => {
    const { component } = normalizeComponentSpec({
      name: 'save',
      type: 'ShadButton',
      properties: {
        visibility: { value: '!components.form1.isValid' },
        disabledState: { value: "components.status.value === 'closed'" },
      },
    });
    expect(value(component, 'visibility')).toBe('{{!components.form1.isValid}}');
    expect(value(component, 'disabledState')).toBe("{{components.status.value === 'closed'}}");
  });

  it('leaves bindings, booleans and plain text alone', () => {
    const { component, warnings } = normalizeComponentSpec({
      name: 't',
      type: 'Table',
      properties: {
        loadingState: { value: '{{queries.q.isLoading}}' },
        visibility: { value: '{{true}}' },
        disabledState: { value: false },
      },
    });
    expect(value(component, 'loadingState')).toBe('{{queries.q.isLoading}}');
    expect(value(component, 'visibility')).toBe('{{true}}');
    expect(value(component, 'disabledState')).toBe(false);
    expect(warnings.join(' ')).not.toMatch(/bare expression/);
  });

  it('does not touch text properties that merely mention a query', () => {
    const { component } = normalizeComponentSpec({
      name: 'note',
      type: 'ShadText',
      properties: { text: { value: 'queries.getFlights.data' } },
    });
    expect(value(component, 'text')).toBe('queries.getFlights.data');
  });
});
