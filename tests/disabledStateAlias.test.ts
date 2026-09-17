import { describe, expect, it } from 'vitest';
import { normalizeComponentSpec } from '../src/componentNormalization.js';
import { lintComponentSpec } from '../src/lint.js';

describe('disabled state authoring alias', () => {
  it('preserves a Button eligibility guard instead of stripping isDisabled', () => {
    const guard = { value: "{{!variables.recordId || queries.save.isLoading}}" };
    const result = normalizeComponentSpec({
      type: 'Button', name: 'save', properties: { text: 'Save', isDisabled: guard },
    }, { stripUnknownKeys: true });
    expect(result.component.properties?.disabledState).toEqual(guard);
    expect(result.component.properties).not.toHaveProperty('isDisabled');
  });

  it('does not overwrite an explicitly authored canonical guard', () => {
    const result = normalizeComponentSpec({
      type: 'Button', name: 'save', properties: { isDisabled: true, disabledState: false },
    }, { stripUnknownKeys: true });
    expect(result.component.properties?.disabledState).toEqual({ value: false });
  });

  it('gives a precise correction on paths that lint before normalization', () => {
    const result = lintComponentSpec({
      type: 'Button', name: 'save', properties: { isDisabled: { value: true } },
    });
    expect(result.errors.join(' ')).toMatch(/isDisabled.*disabledState/);
  });
});
