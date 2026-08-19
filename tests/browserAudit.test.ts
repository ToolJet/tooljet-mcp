import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../skill/scripts/browser-audit.js', import.meta.url), 'utf8');

describe('one-shot browser audit helper', () => {
  it('is valid standalone JavaScript and reports the bounded audit contract', () => {
    expect(() => new vm.Script(source)).not.toThrow();
    for (const key of [
      'visibleComponentInstances',
      'overlaps',
      'clippedText',
      'blankComponentCandidates',
      'nestedScrollPairs',
      'buttonsBelowFold',
      'chartsWithoutData',
      'notChecked',
    ]) {
      expect(source).toContain(key);
    }
    expect(source).toMatch(/xOverlap > 1 && yOverlap > 1/);
    expect(source).toMatch(/limit = 120/);
  });
});
