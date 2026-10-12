import { describe, expect, it } from 'vitest';
import { lintPhotolessCardGrids } from '../src/cardGridPhotoLint.js';

const grid = (name: string, props: Record<string, string>) => ({
  name,
  type: 'ShadCardGrid',
  properties: Object.fromEntries(Object.entries(props).map(([k, v]) => [k, { value: v }])),
});

describe('lintPhotolessCardGrids', () => {
  // Recipe build (2026-10-12): Luna's recipe cards had no imageField; the builds with food photos scored higher, and the
  // blind review marked Luna's down for "there is no imagery". Checked photos exist for food, rooms, boats and pets.
  it('flags a recipe, room, boat or pet card grid without pictures, naming the subject', () => {
    const w = lintPhotolessCardGrids([grid('recipeCards', { titleField: 'recipe_name', imageField: '' })]);
    expect(w).toHaveLength(1);
    expect(w[0]).toContain('recipeCards');
    expect(w[0]).toContain('food');
    expect(w[0]).toContain('authoringHints.photos');
    expect(lintPhotolessCardGrids([grid('roomGrid', { titleField: 'name' })])[0]).toContain('rooms and offices');
    expect(lintPhotolessCardGrids([grid('charters', { titleField: 'vessel_name' })])[0]).toContain('boats');
    expect(lintPhotolessCardGrids([grid('petCards', { titleField: 'name' })])[0]).toContain('pets');
  });

  it('says nothing when the grid has pictures or its subject has none to offer', () => {
    expect(lintPhotolessCardGrids([grid('recipeCards', { titleField: 'name', imageField: 'photo_url' })])).toEqual([]);
    expect(lintPhotolessCardGrids([grid('taskCards', { titleField: 'title' })])).toEqual([]);
    // Words that only look like a subject: a help desk, a truck fleet, a category.
    expect(lintPhotolessCardGrids([grid('helpdeskTickets', { titleField: 'subject' }), grid('fleetTrucks', { titleField: 'plate' }), grid('categoryCards', { titleField: 'category' })])).toEqual([]);
    expect(lintPhotolessCardGrids([{ name: 'recipes', type: 'Table', properties: {} }])).toEqual([]);
  });
});
