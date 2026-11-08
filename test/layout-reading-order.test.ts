import assert from 'assert';

interface LayoutItem {
  x: number;
  y: number;
  width: number;
  str: string;
  dir?: string;
}

const isRtlChar = (ch: string) =>
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(ch);

export function reconstructPageLines(rawItems: any[]): { lines: string[]; rawText: string } {
  const items: LayoutItem[] = [];

  for (const it of rawItems) {
    if (!('str' in it) || !it.str) continue;
    // Normalize Unicode compatibility characters (ligatures, fullwidth, decomposed forms)
    const normalized = String(it.str).normalize('NFKC');
    if (!normalized.trim()) continue;

    items.push({
      x: Number(it.transform?.[4]) || 0,
      y: Number(it.transform?.[5]) || 0,
      width: Number(it.width) || 0,
      str: normalized,
      dir: it.dir,
    });
  }

  if (items.length === 0) {
    return { lines: [], rawText: '' };
  }

  // Helper to format a cluster of items sorted top-to-bottom into lines
  const formatCluster = (clusterItems: LayoutItem[]): string[] => {
    if (clusterItems.length === 0) return [];

    const lineMap = new Map<number, LayoutItem[]>();
    for (const it of clusterItems) {
      const yKey = Math.round(it.y / 3.5) * 3.5;
      if (!lineMap.has(yKey)) lineMap.set(yKey, []);
      lineMap.get(yKey)!.push(it);
    }

    const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);
    const clusterLines: string[] = [];

    for (const yKey of sortedY) {
      const lineItems = lineMap.get(yKey)!;
      if (lineItems.length === 0) continue;

      // Check for RTL
      let rtlCount = 0;
      let nonSpaceCount = 0;
      for (const it of lineItems) {
        for (const ch of it.str) {
          if (!/\s/.test(ch)) {
            nonSpaceCount++;
            if (isRtlChar(ch)) rtlCount++;
          }
        }
      }
      const isRtl = nonSpaceCount > 0 && rtlCount / nonSpaceCount > 0.4;

      const sortedX = isRtl
        ? [...lineItems].sort((a, b) => b.x - a.x)
        : [...lineItems].sort((a, b) => a.x - b.x);

      let lineText = '';
      for (let i = 0; i < sortedX.length; i++) {
        const curr = sortedX[i];
        if (i === 0) {
          lineText = curr.str;
        } else {
          const prev = sortedX[i - 1];
          const gap = curr.x - (prev.x + prev.width);
          if (gap >= 2) {
            lineText += ' ' + curr.str;
          } else {
            lineText += curr.str;
          }
        }
      }

      const trimmed = lineText.trim();
      if (trimmed) clusterLines.push(trimmed);
    }

    return clusterLines;
  };

  // Check for multi-column layout
  const minX = Math.min(...items.map((i) => i.x));
  const maxX = Math.max(...items.map((i) => i.x + i.width));
  const contentWidth = maxX - minX;

  let isTwoColumn = false;
  let midX = minX + contentWidth / 2;
  let bannerSplitY = -Infinity;

  if (contentWidth > 280 && items.length >= 8) {
    // Check items in middle 70% of height (body region)
    const minY = Math.min(...items.map((i) => i.y));
    const maxY = Math.max(...items.map((i) => i.y));
    const height = maxY - minY;

    // Body items below potential top banner
    const candidateBodyItems = items.filter((i) => i.y < maxY - height * 0.15 && i.y > minY + height * 0.08);

    if (candidateBodyItems.length >= 6) {
      const gutterWidth = 24;
      const gutterLeft = midX - gutterWidth / 2;
      const gutterRight = midX + gutterWidth / 2;

      let leftCount = 0;
      let rightCount = 0;
      let crossingCount = 0;

      for (const it of candidateBodyItems) {
        const itemRight = it.x + it.width;
        if (itemRight <= gutterLeft) {
          leftCount++;
        } else if (it.x >= gutterRight) {
          rightCount++;
        } else {
          crossingCount++;
        }
      }

      // Strong column separation: both columns have substantial text, very few items cross gutter
      if (leftCount >= 3 && rightCount >= 3 && crossingCount <= Math.max(1, candidateBodyItems.length * 0.1)) {
        isTwoColumn = true;
        // Find highest Y in body region that belongs to left or right columns
        const colItems = items.filter((i) => i.x + i.width <= gutterLeft || i.x >= gutterRight);
        if (colItems.length > 0) {
          // Banner items are those above the top of the two-column split
          const highestColY = Math.max(...colItems.map((i) => i.y));
          bannerSplitY = highestColY + 8; // items strictly higher than this are banner/title
        }
      }
    }
  }

  let finalLines: string[] = [];

  if (isTwoColumn) {
    const bannerItems = items.filter((i) => i.y > bannerSplitY);
    const col1Items = items.filter((i) => i.y <= bannerSplitY && i.x < midX);
    const col2Items = items.filter((i) => i.y <= bannerSplitY && i.x >= midX);

    finalLines = [
      ...formatCluster(bannerItems),
      ...formatCluster(col1Items),
      ...formatCluster(col2Items),
    ];
  } else {
    finalLines = formatCluster(items);
  }

  return {
    lines: finalLines,
    rawText: finalLines.join('\n'),
  };
}

// Tests
console.log('--- 1. Testing Two-Column Layout Reconstruction ---');
const twoColItems = [
  // Banner
  { transform: [1, 0, 0, 1, 50, 800], width: 500, str: 'UNIT 1: PRINCIPLES OF BIOLOGY' },
  // Left Column (Col 1)
  { transform: [1, 0, 0, 1, 50, 700], width: 200, str: '1.1 Cell Theory and Structure' },
  { transform: [1, 0, 0, 1, 50, 680], width: 200, str: 'Cells form the foundation of life.' },
  { transform: [1, 0, 0, 1, 50, 660], width: 200, str: 'All organisms are composed of cells.' },
  { transform: [1, 0, 0, 1, 50, 640], width: 200, str: 'Cell division enables growth.' },
  // Right Column (Col 2)
  { transform: [1, 0, 0, 1, 350, 700], width: 200, str: '1.2 Organelles and Functions' },
  { transform: [1, 0, 0, 1, 350, 680], width: 200, str: 'Mitochondria generate ATP.' },
  { transform: [1, 0, 0, 1, 350, 660], width: 200, str: 'Ribosomes synthesize proteins.' },
  { transform: [1, 0, 0, 1, 350, 640], width: 200, str: 'Chloroplasts perform photosynthesis.' },
];

const res2Col = reconstructPageLines(twoColItems);
console.log('Resulting 2-Column lines:', res2Col.lines);
assert.strictEqual(res2Col.lines[0], 'UNIT 1: PRINCIPLES OF BIOLOGY', 'Banner heading must be first');
assert.strictEqual(res2Col.lines[1], '1.1 Cell Theory and Structure', 'Column 1 starts before Column 2');
assert.strictEqual(res2Col.lines[2], 'Cells form the foundation of life.');
assert.strictEqual(res2Col.lines[4], 'Cell division enables growth.', 'Column 1 completes before Column 2');
assert.strictEqual(res2Col.lines[5], '1.2 Organelles and Functions', 'Column 2 starts after Column 1 finishes');
console.log('✓ Two-Column layout reading order passed without zig-zag interleaving!\n');

console.log('--- 2. Testing Unicode NFKC Normalization ---');
const unicodeItems = [
  { transform: [1, 0, 0, 1, 50, 700], width: 300, str: 'ＵＮＩＴ　１: ＦＵＮＣＴＩＯＮＳ' }, // Fullwidth
  { transform: [1, 0, 0, 1, 50, 680], width: 300, str: 'Deﬁnition of a Function' }, // Ligature fi
];
const resUnicode = reconstructPageLines(unicodeItems);
console.log('Resulting Unicode lines:', resUnicode.lines);
assert.strictEqual(resUnicode.lines[0], 'UNIT 1: FUNCTIONS', 'Fullwidth characters must be normalized to standard ASCII');
assert.strictEqual(resUnicode.lines[1], 'Definition of a Function', 'Ligature fi must be decomposed into f + i');
console.log('✓ Unicode NFKC normalization passed!\n');

console.log('--- 3. Testing Single-Column Preservation ---');
const singleColItems = [
  { transform: [1, 0, 0, 1, 100, 700], width: 400, str: 'CHAPTER 4 - THERMODYNAMICS' },
  { transform: [1, 0, 0, 1, 100, 660], width: 400, str: 'Heat and work are forms of energy transfer.' },
  { transform: [1, 0, 0, 1, 100, 620], width: 400, str: 'The first law governs energy conservation.' },
];
const resSingle = reconstructPageLines(singleColItems);
console.log('Resulting single-column lines:', resSingle.lines);
assert.strictEqual(resSingle.lines.length, 3);
assert.strictEqual(resSingle.lines[0], 'CHAPTER 4 - THERMODYNAMICS');
console.log('✓ Single-column preservation passed!\n');

console.log('ALL LAYOUT & NORMALIZATION TESTS PASSED 100%!');
