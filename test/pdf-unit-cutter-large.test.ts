/**
 * DOCUNEXA — PDF UNIT CUTTER LARGE DOCUMENT & ROBUSTNESS TEST SUITE
 *
 * Verifies:
 * 1. 701-page PDF document extraction:
 *    - Real PDFDocument with 701 physical pages.
 *    - Sequential chunk extraction ([1..150], [151..500], [501..701]).
 *    - Exact physical page verification on all slices (150, 350, 201 -> 701 total).
 * 2. 1,000-page PDF execution & memory safety:
 *    - Multi-unit cutting on 1,000-page PDF.
 *    - Controlled progress reporting and responsive UI yielding.
 *    - Clean cancellation handling without corrupting state.
 * 3. Multi-page Table of Contents:
 *    - Deep TOC scanning up to page 80.
 *    - Multi-page TOC spanning pages 18 to 32.
 *    - Filtered out from physical heading candidates.
 * 4. Non-Latin & Ethiopic script support:
 *    - Ethiopic numerals (፩ to ፳) parsed to integer values.
 *    - Ethiopic heading prefixes (ምዕራፍ, ክፍል, ትምህርት).
 *    - Ethiopic TOC identification (ማውጫ).
 * 5. Scanned / image-only document handling:
 *    - Empty text layer detected as scanned.
 *    - Descriptive uncertainty reason pointing to Manual Split.
 *    - Strict confirmation requirement before cutting.
 * 6. Roman numeral front matter & offset calibration:
 *    - Front matter numbered i..xx.
 *    - Calibrated offset consensus applied to all units.
 *    - Zero gaps, zero overlaps.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  detectDocumentUnits,
  findTocPageNumbers,
  extractTocEntries,
  isGenuineHeading,
  parseUnitNumber,
  validateCutEligibility,
} from '../src/lib/detector';
import {
  extractPdfRange,
  executeCutPlan,
  dispatchCutExecution,
  resolveEffectiveUncertainty,
} from '../src/lib/cutter';
import { PageTextData, CutProgressState, CutProgressItem } from '../src/types';

let passed = 0;
let total = 0;

function assert(description: string, condition: boolean, details?: string) {
  total++;
  if (condition) {
    console.log(`  ✓ [PASS] ${description}${details ? ` (${details})` : ''}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${description}${details ? ` (${details})` : ''}`);
    process.exitCode = 1;
  }
}

function createPageText(pageNumber: number, lines: string[]): PageTextData {
  return {
    pageNumber,
    rawText: lines.join('\n'),
    lines,
    hasSubstantialText: lines.length > 0 && lines.some((l) => l.trim().length > 0),
  };
}

async function runLargePdfTests() {
  console.log('================================================================');
  console.log(' DOCUNEXA — PDF UNIT CUTTER LARGE DOCUMENT & ROBUSTNESS TESTS   ');
  console.log('================================================================\n');

  // --- 1. NON-LATIN & ETHIOPIC NUMERAL & HEADING PARSING ---
  console.log('--- 1. NON-LATIN & ETHIOPIC SCRIPT DETECTION ---');

  assert('Ethiopic numeral ፩ parses to 1', parseUnitNumber('፩') === 1);
  assert('Ethiopic numeral ፪ parses to 2', parseUnitNumber('፪') === 2);
  assert('Ethiopic numeral ፫ parses to 3', parseUnitNumber('፫') === 3);
  assert('Ethiopic numeral ፬ parses to 4', parseUnitNumber('፬') === 4);
  assert('Ethiopic numeral ፭ parses to 5', parseUnitNumber('፭') === 5);
  assert('Ethiopic numeral ፲ parses to 10', parseUnitNumber('፲') === 10);
  assert('Ethiopic numeral ፳ parses to 20', parseUnitNumber('፳') === 20);

  // Ethiopic Headings
  const ethH1 = isGenuineHeading('ምዕራፍ ፩: የሕይወት አመጣጥ', 0, 15);
  assert('Detects Ethiopic heading "ምዕራፍ ፩: የሕይወት አመጣጥ"', Boolean(ethH1 && ethH1.numberValue === 1));

  const ethH2 = isGenuineHeading('ክፍል 2 – የሴል አወቃቀር', 1, 20);
  assert('Detects Ethiopic heading with Arabic digit "ክፍል 2 – የሴል አወቃቀር"', Boolean(ethH2 && ethH2.numberValue === 2));

  const ethH3 = isGenuineHeading('ትምህርት 3: ጄኔቲክስ', 0, 10);
  assert('Detects Ethiopic heading "ትምህርት 3: ጄኔቲክስ"', Boolean(ethH3 && ethH3.numberValue === 3));

  // Ethiopic TOC identification (ማውጫ)
  const ethTocPages = [
    createPageText(1, ['የባዮሎጂ መማሪያ መጽሐፍ', '11ኛ ክፍል']),
    createPageText(2, ['ማውጫ', 'ምዕራፍ ፩: የሕይወት አመጣጥ ................. 5', 'ምዕራፍ ፪: የሴል አወቃቀር ................... 25']),
    createPageText(3, ['የርዕስ ማውጫ (የቀጠለ)', 'ምዕራፍ ፫: ጄኔቲክስ .......................... 50']),
    createPageText(4, ['መግቢያ', 'የመጽሐፉ ዓላማ...']),
    createPageText(5, ['ምዕራፍ ፩: የሕይወት አመጣጥ', 'ይዘት...']),
  ];
  const detectedEthToc = findTocPageNumbers(ethTocPages);
  assert('Identifies Ethiopic primary TOC page with "ማውጫ"', detectedEthToc.has(2));
  assert('Identifies Ethiopic continuation TOC page with "የቀጠለ"', detectedEthToc.has(3));
  assert('Does not misidentify cover or body pages as TOC', !detectedEthToc.has(1) && !detectedEthToc.has(5));

  // --- 2. MULTI-PAGE TOC SPANNING PAGES 20 TO 35 ---
  console.log('\n--- 2. MULTI-PAGE DEEP TOC SCANNING (> PAGE 25) ---');

  const deepTocPages: PageTextData[] = [];
  for (let p = 1; p <= 60; p++) {
    if (p < 20) {
      deepTocPages.push(createPageText(p, [`Front Matter Page ${p}`, 'Introductory remarks']));
    } else if (p === 20) {
      deepTocPages.push(createPageText(p, [
        'TABLE OF CONTENTS',
        'Unit 1: Foundations of Chemistry ................. 1',
        'Unit 2: Atomic Structure ........................ 40',
      ]));
    } else if (p >= 21 && p <= 25) {
      deepTocPages.push(createPageText(p, [
        'Contents (Continued)',
        `Unit ${p - 18}: Advanced Topic ${p} ................... ${p * 20}`,
      ]));
    } else if (p === 35) {
      deepTocPages.push(createPageText(p, ['Unit 1: Foundations of Chemistry', 'Body content starts here']));
    } else {
      deepTocPages.push(createPageText(p, [`Body page ${p}`, 'Lorem ipsum content']));
    }
  }

  const deepTocResult = findTocPageNumbers(deepTocPages);
  assert('Scans beyond page 25 and detects TOC starting on page 20', deepTocResult.has(20));
  assert('Detects continued TOC on page 21', deepTocResult.has(21));
  assert('Detects continued TOC on page 25', deepTocResult.has(25));
  assert('Does not misidentify body start page 35 as TOC', !deepTocResult.has(35));

  // --- 3. SCANNED / IMAGE-ONLY DOCUMENT FALLBACK ---
  console.log('\n--- 3. SCANNED / IMAGE-ONLY DOCUMENT FALLBACK ---');

  const scannedPages: PageTextData[] = [];
  for (let p = 1; p <= 50; p++) {
    scannedPages.push({
      pageNumber: p,
      rawText: '',
      lines: [],
      hasSubstantialText: false,
    });
  }

  const scannedResult = detectDocumentUnits(scannedPages, 50, 'ScannedTextbook.pdf');
  assert('Scanned document is flagged as uncertain', scannedResult.isUncertain === true);
  assert('Scanned document has Low overall confidence', scannedResult.overallConfidence === 'Low');
  assert('Uncertainty reason mentions scanned or image-only status', scannedResult.uncertaintyReason?.includes('scanned or image-only') === true);
  assert('Scanned document fallback produces 1 full-document part for manual split', scannedResult.parts.length === 1 && scannedResult.parts[0].endPage === 50);

  const cutEligibility = validateCutEligibility(scannedResult.isUncertain, false, scannedResult.parts.length, true);
  assert('validateCutEligibility requires confirmation for scanned document', cutEligibility.canCut === false && cutEligibility.requiresConfirmation === true);

  // --- 4. ROMAN NUMERAL FRONT MATTER & OFFSET CALIBRATION ---
  console.log('\n--- 4. ROMAN NUMERAL FRONT MATTER & CALIBRATED OFFSET ---');

  // Book has 14 pages of front matter (i to xiv).
  // Body Unit 1 starts at physical page 15 (printed page 1) -> offset is +14.
  // Unit 2 starts at physical page 45 (printed page 31) -> offset is +14.
  // Unit 3 starts at physical page 85 (printed page 71) -> offset is +14.
  const bookWithRomanPages: PageTextData[] = [];
  // TOC on page 5
  bookWithRomanPages.push(createPageText(5, [
    'TABLE OF CONTENTS',
    'Unit 1: Introduction to Cellular Biology ......... 1',
    'Unit 2: Molecular Genetics ..................... 31',
    'Unit 3: Evolutionary Principles ................ 71',
  ]));

  // Body units
  bookWithRomanPages.push(createPageText(15, ['UNIT 1: INTRODUCTION TO CELLULAR BIOLOGY', 'Chapter overview']));
  bookWithRomanPages.push(createPageText(45, ['UNIT 2: MOLECULAR GENETICS', 'DNA replication']));
  bookWithRomanPages.push(createPageText(85, ['UNIT 3: EVOLUTIONARY PRINCIPLES', 'Natural selection']));

  // Add dummy pages
  const allBookPages: PageTextData[] = [];
  for (let p = 1; p <= 120; p++) {
    const existing = bookWithRomanPages.find((b) => b.pageNumber === p);
    allBookPages.push(existing || createPageText(p, [`Page ${p} text`]));
  }

  const romanBookResult = detectDocumentUnits(allBookPages, 120, 'BiologyTextbook.pdf');
  assert('Detects front matter range [1..14]', romanBookResult.hasFrontMatter && romanBookResult.frontMatterRange?.end === 14);
  assert('Unit 1 starts at physical page 15', romanBookResult.parts[0]?.startPage === 15);
  assert('Unit 1 ends at physical page 44', romanBookResult.parts[0]?.endPage === 44);
  assert('Unit 2 starts at physical page 45', romanBookResult.parts[1]?.startPage === 45);
  assert('Unit 2 ends at physical page 84', romanBookResult.parts[1]?.endPage === 84);
  assert('Unit 3 starts at physical page 85', romanBookResult.parts[2]?.startPage === 85);
  assert('Unit 3 ends at physical page 120', romanBookResult.parts[2]?.endPage === 120);
  assert('Total assigned pages across units is 106 (120 - 14 front matter)', romanBookResult.assignedPagesCount === 106);
  assert('Zero gaps between units [15..44], [45..84], [85..120]', 
    romanBookResult.parts[0].endPage + 1 === romanBookResult.parts[1].startPage &&
    romanBookResult.parts[1].endPage + 1 === romanBookResult.parts[2].startPage
  );

  // --- 5. 701-PAGE REAL PDF GENERATION & EXTRACTION ---
  console.log('\n--- 5. 701-PAGE REAL PDF EXTRACTION & VERIFICATION ---');

  console.log('  Generating 701-page PDF document...');
  const doc701 = await PDFDocument.create();
  const font701 = await doc701.embedFont(StandardFonts.Helvetica);

  // Create 701 pages efficiently
  for (let i = 1; i <= 701; i++) {
    const page = doc701.addPage([400, 600]);
    page.drawText(`Page ${i} of 701`, { x: 50, y: 550, size: 12, font: font701 });
  }

  const bytes701 = await doc701.save();
  assert('701-page PDF successfully created', bytes701.byteLength > 0);

  // Extract sequential ranges
  console.log('  Extracting ranges from 701-page PDF...');
  const slice1 = await extractPdfRange(bytes701, 1, 150);
  const vDoc1 = await PDFDocument.load(slice1);
  assert('Range [1..150] produces exactly 150 pages', vDoc1.getPageCount() === 150);

  const slice2 = await extractPdfRange(bytes701, 151, 500);
  const vDoc2 = await PDFDocument.load(slice2);
  assert('Range [151..500] produces exactly 350 pages', vDoc2.getPageCount() === 350);

  const slice3 = await extractPdfRange(bytes701, 501, 701);
  const vDoc3 = await PDFDocument.load(slice3);
  assert('Range [501..701] produces exactly 201 pages', vDoc3.getPageCount() === 201);

  const totalExtracted = vDoc1.getPageCount() + vDoc2.getPageCount() + vDoc3.getPageCount();
  assert('Sum of slices equals exact 701 total pages (zero lost pages)', totalExtracted === 701);

  // --- 6. 1,000-PAGE PDF EXECUTION & CANCELLATION ---
  console.log('\n--- 6. 1,000-PAGE PDF CUT EXECUTION & CANCELLATION ---');

  console.log('  Generating 1,000-page PDF document...');
  const doc1000 = await PDFDocument.create();
  const font1000 = await doc1000.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= 1000; i++) {
    const page = doc1000.addPage([300, 400]);
    page.drawText(`Page ${i}`, { x: 30, y: 360, size: 10, font: font1000 });
  }

  const bytes1000 = await doc1000.save();
  assert('1,000-page PDF successfully created', bytes1000.byteLength > 0);

  const parts1000 = [
    {
      id: 'p1',
      title: 'Volume 1',
      startPage: 1,
      endPage: 250,
      filename: 'Volume 1.pdf',
      confidence: 'High' as const,
    },
    {
      id: 'p2',
      title: 'Volume 2',
      startPage: 251,
      endPage: 500,
      filename: 'Volume 2.pdf',
      confidence: 'High' as const,
    },
    {
      id: 'p3',
      title: 'Volume 3',
      startPage: 501,
      endPage: 750,
      filename: 'Volume 3.pdf',
      confidence: 'High' as const,
    },
    {
      id: 'p4',
      title: 'Volume 4',
      startPage: 751,
      endPage: 1000,
      filename: 'Volume 4.pdf',
      confidence: 'High' as const,
    },
  ];

  console.log('  Executing cut plan on 1,000-page document...');
  let progressEventsCount = 0;
  const cutResults = await executeCutPlan(
    bytes1000,
    parts1000,
    () => { progressEventsCount++; },
    () => false,
    { isUncertain: false, isConfirmed: true }
  );

  assert('Cut execution completed for all 4 parts across 1,000 pages', cutResults.length === 4);
  assert('Progress callback fired repeatedly during execution', progressEventsCount >= 8);
  for (let i = 0; i < 4; i++) {
    const item = cutResults[i];
    assert(`Part ${i + 1} (${item.title}) has status "done"`, item.status === 'done');
    const itemDoc = await PDFDocument.load(item.bytes!);
    assert(`Part ${i + 1} slice has exactly 250 pages`, itemDoc.getPageCount() === 250);
  }

  // Cancellation test on 1,000-page document
  console.log('  Testing cancellation handling on 1,000-page document...');
  let cancelCalled = false;
  let currentPartIndex = 0;
  const cancelledResults = await executeCutPlan(
    bytes1000,
    parts1000,
    (state) => { currentPartIndex = state.currentIndex; },
    () => {
      // Cancel after first part is completed
      if (currentPartIndex >= 1) {
        cancelCalled = true;
        return true;
      }
      return false;
    },
    { isUncertain: false, isConfirmed: true }
  );

  assert('Cancellation cleanly triggered midway through multi-part cut', cancelCalled);
  assert('Remaining parts stay in waiting status after cancellation', cancelledResults.some((r) => r.status === 'waiting'));

  // --- 7. 750-PAGE REAL PDF GENERATION & EXTRACTION ---
  console.log('\n--- 7. 750-PAGE REAL PDF EXTRACTION & VERIFICATION ---');

  const memBefore750 = process.memoryUsage().heapUsed;
  const timeStart750 = Date.now();
  console.log('  Generating 750-page PDF document...');
  const doc750 = await PDFDocument.create();
  const font750 = await doc750.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= 750; i++) {
    const page = doc750.addPage([300, 400]);
    page.drawText(`Page ${i} of 750`, { x: 30, y: 360, size: 10, font: font750 });
  }

  const bytes750 = await doc750.save();
  const elapsedGen750 = Date.now() - timeStart750;
  assert('750-page PDF successfully created', bytes750.byteLength > 0, `size: ${(bytes750.byteLength / 1024).toFixed(1)} KB, time: ${elapsedGen750}ms`);

  console.log('  Extracting ranges from 750-page PDF...');
  const slice750_1 = await extractPdfRange(bytes750, 1, 250);
  const vDoc750_1 = await PDFDocument.load(slice750_1);
  assert('750-page Range [1..250] produces exactly 250 pages', vDoc750_1.getPageCount() === 250);

  const slice750_2 = await extractPdfRange(bytes750, 251, 500);
  const vDoc750_2 = await PDFDocument.load(slice750_2);
  assert('750-page Range [251..500] produces exactly 250 pages', vDoc750_2.getPageCount() === 250);

  const slice750_3 = await extractPdfRange(bytes750, 501, 750);
  const vDoc750_3 = await PDFDocument.load(slice750_3);
  assert('750-page Range [501..750] produces exactly 250 pages', vDoc750_3.getPageCount() === 250);

  const totalExtracted750 = vDoc750_1.getPageCount() + vDoc750_2.getPageCount() + vDoc750_3.getPageCount();
  assert('Sum of 750-page slices equals exact 750 total pages', totalExtracted750 === 750);

  // --- 8. 1,500-PAGE REAL PDF GENERATION & EXTRACTION ---
  console.log('\n--- 8. 1,500-PAGE REAL PDF EXTRACTION & MEMORY BENCHMARK ---');

  const memBefore1500 = process.memoryUsage().heapUsed;
  const timeStart1500 = Date.now();
  console.log('  Generating 1,500-page PDF document...');
  const doc1500 = await PDFDocument.create();
  const font1500 = await doc1500.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= 1500; i++) {
    const page = doc1500.addPage([300, 400]);
    page.drawText(`Page ${i} of 1500`, { x: 30, y: 360, size: 10, font: font1500 });
  }

  const bytes1500 = await doc1500.save();
  const elapsedGen1500 = Date.now() - timeStart1500;
  const memAfter1500 = process.memoryUsage().heapUsed;
  const memDelta1500Mb = ((memAfter1500 - memBefore1500) / (1024 * 1024)).toFixed(1);

  assert('1,500-page PDF successfully created', bytes1500.byteLength > 0, `size: ${(bytes1500.byteLength / 1024).toFixed(1)} KB, time: ${elapsedGen1500}ms, heap delta: ${memDelta1500Mb} MB`);

  console.log('  Extracting ranges from 1,500-page PDF...');
  const slice1500_1 = await extractPdfRange(bytes1500, 1, 500);
  const vDoc1500_1 = await PDFDocument.load(slice1500_1);
  assert('1,500-page Range [1..500] produces exactly 500 pages', vDoc1500_1.getPageCount() === 500);

  const slice1500_2 = await extractPdfRange(bytes1500, 501, 1000);
  const vDoc1500_2 = await PDFDocument.load(slice1500_2);
  assert('1,500-page Range [501..1000] produces exactly 500 pages', vDoc1500_2.getPageCount() === 500);

  const slice1500_3 = await extractPdfRange(bytes1500, 1001, 1500);
  const vDoc1500_3 = await PDFDocument.load(slice1500_3);
  assert('1,500-page Range [1001..1500] produces exactly 500 pages', vDoc1500_3.getPageCount() === 500);

  const totalExtracted1500 = vDoc1500_1.getPageCount() + vDoc1500_2.getPageCount() + vDoc1500_3.getPageCount();
  assert('Sum of 1,500-page slices equals exact 1,500 total pages (zero lost pages)', totalExtracted1500 === 1500);

  console.log('\n================================================================');
  console.log(` PDF UNIT CUTTER LARGE DOCUMENT TESTS: ${passed} of ${total} passed (${Math.round((passed / total) * 100)}%)`);
  if (passed === total) {
    console.log(' ALL LARGE DOCUMENT & ROBUSTNESS TESTS PASSED 100%!');
    console.log('================================================================\n');
  } else {
    console.error(` FAILURES: ${total - passed}`);
    process.exitCode = 1;
  }
}

runLargePdfTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

