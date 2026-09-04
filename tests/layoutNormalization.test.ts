import { describe, expect, it } from 'vitest';
import { prepareComponentBatch } from '../src/componentBatch.js';
import { normalizePlannedLayouts } from '../src/layoutNormalization.js';

describe('normalizePlannedLayouts', () => {
  it('lowers an oversized single-line control and raises a too-short Text', () => {
    const dropdown = normalizePlannedLayouts({
      name: 'ddHub', type: 'DropdownV2', layouts: { desktop: { top: 250, left: 2, width: 8, height: 62 } },
    });
    expect(dropdown.component.layouts?.desktop?.height).toBe(40);
    expect(dropdown.warnings.join(' ')).toMatch(/ddHub.*lowered desktop height 62px to the standard single-line 40px/);

    const text = normalizePlannedLayouts({
      name: 'title', type: 'Text', properties: { text: { value: 'Heading' } }, styles: { textSize: { value: 22 } },
      layout: { top: 0, left: 2, width: 20, height: 30 },
    });
    expect(text.component.layout?.height).toBe(39); // ceil(22 * 1.5 + 6)
    expect(text.warnings.join(' ')).toMatch(/raised layout height 30px/);

    const fine = normalizePlannedLayouts({ name: 'btn', type: 'Button', layout: { top: 0, left: 0, width: 6, height: 40 } });
    expect(fine.warnings).toEqual([]);
    expect(fine.component.layout?.height).toBe(40);
  });

  it('applies on the apply/add batch path, so a plan that linted clean also applies clean', () => {
    // apply_app_phase and add_component_batches prepare components through prepareComponentBatch. An
    // earlier split ran the height fix in lint only, so lint passed and apply rejected the same 62px field.
    const prepared = prepareComponentBatch([
      { client_ref: 'hub', name: 'ddHub', type: 'DropdownV2', layout: { top: 250, left: 2, width: 8, height: 62 } },
      { client_ref: 'status', name: 'ddStatus', type: 'DropdownV2', layout: { top: 250, left: 11, width: 8, height: 62 } },
    ] as never);
    expect(prepared.errors.join(' ')).not.toMatch(/exceeds the standard single-line height/);
    expect(prepared.warnings.join(' ')).toMatch(/ddHub.*lowered/);
    expect(prepared.warnings.join(' ')).toMatch(/ddStatus.*lowered/);
    for (const component of prepared.components) {
      const rect = component.layouts?.desktop ?? component.layout;
      expect(rect?.height).toBe(40);
    }
  });
});
