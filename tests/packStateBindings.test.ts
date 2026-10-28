import { describe, expect, it } from 'vitest';
import { loadInstalledPacks, type InstalledLibrary } from '../src/packCatalog.js';
import { lintComponentStateBindings } from '../src/componentStateBindings.js';

// An edit reads the app's widgets back as pack types (Lib_<pack>_<Component>). A technician sheet bound to the card
// grid's selectedCardId, which the pack does not publish, always showed the first technician, and validate_app passed
// (staging, 2026-10-28).
const library: InstalledLibrary = {
  id: 'lib-1',
  name: 'shadcn UI',
  correlationId: 'corr-1',
  revisions: [{ version: '2.1.33' }],
  manifest: {
    manifestVersion: 2,
    pack: 'shadcn',
    components: {
      CardGrid: {
        props: [
          { name: 'data', type: 'array', default: [] },
          { name: 'selectedItemId', type: 'string', default: '', inspector: 'hidden' },
          { name: 'selectedItem', type: 'object', default: {}, inspector: 'hidden' },
          { name: 'selectedItemIndex', type: 'number', default: -1, inspector: 'hidden' },
        ],
      },
    },
  },
};

describe('a pack widget read through a name it does not publish', () => {
  const components = [{ id: 'g', name: 'teamGrid', type: 'Lib_shadcn_CardGrid' }];

  it('rejects the invented name and points at the one the pack publishes', async () => {
    await loadInstalledPacks(async () => [library]);
    const errors = lintComponentStateBindings(
      '{{ (queries.techCards.data.find(t => t.id === components.teamGrid.selectedCardId) || {}).full_name }}',
      components,
      'techSheetName',
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Lib_shadcn_CardGrid "teamGrid" has no selectedCardId');
    expect(errors[0]).toContain('components.teamGrid.selectedItemId');
  });

  it('accepts what the pack publishes and the values every component has', async () => {
    await loadInstalledPacks(async () => [library]);
    for (const value of [
      '{{ components.teamGrid.selectedItemId }}',
      '{{ components.teamGrid.selectedItem.full_name }}',
      '{{ components.teamGrid.isVisible && components.teamGrid.id }}',
    ]) expect(lintComponentStateBindings(value, components, 'p')).toEqual([]);
  });
});
