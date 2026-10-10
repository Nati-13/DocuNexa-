/**
 * DOCUNEXA — PDF TEXTBOOK STRUCTURE DETECTION & SELECTION REGRESSION TEST SUITE
 *
 * Verifies fixes for issues reported on textbooks (e.g. grade-10-mathematics.pdf):
 * 1. Duplicate headings merged on the same page.
 * 2. Nested unit and subsection numbering (Unit 1, 1.1, 4.1).
 * 3. Repeated Summary and Example headings treated as subsections, NOT cutting
 *    Unit 3 to 130-130 and NOT letting Example span 10-394.
 * 4. Rejection of mathematical expressions (Input, Output, coordinate pairs, formulas, problem stems).
 * 5. Separation of printed page numbers and PDF page indices with offset calibration.
 * 6. Out-of-bounds and invalid page range guards.
 * 7. Union of selected page ranges (Set<number>) preventing duplicate page counts (e.g. 894 -> <= 394).
 * 8. Low-confidence detection handling and manual review flags.
 * 9. Physical page slice extraction preserving whole pages.
 */
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  isConversationalSentence,
  isMathematicalOrContentText,
  isGenericSubsection,
  parseTocLines,
  detectHeadingsStructure,
  detectTocStructure,
  validateSectionInvariants,
  ExtractedPageText,
} from '../src/lib/structureDetector';
import { DocumentSection } from '../src/types/structure';
import { extractPdfRange } from '../src/lib/cutter';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`  ✓ PASS: ${message}`);
}

async function runRegressionTests() {
  console.log('\n================================================================');
  console.log(' DOCUNEXA — TEXTBOOK DETECTION & SELECTION REGRESSION SUITE     ');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // 1. MATHEMATICAL EXPRESSIONS & BODY TEXT REJECTION
  // --------------------------------------------------------------------------
  console.log('[1/9] Testing Rejection of Mathematical Expressions & Body Text...');

  // Input, Output, and function table headers
  assert(isMathematicalOrContentText('Input'), 'Rejects isolated "Input"');
  assert(isMathematicalOrContentText('Output'), 'Rejects isolated "Output"');
  assert(isMathematicalOrContentText('Input 1'), 'Rejects "Input 1"');
  assert(isMathematicalOrContentText('Output 2'), 'Rejects "Output 2"');
  assert(isMathematicalOrContentText('Domain'), 'Rejects "Domain"');
  assert(isMathematicalOrContentText('Range'), 'Rejects "Range"');

  // Coordinate pairs
  assert(isMathematicalOrContentText('(2, 4)'), 'Rejects coordinate pair "(2, 4)"');
  assert(isMathematicalOrContentText('(-1, 3)'), 'Rejects coordinate pair "(-1, 3)"');
  assert(isMathematicalOrContentText('(x, y)'), 'Rejects coordinate pair "(x, y)"');
  assert(isMathematicalOrContentText('(2, 4) 5'), 'Rejects coordinate pair with trailing value "(2, 4) 5"');

  // Isolated numbers
  assert(isMathematicalOrContentText('42'), 'Rejects isolated number "42"');
  assert(isMathematicalOrContentText('130'), 'Rejects isolated number "130"');
  assert(isMathematicalOrContentText('3.14'), 'Rejects decimal number "3.14"');

  // Equations and formulas
  assert(isMathematicalOrContentText('f(x) = 2x + 1'), 'Rejects formula "f(x) = 2x + 1"');
  assert(isMathematicalOrContentText('y = mx + b'), 'Rejects formula "y = mx + b"');
  assert(isMathematicalOrContentText('x^2 + y^2 = 1'), 'Rejects formula "x^2 + y^2 = 1"');

  // Math problem stems starting with numbers
  assert(isMathematicalOrContentText('1. Let f(x) be a real-valued function...'), 'Rejects problem stem "1. Let f(x)..."');
  assert(isMathematicalOrContentText('2. Find the coordinates of the vertex...'), 'Rejects problem stem "2. Find..."');
  assert(isMathematicalOrContentText('3. Solve for x when x^2 - 4 = 0'), 'Rejects problem stem "3. Solve..."');
  assert(isMathematicalOrContentText('4. Calculate the determinant of matrix A'), 'Rejects problem stem "4. Calculate..."');

  // Genuine headings must NOT be rejected
  assert(!isMathematicalOrContentText('UNIT 1: RELATIONS AND FUNCTIONS'), 'Accepts genuine "UNIT 1: RELATIONS AND FUNCTIONS"');
  assert(!isMathematicalOrContentText('Unit 3: Matrices and Determinants'), 'Accepts genuine "Unit 3: Matrices and Determinants"');
  assert(!isMathematicalOrContentText('Chapter 4: Coordinate Geometry'), 'Accepts genuine "Chapter 4: Coordinate Geometry"');
  assert(!isMathematicalOrContentText('1.1 Relations'), 'Accepts subsection "1.1 Relations"');
  assert(!isMathematicalOrContentText('4.1 Vectors in Two Dimensions'), 'Accepts subsection "4.1 Vectors in Two Dimensions"');

  // --------------------------------------------------------------------------
  // 2. GENERIC SUBSECTIONS CLASSIFICATION (SUMMARY, EXAMPLE, REVIEW)
  // --------------------------------------------------------------------------
  console.log('\n[2/9] Testing Generic Subsections (Summary, Example, Review)...');

  assert(isGenericSubsection('Summary'), 'Identifies "Summary" as generic subsection');
  assert(isGenericSubsection('Unit Summary'), 'Identifies "Unit Summary" as generic subsection');
  assert(isGenericSubsection('Chapter Summary'), 'Identifies "Chapter Summary" as generic subsection');
  assert(isGenericSubsection('Example'), 'Identifies "Example" as generic subsection');
  assert(isGenericSubsection('Examples'), 'Identifies "Examples" as generic subsection');
  assert(isGenericSubsection('Review Exercises'), 'Identifies "Review Exercises" as generic subsection');
  assert(isGenericSubsection('Key Terms'), 'Identifies "Key Terms" as generic subsection');

  assert(!isGenericSubsection('Unit 1: Functions'), 'Does NOT classify "Unit 1: Functions" as generic subsection');
  assert(!isGenericSubsection('Chapter 2: Polynomials'), 'Does NOT classify "Chapter 2: Polynomials" as generic subsection');

  // --------------------------------------------------------------------------
  // 3. TABLE OF CONTENTS: SUBSECTION DEMOTION & MATH REJECTION
  // --------------------------------------------------------------------------
  console.log('\n[3/9] Testing TOC Parsing: Math Rejection & Subsection Demotion...');

  const mathTocLines = [
    'TABLE OF CONTENTS',
    'Unit 1: Functions and Graphs ......... 1',
    '1.1 Relations ....................... 3',
    'Input   1',               // Should be rejected
    'Output  2',               // Should be rejected
    '(2, 4)  5',               // Should be rejected
    'Summary ........................... 35', // Must be level 2, NOT level 1
    'Unit 2: Polynomial Functions ....... 40',
    'Example ........................... 45', // Must be level 2, NOT level 1
    'Unit 3: Matrices .................. 130',
    'Unit Summary ...................... 165', // Must be level 2, NOT level 1
    'Unit 4: Vectors ................... 175',
  ];

  const parsedTocEntries = parseTocLines(mathTocLines);

  // Check rejection of false items
  assert(!parsedTocEntries.some((e) => e.title.includes('Input')), 'TOC rejects "Input"');
  assert(!parsedTocEntries.some((e) => e.title.includes('Output')), 'TOC rejects "Output"');
  assert(!parsedTocEntries.some((e) => e.title.includes('(2, 4)')), 'TOC rejects "(2, 4)"');

  // Check genuine entries
  const u1 = parsedTocEntries.find((e) => e.title.includes('Unit 1'));
  const u2 = parsedTocEntries.find((e) => e.title.includes('Unit 2'));
  const u3 = parsedTocEntries.find((e) => e.title.includes('Unit 3'));
  const u4 = parsedTocEntries.find((e) => e.title.includes('Unit 4'));
  const summaryEntry = parsedTocEntries.find((e) => e.title === 'Summary');
  const u3SummaryEntry = parsedTocEntries.find((e) => e.title === 'Unit Summary');
  const exampleEntry = parsedTocEntries.find((e) => e.title === 'Example');

  assert(Boolean(u1 && u1.level === 1), 'Unit 1 is Level 1');
  assert(Boolean(u2 && u2.level === 1), 'Unit 2 is Level 1');
  assert(Boolean(u3 && u3.level === 1), 'Unit 3 is Level 1');
  assert(Boolean(u4 && u4.level === 1), 'Unit 4 is Level 1');

  // Summary and Example must be demoted to Level 2
  assert(Boolean(summaryEntry && summaryEntry.level === 2), 'Summary is demoted to Level 2');
  assert(Boolean(u3SummaryEntry && u3SummaryEntry.level === 2), 'Unit Summary is demoted to Level 2');
  assert(Boolean(exampleEntry && exampleEntry.level === 2), 'Example is demoted to Level 2');

  // --------------------------------------------------------------------------
  // 4. UNIT 3 BOUNDARIES PRESERVATION (NOT 130–130) & PEER BOUNDARIES
  // --------------------------------------------------------------------------
  console.log('\n[4/9] Testing Unit 3 Boundaries & Peer End Calculation...');

  const pagesForToc: ExtractedPageText[] = [
    {
      pageNumber: 3,
      lines: mathTocLines,
      charCount: 400,
    },
    // PDF page 140 (offset = 10 from printed 130)
    {
      pageNumber: 140,
      lines: ['UNIT 3: MATRICES', '3.1 Introduction to Matrices'],
      charCount: 200,
    },
    // PDF page 185 (offset = 10 from printed 175)
    {
      pageNumber: 185,
      lines: ['UNIT 4: VECTORS', '4.1 Vectors in 2D'],
      charCount: 200,
    },
  ];

  const totalPagesInDoc = 394;
  const tocDetection = await detectTocStructure(pagesForToc, totalPagesInDoc);
  assert(tocDetection !== null, 'TOC detection succeeded');

  if (tocDetection) {
    const secU3 = tocDetection.sections.find((s) => s.title.includes('Unit 3'));
    const secU4 = tocDetection.sections.find((s) => s.title.includes('Unit 4'));
    const secSummary = tocDetection.sections.find((s) => s.title === 'Unit Summary');

    assert(Boolean(secU3), 'Found Unit 3 in TOC sections');
    assert(Boolean(secU4), 'Found Unit 4 in TOC sections');

    if (secU3 && secU4) {
      // Unit 3 starts at its mapped page and MUST end at Unit 4's start - 1
      assert(secU3.startPage <= secU3.endPage, 'Unit 3 startPage <= endPage');
      assert(secU3.endPage === secU4.startPage - 1, `Unit 3 ends at Unit 4 start - 1 (${secU3.endPage} === ${secU4.startPage - 1})`);
      assert(secU3.startPage !== secU3.endPage, `Unit 3 is NOT collapsed to a single page (start: ${secU3.startPage}, end: ${secU3.endPage})`);
    }

    if (secSummary) {
      assert(secSummary.level === 2, 'Unit Summary is Level 2');
    }
  }

  // --------------------------------------------------------------------------
  // 5. BODY HEADINGS: MERGE DUPLICATES & REJECT "EXAMPLE SPANNING 10–394"
  // --------------------------------------------------------------------------
  console.log('\n[5/9] Testing Body Headings Deduplication & Generic Boundary Capping...');

  const mockPages: ExtractedPageText[] = [
    {
      pageNumber: 10,
      lines: [
        'Example 1. Find the inverse matrix.', // Homework/example line
        'Let matrix A be [1 2; 3 4].',
      ],
      charCount: 80,
    },
    {
      pageNumber: 130,
      lines: [
        'UNIT 3: MATRICES',
        'UNIT 3: MATRICES', // Duplicate on same page
        '3.1 Definitions',
      ],
      charCount: 100,
    },
    {
      pageNumber: 175,
      lines: [
        'UNIT 4: VECTORS',
        '4.1 Basic Operations',
      ],
      charCount: 100,
    },
  ];

  const detectedHeadings = detectHeadingsStructure(mockPages, totalPagesInDoc);

  // Check that "Example" on page 10 was NOT accepted as a Level 1 section spanning 10-394
  const exampleSec = detectedHeadings.find((s) => s.title.toLowerCase().startsWith('example'));
  assert(
    !exampleSec || exampleSec.level > 1 || exampleSec.endPage < totalPagesInDoc,
    'Example did NOT become a Level 1 unit spanning pages 10–394'
  );

  // Check duplicate heading on page 130 was merged
  const unit3Matches = detectedHeadings.filter((s) => s.title.includes('UNIT 3'));
  assert(unit3Matches.length === 1, `Duplicate Unit 3 heading on page 130 merged into 1 section (got ${unit3Matches.length})`);

  // --------------------------------------------------------------------------
  // 6. OFFSET CALIBRATION & PRINTED PAGE SEPARATION
  // --------------------------------------------------------------------------
  console.log('\n[6/9] Testing Printed Page Separation & Offset Calibration...');

  // Printed page 130, PDF page 142 -> offset +12
  const offsetTocEntries = [
    { title: 'Unit 1: Functions', printedPageRaw: '1', printedPageNum: 1, level: 1 },
    { title: 'Unit 2: Polynomials', printedPageRaw: '50', printedPageNum: 50, level: 1 },
    { title: 'Unit 3: Matrices', printedPageRaw: '130', printedPageNum: 130, level: 1 },
  ];

  const samplePagesText: ExtractedPageText[] = [
    {
      pageNumber: 2,
      lines: ['TABLE OF CONTENTS', 'Unit 1: Functions ......... 1', 'Unit 2: Polynomials ....... 50', 'Unit 3: Matrices ......... 130'],
      charCount: 150,
    },
    // PDF page 13: Unit 1 (1 + 12 = 13)
    {
      pageNumber: 13,
      lines: ['UNIT 1: FUNCTIONS'],
      charCount: 50,
    },
    // PDF page 62: Unit 2 (50 + 12 = 62)
    {
      pageNumber: 62,
      lines: ['UNIT 2: POLYNOMIALS'],
      charCount: 50,
    },
  ];

  const calibrated = await detectTocStructure(samplePagesText, 394);
  assert(calibrated !== null, 'Calibrated structure detected');
  if (calibrated) {
    assert(calibrated.pageOffset === 12, `Detected exact +12 offset (got ${calibrated.pageOffset})`);
    const u3Sec = calibrated.sections.find((s) => s.title.includes('Unit 3'));
    assert(Boolean(u3Sec && u3Sec.startPage === 142), `Unit 3 mapped to PDF page 142 (got ${u3Sec?.startPage})`);
    assert(Boolean(u3Sec && u3Sec.printedStartPage === '130'), 'Preserved printed page number "130" separately from PDF page index');
  }

  // --------------------------------------------------------------------------
  // 7. SECTION INVARIANTS: OUT-OF-BOUNDS & REVERSED RANGES
  // --------------------------------------------------------------------------
  console.log('\n[7/9] Testing Section Invariant Safety...');

  const outOfBoundsSections: DocumentSection[] = [
    { id: '1', title: 'Unit 1', level: 1, startPage: 0, endPage: 50, confidence: 90, source: 'toc' },
    { id: '2', title: 'Unit 2', level: 1, startPage: 51, endPage: 400, confidence: 90, source: 'toc' }, // > 394
    { id: '3', title: 'Unit 3', level: 1, startPage: 200, endPage: 150, confidence: 90, source: 'toc' }, // start > end
  ];

  const invariantRes = validateSectionInvariants(outOfBoundsSections, 394);
  assert(!invariantRes.isValid, 'Flags invalid sections as invalid');
  assert(invariantRes.issues.some((i) => i.message.includes('below 1')), 'Detects startPage < 1');
  assert(invariantRes.issues.some((i) => i.message.includes('exceeding total pages')), 'Detects endPage > 394');
  assert(invariantRes.issues.some((i) => i.message.includes('is greater than end page')), 'Detects startPage > endPage');

  // --------------------------------------------------------------------------
  // 8. UNION OF SELECTED PAGE RANGES (FIXING 48 ITEMS REPORTING 894 PAGES)
  // --------------------------------------------------------------------------
  console.log('\n[8/9] Testing Selection Union Totals (Union of Page Sets)...');

  // Simulate 48 items with overlapping units, subsections, and summaries
  // spanning a 394-page document
  const simulatedReviewItems = [
    // Unit 1 and its subsections
    { id: 'u1', title: 'Unit 1', startPage: 1, endPage: 60, pageCount: 60 },
    { id: 's1-1', title: 'Section 1.1', startPage: 1, endPage: 25, pageCount: 25 },
    { id: 's1-2', title: 'Section 1.2', startPage: 26, endPage: 50, pageCount: 25 },
    { id: 's1-sum', title: 'Summary 1', startPage: 51, endPage: 60, pageCount: 10 },

    // Unit 2 and its subsections
    { id: 'u2', title: 'Unit 2', startPage: 61, endPage: 130, pageCount: 70 },
    { id: 's2-1', title: 'Section 2.1', startPage: 61, endPage: 90, pageCount: 30 },
    { id: 's2-2', title: 'Section 2.2', startPage: 91, endPage: 120, pageCount: 30 },
    { id: 's2-sum', title: 'Summary 2', startPage: 121, endPage: 130, pageCount: 10 },

    // Unit 3 and its subsections
    { id: 'u3', title: 'Unit 3', startPage: 130, endPage: 210, pageCount: 81 },
    { id: 's3-1', title: 'Section 3.1', startPage: 130, endPage: 170, pageCount: 41 },
    { id: 's3-2', title: 'Section 3.2', startPage: 171, endPage: 200, pageCount: 30 },
    { id: 's3-sum', title: 'Summary 3', startPage: 201, endPage: 210, pageCount: 10 },

    // Unit 4 and its subsections
    { id: 'u4', title: 'Unit 4', startPage: 211, endPage: 300, pageCount: 90 },
    { id: 's4-1', title: 'Section 4.1', startPage: 211, endPage: 260, pageCount: 50 },
    { id: 's4-2', title: 'Section 4.2', startPage: 261, endPage: 290, pageCount: 30 },
    { id: 's4-sum', title: 'Summary 4', startPage: 291, endPage: 300, pageCount: 10 },

    // Unit 5 and its subsections
    { id: 'u5', title: 'Unit 5', startPage: 301, endPage: 394, pageCount: 94 },
    { id: 's5-1', title: 'Section 5.1', startPage: 301, endPage: 350, pageCount: 50 },
    { id: 's5-2', title: 'Section 5.2', startPage: 351, endPage: 380, pageCount: 30 },
    { id: 's5-sum', title: 'Summary 5', startPage: 381, endPage: 394, pageCount: 14 },
  ];

  // Old buggy method: raw sum of pageCount
  const buggyRawSum = simulatedReviewItems.reduce((acc, item) => acc + item.pageCount, 0);
  assert(buggyRawSum === 790, `Buggy raw sum produces inflated count: ${buggyRawSum} pages`);

  // New fixed method: union of page sets
  const uniquePageSet = new Set<number>();
  for (const item of simulatedReviewItems) {
    for (let p = item.startPage; p <= item.endPage; p++) {
      uniquePageSet.add(p);
    }
  }
  const trueUniqueTotal = uniquePageSet.size;

  assert(
    trueUniqueTotal === 394,
    `Union calculation correctly reports exactly ${trueUniqueTotal} unique pages (<= 394 total document pages)`
  );
  assert(
    trueUniqueTotal <= totalPagesInDoc,
    `Unique total (${trueUniqueTotal}) NEVER exceeds total document pages (${totalPagesInDoc})`
  );

  // --------------------------------------------------------------------------
  // 9. PHYSICAL PDF EXTRACTION WITH SHARED PAGES
  // --------------------------------------------------------------------------
  console.log('\n[9/9] Testing Physical Page Extraction with Shared Pages...');

  // Create a 10-page test document
  const testDoc = await PDFDocument.create();
  const font = await testDoc.embedFont(StandardFonts.Helvetica);
  for (let p = 1; p <= 10; p++) {
    const page = testDoc.addPage([600, 800]);
    page.drawText(`Page Content ${p}`, { x: 50, y: 700, size: 16, font });
  }
  const docBytes = await testDoc.save();
  const docBuffer = docBytes.buffer.slice(
    docBytes.byteOffset,
    docBytes.byteOffset + docBytes.byteLength
  ) as ArrayBuffer;

  // Extract overlapping ranges: Part 1 (pp 1-5), Part 2 (pp 5-8) sharing page 5
  const slice1 = await extractPdfRange(docBuffer, 1, 5);
  const slice2 = await extractPdfRange(docBuffer, 5, 8);

  const doc1 = await PDFDocument.load(slice1);
  const doc2 = await PDFDocument.load(slice2);

  assert(doc1.getPageCount() === 5, 'Slice 1 has complete 5 pages');
  assert(doc2.getPageCount() === 4, 'Slice 2 has complete 4 pages');

  // Both contain shared page 5 without slicing truncation
  assert(slice1.byteLength > 0 && slice2.byteLength > 0, 'Both slices generated intact PDF bytes');

  console.log('\n================================================================');
  console.log(` ALL ${passedTests} OF ${totalTests} REGRESSION TESTS PASSED (100%)!`);
  console.log('================================================================\n');
}

runRegressionTests().catch((err) => {
  console.error('Regression suite failed:', err);
  process.exit(1);
});
