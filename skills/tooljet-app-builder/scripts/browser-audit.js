(() => {
  const scanLimit = 240;
  const detailLimit = 12;
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const scrollingElement = document.scrollingElement || document.documentElement;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const rect = (element) => {
    const value = element.getBoundingClientRect();
    return {
      top: Math.round(value.top),
      left: Math.round(value.left),
      right: Math.round(value.right),
      bottom: Math.round(value.bottom),
      width: Math.round(value.width),
      height: Math.round(value.height),
    };
  };
  const visible = (element) => {
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 &&
      box.width > 0 && box.height > 0;
  };
  const label = (element) => ({
    id: element.id || undefined,
    tag: element.tagName.toLowerCase(),
    text: (element.innerText || element.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 100),
    rect: rect(element),
  });
  const detail = (items) => items.slice(0, detailLimit);

  // ToolJet can render more than one DOM wrapper with the same component UUID (notably a ModalV2
  // trigger shell plus its portal body). Keep the largest visible representative so counts and
  // overlap reports describe logical components instead of implementation wrappers.
  const rawComponentElements = [...document.querySelectorAll('[id]')]
    .filter((element) => uuid.test(element.id) && visible(element));
  const componentById = new Map();
  for (const element of rawComponentElements) {
    const box = element.getBoundingClientRect();
    const area = box.width * box.height;
    const current = componentById.get(element.id);
    if (!current || area > current.area) componentById.set(element.id, { element, area });
  }
  const componentElements = [...componentById.values()].map(({ element }) => element).slice(0, scanLimit);
  const components = componentElements.map((element) => ({ key: element.id, ...label(element) }));

  // A visible modal intentionally covers the underlying page. Compare geometry only within the
  // same dialog/portal layer so the audit still catches collisions inside a modal without reporting
  // the modal-versus-page overlay as dozens of false positives.
  const dialogElements = [...document.querySelectorAll('[role="dialog"],.modal,.tj-modal')].filter(visible);
  const dialogSet = new Set(dialogElements);
  const dialogOwner = (element) => {
    for (let current = element; current; current = current.parentElement) {
      if (dialogSet.has(current)) return current;
    }
    return undefined;
  };

  const overlaps = [];
  for (let leftIndex = 0; leftIndex < componentElements.length; leftIndex += 1) {
    const left = componentElements[leftIndex];
    const leftRect = left.getBoundingClientRect();
    for (let rightIndex = leftIndex + 1; rightIndex < componentElements.length; rightIndex += 1) {
      const right = componentElements[rightIndex];
      if (left.contains(right) || right.contains(left) || dialogOwner(left) !== dialogOwner(right)) continue;
      const rightRect = right.getBoundingClientRect();
      const xOverlap = Math.min(leftRect.right, rightRect.right) - Math.max(leftRect.left, rightRect.left);
      const yOverlap = Math.min(leftRect.bottom, rightRect.bottom) - Math.max(leftRect.top, rightRect.top);
      if (xOverlap > 1 && yOverlap > 1) {
        overlaps.push({
          first: label(left),
          second: label(right),
          overlap: { width: Math.round(xOverlap), height: Math.round(yOverlap) },
        });
        if (overlaps.length >= scanLimit) break;
      }
    }
    if (overlaps.length >= scanLimit) break;
  }

  const scrollable = (element) => {
    if (element === scrollingElement) return element.scrollHeight > viewport.height + 2;
    if (!visible(element)) return false;
    const style = getComputedStyle(element);
    return /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 2;
  };
  const innerScrollers = [...document.querySelectorAll('body *')].filter(scrollable).slice(0, scanLimit);
  const pageScrolls = scrollingElement.scrollHeight > viewport.height + 2;
  const nestedScrollPairs = pageScrolls
    ? innerScrollers.map((inner) => ({ outer: 'document', inner: label(inner) }))
    : [];
  for (let outerIndex = 0; outerIndex < innerScrollers.length; outerIndex += 1) {
    for (let innerIndex = 0; innerIndex < innerScrollers.length; innerIndex += 1) {
      if (outerIndex === innerIndex) continue;
      const outer = innerScrollers[outerIndex];
      const inner = innerScrollers[innerIndex];
      if (outer.contains(inner)) nestedScrollPairs.push({ outer: label(outer), inner: label(inner) });
      if (nestedScrollPairs.length >= scanLimit) break;
    }
    if (nestedScrollPairs.length >= scanLimit) break;
  }

  const textSelectors = 'h1,h2,h3,h4,h5,h6,p,label,strong,button,[role="heading"]';
  const clippedText = [...document.querySelectorAll(textSelectors)]
    .filter((element) => visible(element) && (element.innerText || '').trim())
    .filter((element) => element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1)
    .slice(0, scanLimit)
    .map(label);
  const overflowingComponents = componentElements
    .filter((element) => element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1)
    .slice(0, scanLimit)
    .map((element) => ({
      ...label(element),
      overflow: {
        horizontal: element.scrollWidth > element.clientWidth + 1,
        vertical: element.scrollHeight > element.clientHeight + 1,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
      },
    }));
  const blankComponents = componentElements
    .filter((element) => !(element.innerText || '').trim())
    .filter((element) => !element.querySelector('input,textarea,select,img,svg,canvas,video,[role="progressbar"]'))
    .map(label);
  const buttonsBelowFold = [...document.querySelectorAll('button')]
    .filter(visible)
    .filter((button) => button.getBoundingClientRect().top >= viewport.height)
    .filter((button) => !innerScrollers.some((scroller) => scroller.contains(button)))
    .slice(0, scanLimit)
    .map(label);
  const dialogs = dialogElements.slice(0, scanLimit).map((element) => ({
    ...label(element),
    scroll: {
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      clipped: element.scrollHeight > element.clientHeight + 2,
    },
  }));
  const componentOwner = (element) => {
    let current = element;
    while (current) {
      if (current.id && uuid.test(current.id)) return componentById.get(current.id)?.element ?? current;
      current = current.parentElement;
    }
    return undefined;
  };
  const chartsWithoutData = [...document.querySelectorAll('.js-plotly-plot')]
    .filter(visible)
    .flatMap((plot) => {
      const hasEvaluatedTrace = [plot.data, plot._fullData, plot.calcdata]
        .some((value) => Array.isArray(value) && value.length > 0);
      // Some ToolJet/Plotly builds do not expose data/_fullData on the DOM node even after a
      // successful render. A rendered SVG/WebGL trace is authoritative evidence that it is not blank.
      const hasRenderedTrace = !!plot.querySelector('.trace, .gl-container canvas, canvas.gl-canvas');
      if (hasEvaluatedTrace || hasRenderedTrace) return [];
      const owner = componentOwner(plot);
      return [{
        component: owner ? label(owner) : undefined,
        plot: label(plot),
        reason: 'visible Plotly chart has no evaluated traces',
      }];
    })
    .slice(0, scanLimit);

  const issueSets = {
    overlaps,
    clippedText,
    overflowingComponents,
    blankComponents,
    nestedScrollPairs,
    buttonsBelowFold,
    dialogs,
    chartsWithoutData,
  };
  return {
    url: location.href,
    viewport,
    document: {
      clientHeight: scrollingElement.clientHeight,
      scrollHeight: scrollingElement.scrollHeight,
      pageScrolls,
    },
    counts: {
      visibleComponentDomNodes: rawComponentElements.length,
      visibleComponentInstances: componentElements.length,
      overlaps: overlaps.length,
      clippedText: clippedText.length,
      overflowingComponents: overflowingComponents.length,
      blankComponentCandidates: blankComponents.length,
      innerScrollers: innerScrollers.length,
      nestedScrollPairs: nestedScrollPairs.length,
      buttonsBelowFold: buttonsBelowFold.length,
      dialogs: dialogs.length,
      chartsWithoutData: chartsWithoutData.length,
    },
    detailLimit,
    detailTruncated: Object.fromEntries(
      Object.entries(issueSets).map(([key, items]) => [key, Math.max(0, items.length - detailLimit)])
    ),
    issues: Object.fromEntries(Object.entries(issueSets).map(([key, items]) => [key, detail(items)])),
    components: detail(components),
    notChecked: ['network failures', 'browser console errors', 'hidden conditional states', 'mutation correctness'],
  };
})()
