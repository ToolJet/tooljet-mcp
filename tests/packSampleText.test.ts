import { describe, expect, it } from 'vitest';
import { packDefaultDefinition, registerPackDefinitions } from '../src/packDefaults.js';

// SkyLine's Auto build in Ant Design (2026-11-01): the flight picker read "Department", the aircraft panel "Order details"
// and the maintenance plan's first column "Room", the pack palette's samples saved where the build set nothing.
describe('runtime pack defaults', () => {
  it('blank the sample display text and keep the rest', () => {
    registerPackDefinitions({
      Lib_test_Select: { properties: { label: { value: 'Department' }, placeholder: { value: 'Select' } } },
      Lib_test_Descriptions: { properties: { title: { value: 'Order details' }, column: { value: '{{1}}' } } },
      Lib_test_Schedule: { properties: { resourceTitle: { value: 'Room' } } },
      Lib_test_Card: { properties: { title: { value: '{{"bound"}}' } } },
    });
    expect(packDefaultDefinition('Lib_test_Select')?.properties).toEqual({ label: { value: '' }, placeholder: { value: 'Select' } });
    expect(packDefaultDefinition('Lib_test_Descriptions')?.properties?.title).toEqual({ value: '' });
    expect(packDefaultDefinition('Lib_test_Descriptions')?.properties?.column).toEqual({ value: '{{1}}' });
    expect(packDefaultDefinition('Lib_test_Schedule')?.properties?.resourceTitle).toEqual({ value: '' });
    expect(packDefaultDefinition('Lib_test_Card')?.properties?.title).toEqual({ value: '{{"bound"}}' });
  });
});
