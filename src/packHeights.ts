/* A copy of tooljet-agent's page compiler model (mcp_agent/compiler/src/packHeights.ts), kept in step with it: the
   compiler saves the widgets it places at these heights, and plans written by hand (lint_app_spec, add_components) get
   the same through packFit.ts. Change both together. */
/**
 * The height a ToolJet UI 2.0 widget is drawn at in the app, for the widgets that fit their content there
 * (frontend dynamicHeightPolicy.fitsContentInView: every pack widget whose Dynamic height is not off, except the
 * box-sized ones that never measure themselves, PACK_BOX_SIZED). The editor draws the saved height, so a widget saved
 * at a catalog default left a band, or cut its content, in the editor only, and moved every section below it there
 * (a ShadStat saved at 120 drew 124, a three-row record list saved at 340 drew 188, 2026-10-22).
 *
 * Measured in the viewer (staging, 2026-10-22) in the default theme: IBM Plex Sans, ToolJet UI 2.0 type scale. A
 * widget's box adds 2px of padding a side to what it draws. Another theme's font or type scale moves these numbers;
 * text wraps by an estimate of IBM Plex Sans' average character width (0.45em, fitted to measured wraps of 14 to 36px
 * text at 240 to 480px), so a wrapped text is right at the width it is laid out for, and a narrower window wraps more.
 *
 * Returns undefined when the drawn height cannot be known here (data whose length is unknown, a widget not measured),
 * so the caller keeps its own estimate. `exact` says the result depends only on what is written (no data, no binding of
 * unknown length), so it may replace a written height too.
 */

/** What a widget's height is worked out from: its attributes as written, and the width it is drawn at. */
export interface PackHeightInput {
  type: string;
  /** A literal attribute value ('true', 'sm', '96'), or undefined when unset. An expression comes back as its source. */
  attr(key: string): string | undefined;
  /** Whether the attribute is written at all (any value, a binding too). */
  has(key: string): boolean;
  /** Display text for a text attribute, with bindings projected to a typical length; undefined when unset. */
  text(key: string): { text: string; bound: boolean } | undefined;
  /** The number of items an array attribute holds when it is known (a literal list, or seeded data), else undefined. */
  count(key: string): number | undefined;
  /** Whether the items of a literal array attribute carry a field (Timeline items with a description). */
  itemsHave(key: string, field: string): boolean;
  /** The width the widget is drawn at, in px. */
  widthPx: number;
}

export interface PackHeight {
  height: number;
  exact: boolean;
}

/** The widget box's padding on both sides (frontend appCanvasConstants BOX_PADDING, 2px a side). */
const BOX = 4;
/** IBM Plex Sans' average character width, in em. */
const CHAR_EM = 0.45;

/** Lines a text wraps to at a width (greedy by word, like the browser; a newline starts a line). */
export function wrappedLines(text: string, widthPx: number, fontPx: number): number {
  const charPx = fontPx * CHAR_EM;
  const width = Math.max(widthPx, charPx * 4);
  let total = 0;
  for (const paragraph of text.split('\n')) {
    let lines = 1;
    let used = 0;
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      // A word wider than the line breaks across lines of its own.
      const w = Math.min(word.length * charPx, width);
      const next = used === 0 ? w : used + charPx + w;
      if (next > width) {
        lines += 1;
        used = w;
      } else used = next;
    }
    total += lines;
  }
  return Math.max(1, total);
}

/** ShadText tones: font size and line height (ui2 Text.tsx classes in the default theme). */
const TEXT_TONES: Record<string, { font: number; line: number }> = {
  paragraph: { font: 14, line: 28 },
  lead: { font: 20, line: 28 },
  muted: { font: 14, line: 20 },
  small: { font: 14, line: 14 },
  large: { font: 18, line: 28 },
};
/** ShadHeading levels: font size and line height. */
const HEADING_LEVELS: Record<string, { font: number; line: number }> = {
  h1: { font: 36, line: 40 },
  h2: { font: 30, line: 36 },
  h3: { font: 24, line: 32 },
  h4: { font: 20, line: 28 },
};
/** Single-line fields with a label above the box: 40px box, 22px label band, 26px description line. */
const LABELLED_FIELDS = new Set(['ShadInput', 'ShadSelect', 'ShadDatePicker', 'ShadNumberInput', 'ShadCurrencyInput', 'ShadMultiselect',
  'ShadCombobox', 'ShadPasswordInput', 'ShadPhoneInput', 'ShadTimePicker', 'ShadDateTimePicker', 'ShadTagsInput', 'ShadOtpInput', 'ShadColorPicker']);
const FIELD_BOX = 40;
const FIELD_LABEL = 22;
const FIELD_DESCRIPTION = 26;
/** A label line (14px text) past the first, when a long label wraps. */
const FIELD_LABEL_LINE = 14;

const literal = (raw: string | undefined): string | undefined => (raw === undefined ? undefined : raw.replace(/^\{\{\s*|\s*\}\}$/g, '').trim());
const isTrue = (raw: string | undefined, fallback: boolean): boolean => {
  const v = literal(raw);
  return v === 'true' ? true : v === 'false' ? false : fallback;
};
const isNumber = (raw: string | undefined): number | undefined => {
  const v = literal(raw);
  const n = v === undefined || v === '' ? NaN : Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const shown = (input: PackHeightInput, key: string): boolean => {
  const t = input.text(key);
  return !!t && (t.bound || t.text.trim() !== '');
};

/** The drawn height, or undefined when it is not known here. */
export function drawnPackHeight(input: PackHeightInput): PackHeight | undefined {
  const { type } = input;
  // Dynamic height off: the widget keeps its box in the app too.
  if (isTrue(input.attr('dynamicHeight'), true) === false) return undefined;
  const exact = (height: number): PackHeight => ({ height: Math.round(height), exact: true });
  const estimate = (height: number): PackHeight => ({ height: Math.round(height), exact: false });
  const inner = input.widthPx - BOX;

  if (type === 'ShadText' || type === 'ShadHeading') {
    const style = type === 'ShadText'
      ? TEXT_TONES[input.attr('tone') ?? 'paragraph'] ?? TEXT_TONES.paragraph!
      : HEADING_LEVELS[input.attr('level') ?? 'h2'] ?? HEADING_LEVELS.h2!;
    const t = input.text('text');
    const lines = wrappedLines(t?.text ?? '', inner, style.font);
    const height = lines * style.line + BOX;
    return t?.bound ? estimate(height) : exact(height);
  }

  if (type === 'ShadStat') {
    // A card: 124px (sm 120, lg 132); without the card 42px less. Under the figure, a footnote adds 26px, a progress
    // bar 16px and its label 20px more, a sparkline (trendData) 46px, an icon above the label (iconPosition top) 42px.
    // A change, its label and an icon at the side draw beside the label or the figure and add nothing. Measured alone and
    // in pairs (footnote with progress, with a sparkline; progress with a sparkline): the parts add up.
    const size = input.attr('size') ?? 'default';
    let height = size === 'sm' ? 120 : size === 'lg' ? 132 : 124;
    if (!isTrue(input.attr('card'), true)) height -= 42;
    if (shown(input, 'footnote')) height += 26;
    if (input.has('progress')) height += 16 + (shown(input, 'progressLabel') ? 20 : 0);
    if (input.has('trendData')) height += 46;
    if (shown(input, 'icon') && input.attr('iconPosition') === 'top') height += 42;
    return exact(height);
  }

  if (LABELLED_FIELDS.has(type)) {
    const label = input.text('label');
    const labelLines = label && (label.bound || label.text.trim()) ? wrappedLines(label.text, inner, 14) : 0;
    const height = FIELD_BOX + (labelLines ? FIELD_LABEL + (labelLines - 1) * FIELD_LABEL_LINE : 0)
      + (shown(input, 'description') ? FIELD_DESCRIPTION : 0) + (type === 'ShadTagsInput' ? 2 : 0);
    return label?.bound ? estimate(height) : exact(height);
  }

  switch (type) {
    case 'ShadSwitch':
    case 'ShadCheckbox': {
      // A one-line label beside the control: the switch's row is 24px, the checkbox's 20. A long label wraps in 20px
      // lines beside the control (an estimate, from one measured label: 131 characters drew 3 lines at 300px), and a
      // description adds a line.
      const label = input.text('label');
      const lines = label && (label.bound || label.text.trim()) ? wrappedLines(label.text, inner - 24, 14) : 1;
      const row = type === 'ShadSwitch' ? 24 : 20;
      const height = (lines > 1 ? lines * 20 : row) + (shown(input, 'description') ? (type === 'ShadSwitch' ? 20 : 24) : 0);
      return lines > 1 || label?.bound ? estimate(height) : exact(height);
    }
    case 'ShadSlider':
      return exact(shown(input, 'label') ? 46 : 24);
    case 'ShadRating':
      return exact(shown(input, 'label') ? 46 : 24);
    case 'ShadToggleGroup':
      return exact(40);
    case 'ShadTags': {
      const size = input.attr('size') ?? 'default';
      return exact(size === 'sm' ? 24 : size === 'lg' ? 32 : 28);
    }
    case 'ShadCircularProgress':
      return exact((isNumber(input.attr('size')) ?? 96) + BOX);
    case 'ShadFileUpload':
      return exact(182);
    case 'ShadRadioGroup': {
      const label = shown(input, 'label');
      if (isTrue(input.attr('horizontal'), false)) return exact(label ? 50 : 28);
      const options = input.count('options');
      return options === undefined ? undefined : exact((label ? 26 : 4) + 24 * options);
    }
    case 'ShadAlert': {
      // 34px of padding and border, a 22px title, the description's 20px lines (14px text, 36px narrower than the box)
      // and a 44px action row.
      const description = input.text('description');
      const lines = description && (description.bound || description.text.trim()) ? wrappedLines(description.text, inner - 34, 14) : 0;
      const height = 34 + (shown(input, 'title') ? 22 : 0) + lines * 20 + (shown(input, 'actionLabel') ? 44 : 0);
      return description?.bound ? estimate(height) : exact(height);
    }
    case 'ShadSteps': {
      if ((input.attr('orientation') ?? 'horizontal') !== 'vertical') return exact(64);
      const steps = input.count('steps');
      return steps === undefined ? undefined : exact(48 * steps + BOX);
    }
    case 'ShadSummaryStrip': {
      const size = input.attr('size') ?? 'default';
      const panel = (input.attr('appearance') ?? 'panel') !== 'plain';
      return exact((size === 'sm' ? 78 : size === 'lg' ? 102 : 90) - (panel ? 0 : 2));
    }
    case 'ShadAccordion': {
      // Closed items, 53px each. One open by default shows content of unknown height.
      const open = input.count('defaultOpen');
      if (open !== undefined ? open > 0 : input.has('defaultOpen')) return undefined;
      const items = input.count('items');
      return items === undefined || items === 0 ? undefined : exact(53 * items + BOX);
    }
    case 'ShadKeyValue': {
      // 41px a row of fields, one row per `columns` fields, and 3px of dividers' border around them.
      const n = input.count('data');
      if (!n) return undefined;
      const columns = Math.max(1, isNumber(input.attr('columns')) ?? 1);
      return estimateOrExact(input, 'data', 41 * Math.ceil(n / columns) + (isTrue(input.attr('dividers'), true) ? 3 : 0));
    }
    case 'ShadRecordList': {
      // A row is 61px with its avatar (45 without, 73 comfortable, 45 compact) and 2px more with a meta line beside it;
      // the card around the rows adds 5px, a plain list 3.
      const n = input.count('data');
      if (!n) return undefined;
      const density = input.attr('density') ?? 'default';
      const avatar = isTrue(input.attr('showAvatar'), true);
      const meta = shown(input, 'metaFields');
      const row = density === 'compact' ? 45 : density === 'comfortable' ? (avatar ? 73 : 57) : avatar ? 61 + (meta ? 2 : 0) : 45;
      const chrome = (input.attr('listStyle') ?? 'card') === 'plain' ? 3 : 5;
      return estimateOrExact(input, 'data', n * row + chrome);
    }
    case 'ShadProgressList': {
      const n = input.count('data');
      if (!n) return undefined;
      const bar = input.attr('barSize') ?? 'default';
      // A row is 59.4px, a pixel more when it shows its value against a target, 4 more with a thick bar.
      const target = input.attr('targetField');
      const row = 59.4 + (target && input.itemsHave('data', target) ? 1 : 0) + (bar === 'thick' ? 4 : bar === 'thin' ? -2 : 0);
      const chrome = (input.attr('listStyle') ?? 'card') === 'plain' ? 3 : 13.6;
      return estimateOrExact(input, 'data', n * row + chrome);
    }
    case 'ShadTimeline': {
      // An item is 44px (32 compact) and 22px more for a description, or for its time on a line of its own (timePosition
      // top); the last item's 20px tail (8 compact) is not drawn.
      const n = input.count('items');
      if (!n) return undefined;
      const compact = input.attr('density') === 'compact';
      const item = (compact ? 32 : 44) + (input.itemsHave('items', 'description') ? 22 : 0)
        + (!compact && input.attr('timePosition') === 'top' ? 22 : 0);
      return estimateOrExact(input, 'items', n * item - (compact ? 8 : 20));
    }
    case 'ShadTable': {
      // 122px of toolbar, header and border, a row of 44px (36 condensed, 52 spacious), and a 16px pager once the rows
      // run past one page.
      const n = input.count('data');
      if (!n) return undefined;
      const cell = input.attr('cellSize') ?? 'regular';
      const row = cell === 'condensed' ? 36 : cell === 'spacious' ? 52 : 44;
      const paged = isTrue(input.attr('enablePagination'), true) && !isTrue(input.attr('serverSidePagination'), false);
      const perPage = Math.max(1, isNumber(input.attr('rowsPerPage')) ?? 10);
      const rows = paged ? Math.min(n, perPage) : n;
      return estimateOrExact(input, 'data', 122 + rows * row + (paged && n > perPage ? 16 : 0));
    }
    case 'ShadCardGrid': {
      // Cards of a title and a one-line description are 89px; an image adds its aspect of the card's width. Rows are 12px
      // apart, `columns` cards a row while each keeps minCardWidth.
      const n = input.count('data');
      if (!n) return undefined;
      const gap = 12;
      const columns = (input.attr('layout') ?? 'stacked') === 'row' ? 1 : Math.max(1, isNumber(input.attr('columns')) ?? 3);
      const min = isNumber(input.attr('minCardWidth')) ?? 240;
      const perRow = Math.max(1, Math.min(columns, Math.floor((input.widthPx + gap) / (min + gap))));
      const cardWidth = (input.widthPx - gap * (perRow - 1)) / perRow;
      const image = isTrue(input.attr('showImage'), true) && shown(input, 'imageField');
      const aspect = { '16/9': 9 / 16, '4/3': 3 / 4, '1/1': 1 }[input.attr('imageAspect') ?? '16/9'] ?? 9 / 16;
      const card = 89 + (image ? cardWidth * aspect : 0);
      const rows = Math.ceil(n / perRow);
      return estimate(rows * card + gap * (rows - 1));
    }
    case 'ShadImage': {
      const ratio = input.attr('aspectRatio');
      const m = ratio ? /^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(ratio) : null;
      return m ? estimate((input.widthPx * Number(m[2])) / Number(m[1])) : undefined;
    }
    default:
      return undefined;
  }
}

/** Exact when the items are written out in the markup; an estimate when they come from data (seeded rows). */
function estimateOrExact(input: PackHeightInput, key: string, height: number): PackHeight {
  const source = input.attr(key) ?? '';
  return { height: Math.round(height), exact: /^\s*(\{\{\s*)?\[/.test(source) };
}
