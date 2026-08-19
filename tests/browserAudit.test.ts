import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../skill/scripts/browser-audit.js', import.meta.url), 'utf8');

type Box = { top: number; left: number; width: number; height: number };

class FixtureElement {
  id = '';
  tagName: string;
  innerText = '';
  parentElement?: FixtureElement;
  children: FixtureElement[] = [];
  style: Record<string, string> = {};
  scrollWidth: number;
  scrollHeight: number;
  clientWidth: number;
  clientHeight: number;
  data?: unknown[];
  private box: Box;
  private attributes: Record<string, string> = {};

  constructor(tagName: string, box: Box) {
    this.tagName = tagName.toUpperCase();
    this.box = box;
    this.scrollWidth = this.clientWidth = box.width;
    this.scrollHeight = this.clientHeight = box.height;
  }

  append(child: FixtureElement) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }

  getAttribute(name: string) {
    return this.attributes[name] ?? null;
  }

  getBoundingClientRect() {
    return {
      ...this.box,
      right: this.box.left + this.box.width,
      bottom: this.box.top + this.box.height,
    };
  }

  contains(other: FixtureElement): boolean {
    for (let current = other.parentElement; current; current = current.parentElement) {
      if (current === this) return true;
    }
    return false;
  }

  querySelector() {
    return this.children.find((child) =>
      ['INPUT', 'TEXTAREA', 'SELECT', 'IMG', 'SVG', 'CANVAS', 'VIDEO'].includes(child.tagName)
    ) ?? null;
  }
}

function executeFixture() {
  const uuid = (last: string) => `00000000-0000-4000-8000-${last.padStart(12, '0')}`;
  const componentA = new FixtureElement('div', { top: 10, left: 10, width: 100, height: 100 });
  componentA.id = uuid('1');
  componentA.innerText = 'First';
  const componentB = new FixtureElement('div', { top: 60, left: 60, width: 100, height: 100 });
  componentB.id = uuid('2');
  componentB.innerText = 'Second';
  const sideBySide = new FixtureElement('div', { top: 60, left: 170, width: 100, height: 100 });
  sideBySide.id = uuid('3');
  sideBySide.innerText = 'Side by side';
  const blank = new FixtureElement('div', { top: 180, left: 10, width: 100, height: 40 });
  blank.id = uuid('4');

  const clipped = new FixtureElement('strong', { top: 230, left: 10, width: 80, height: 20 });
  clipped.innerText = 'A clipped heading';
  clipped.scrollWidth = 120;

  const button = new FixtureElement('button', { top: 850, left: 10, width: 120, height: 40 });
  button.innerText = 'Primary action';

  const scroller = new FixtureElement('div', { top: 300, left: 10, width: 300, height: 200 });
  scroller.style.overflowY = 'auto';
  scroller.scrollHeight = 500;

  const dialog = new FixtureElement('div', { top: 100, left: 300, width: 400, height: 300 });
  dialog.setAttribute('role', 'dialog');
  dialog.scrollHeight = 420;

  const chartOwner = new FixtureElement('div', { top: 520, left: 10, width: 300, height: 200 });
  chartOwner.id = uuid('5');
  chartOwner.innerText = 'Chart';
  const chart = chartOwner.append(new FixtureElement('div', { top: 520, left: 10, width: 300, height: 200 }));
  chart.data = [];

  const scrollingElement = new FixtureElement('html', { top: 0, left: 0, width: 1200, height: 800 });
  scrollingElement.clientHeight = 800;
  scrollingElement.scrollHeight = 1200;

  const components = [componentA, componentB, sideBySide, blank, chartOwner];
  const all = [...components, clipped, button, scroller, dialog, chart];
  const document = {
    scrollingElement,
    documentElement: scrollingElement,
    querySelectorAll(selector: string) {
      if (selector === '[id]') return components;
      if (selector === 'body *') return all;
      if (selector === 'button') return [button];
      if (selector === '[role="dialog"],.modal,.tj-modal') return [dialog];
      if (selector === '.js-plotly-plot') return [chart];
      if (selector.startsWith('h1,')) return [clipped, button];
      return [];
    },
  };

  return new vm.Script(source).runInNewContext({
    window: { innerWidth: 1200, innerHeight: 800 },
    document,
    location: { href: 'http://localhost/viewer' },
    getComputedStyle: (element: FixtureElement) => element.style,
  });
}

describe('one-shot browser audit helper', () => {
  it('is valid standalone JavaScript and reports the bounded audit contract', () => {
    expect(() => new vm.Script(source)).not.toThrow();
  });

  it('detects runtime geometry and render failures without vertical-only false positives', () => {
    const result = executeFixture();

    expect(result.counts).toMatchObject({
      visibleComponentInstances: 5,
      overlaps: 1,
      clippedText: 1,
      blankComponentCandidates: 1,
      innerScrollers: 1,
      nestedScrollPairs: 1,
      buttonsBelowFold: 1,
      dialogs: 1,
      chartsWithoutData: 1,
    });
    expect(result.issues.overlaps[0].overlap).toEqual({ width: 50, height: 50 });
    expect(result.issues.clippedText[0].text).toBe('A clipped heading');
    expect(result.issues.chartsWithoutData[0].component.id).toBe('00000000-0000-4000-8000-000000000005');
    expect(result.notChecked).toEqual(expect.arrayContaining(['network failures', 'mutation correctness']));
  });
});
