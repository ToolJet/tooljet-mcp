import { describe, expect, it } from 'vitest';
import { lintComponents } from '../src/lint.js';
import { lintPlannedApp } from '../src/appSpecLint.js';

// Widget traps found in ToolJet's frontend source (2026-09-26): a plan can break these widgets silently, so the linter
// refuses them. The store unwraps a wrapped option flag only when it is falsy
// (componentsSlice: `if (keyValue?.value) keys.push('value')`), so a static {value: true} stays an object and a widget
// comparing `=== true` never sees it.
const at = (height: number, width = 20) => ({ layouts: { desktop: { top: 0, left: 1, width, height } } });
const errors = (c: Record<string, unknown>) => lintComponents([{ name: 'w', ...at(200), ...c } as never]).errors.join(' ');

describe('widget contracts in the linter', () => {
  it('RadioButton: a static preselection never shows', () => {
    const options = [{ label: 'Low', value: 'low', default: { value: true }, visible: { value: true }, disable: { value: false } }];
    expect(errors({ type: 'RadioButtonV2', properties: { advanced: { value: '{{false}}' }, options: { value: options } } })).toMatch(/preselect[\s\S]*schema/);
    expect(errors({ type: 'RadioButtonV2', properties: { advanced: { value: '{{true}}' }, schema: { value: '{{[{label:"Low",value:"low",default:true,visible:true}]}}' } } })).not.toMatch(/preselect/);
  });
  it('TreeSelect: wrapped flags in nested static options', () => {
    const options = [{ label: 'Europe', value: 'eu', children: [{ label: 'France', value: 'fr', visible: { value: false } }] }];
    expect(errors({ type: 'TreeSelect', properties: { options: { value: options } } })).toMatch(/TreeSelect[\s\S]*plain/);
  });
  it('Timer: a countdown from zero', () => {
    expect(errors({ type: 'Timer', properties: { type: { value: 'countDown' }, value: { value: '00:00:00:000' } } })).toMatch(/countDown/);
  });
  it('Pagination: a page count written as text', () => {
    expect(errors({ type: 'Pagination', properties: { numberOfPages: { value: '5' } } })).toMatch(/numberOfPages/);
    expect(errors({ type: 'Pagination', properties: { numberOfPages: { value: '{{5}}' } } })).not.toMatch(/numberOfPages/);
  });
  it('RangeSlider: enableTwoHandle is a mode name, not a boolean', () => {
    expect(errors({ type: 'RangeSliderV2', properties: { enableTwoHandle: { value: '{{true}}' } } })).toMatch(/rangeSlider/);
  });
  it('Navigation: an item written visible true is hidden', () => {
    const items = [{ id: 'a', label: 'Overview', visible: { value: true } }];
    expect(errors({ type: 'Navigation', properties: { menuItems: { value: items } } })).toMatch(/Navigation[\s\S]*\{\{false\}\}/);
    expect(errors({ type: 'Navigation', properties: { menuItems: { value: [{ id: 'a', label: 'Overview', visible: { value: '{{false}}' } }] } } })).not.toMatch(/Navigation/);
  });
  it('device and file widgets below their height', () => {
    expect(lintComponents([{ name: 'q', type: 'QrScanner', ...at(170, 20) } as never]).errors.join(' ')).toMatch(/QrScanner[\s\S]*height/);
    expect(lintComponents([{ name: 'c', type: 'Camera', ...at(170, 30) } as never]).errors.join(' ')).toMatch(/Camera[\s\S]*height/);
    expect(lintComponents([{ name: 'f', type: 'FilePicker', ...at(90, 20) } as never]).errors.join(' ')).toMatch(/FilePicker[\s\S]*height/);
  });
});

describe('QrScanner onDetect in a plan', () => {
  const plan = (action: Record<string, unknown>) => lintPlannedApp({
    app_id: 'a', version_id: 'v',
    pages: [{ clientRef: 'p', name: 'P', icon: 'IconHome', components: [{ name: 'scan', clientRef: 'scan', type: 'QrScanner', ...at(560, 20) }] }],
    events: [{ sourceRef: 'scan', sourceType: 'component', trigger: 'onDetect', action }],
  } as never);
  it('needs a debounce, or it reads the previous scan', () => {
    expect(plan({ actionId: 'set-custom-variable', key: 'code', value: '{{components.scan.lastDetectedValue}}' }).errors.join(' ')).toMatch(/debounce/);
    expect(plan({ actionId: 'set-custom-variable', key: 'code', value: '{{components.scan.lastDetectedValue}}', debounce: '300' }).errors.join(' ')).not.toMatch(/debounce/);
  });
});
