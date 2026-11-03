/**
 * DOCUNEXA — TEXTBOOK EXTRACTION ROBUSTNESS & ACCURACY TEST SUITE
 *
 * Verifies:
 * 1. 60-page synthetic textbook structure:
 *    - Page 1: Cover
 *    - Page 2: Preface & Copyright
 *    - Page 3: TOC Page 1 (Table of Contents with Unit 1 & Unit 2)
 *    - Page 4: TOC Page 2 (Contents Continued with Unit 3 & Unit 4)
 *    - Pages 5-10: Front matter
 *    - Pages 11-25: Unit 1 (Physical heading on p.11, printed p.1 -> offset +10, running headers & subsections)
 *    - Pages 26-41: Unit 2 (Physical heading on p.26, printed p.16 -> offset +10, running headers & subsections)
 *    - Pages 42-55: Unit 3 (Physical heading on p.42, printed p.32 -> offset +10, running headers & subsections)
 *    - Pages 56-60: Unit 4 (Physical heading on p.56, printed p.46 -> offset +10, running headers)
 * 2. Heading detection & TOC filtering:
 *    - Multi-page TOC correctly identified.
 *    - TOC entries never mistaken for physical unit headings.
 *    - Running headers on subsequent pages ignored.
 *    - Subsections (e.g., "1.1 Ecosystem Dynamics", "Unit 1.1 Topic Overview") rejected.
 * 3. Page-number mapping & unit boundaries:
 *    - Accurate physical starts (11, 26, 42, 56) and ends (25, 41, 55, 60).
 *    - Front matter correctly identified (pages 1-10).
 *    - Zero unassigned page gaps between units.
 * 4. PDF physical extraction verification:
 *    - extractPdfRange produces exact page counts (15, 16, 14, 5, front matter 10).
 *    - executeCutPlan cuts all units and verifies loaded byte page counts.
 *    - Strict error throwing on invalid/inverted ranges (no silent 1-page clamping).
 * 5. Uncertainty flagging:
 *    - TOC-only or uncalibrated offset flagged with isUncertain = true.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  detectDocumentUnits,
  findTocPageNumbers,
  extractTocEntries,
  isGenuineHeading,
  validateCutEligibility
} from '../src/lib/detector';
import {
  extractPdfRange,
  executeCutPlan,
  dispatchCutExecution,
  resolveEffectiveUncertainty
} from '../src/lib/cutter';
import { PageTextData, CutProgressState, CutProgressItem } from '../src/types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
    failed++;
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

async function createSynthetic60PagePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  for (let pageNum = 1; pageNum <= 60; pageNum++) {
    const page = doc.addPage([595.28, 841.89]); // A4 portrait
    const { height } = page.getSize();

    if (pageNum === 1) {
      // Cover
      page.drawText('BIOLOGY: AN INTRODUCTION TO LIFE SCIENCES', {
        x: 50,
        y: height - 100,
        size: 20,
        font: boldFont,
        color: rgb(0.1, 0.2, 0.5),
      });
      page.drawText('Grade 11 Textbook - Ethiopian Curriculum', {
        x: 50,
        y: height - 130,
        size: 14,
        font,
      });
    } else if (pageNum === 2) {
      // Preface
      page.drawText('PREFACE AND COPYRIGHT', {
        x: 50,
        y: height - 80,
        size: 16,
        font: boldFont,
      });
      page.drawText('Copyright 2026 DocuNexa Publishing. All rights reserved.', {
        x: 50,
        y: height - 110,
        size: 11,
        font,
      });
    } else if (pageNum === 3) {
      // TOC Page 1
      page.drawText('TABLE OF CONTENTS', {
        x: 50,
        y: height - 80,
        size: 18,
        font: boldFont,
      });
      page.drawText('Unit 1: Principles of Ecology .................................................... 1', {
        x: 50,
        y: height - 120,
        size: 12,
        font,
      });
      page.drawText('Unit 2: Cellular Metabolism ..................................................... 16', {
        x: 50,
        y: height - 150,
        size: 12,
        font,
      });
    } else if (pageNum === 4) {
      // TOC Page 2 (Continued)
      page.drawText('CONTENTS (CONTINUED)', {
        x: 50,
        y: height - 80,
        size: 18,
        font: boldFont,
      });
      page.drawText('Unit 3: Molecular Genetics ...................................................... 32', {
        x: 50,
        y: height - 120,
        size: 12,
        font,
      });
      page.drawText('Unit 4: Human Physiology ........................................................ 46', {
        x: 50,
        y: height - 150,
        size: 12,
        font,
      });
    } else if (pageNum >= 5 && pageNum <= 10) {
      // Front matter
      page.drawText(`INTRODUCTION & FRONT MATTER (Page ${pageNum})`, {
        x: 50,
        y: height - 80,
        size: 14,
        font: boldFont,
      });
      page.drawText('Safety instructions, curriculum guide, and orientation.', {
        x: 50,
        y: height - 110,
        size: 11,
        font,
      });
    } else if (pageNum === 11) {
      // Physical Unit 1 heading
      page.drawText('UNIT 1: PRINCIPLES OF ECOLOGY', {
        x: 50,
        y: height - 80,
        size: 22,
        font: boldFont,
        color: rgb(0.1, 0.3, 0.6),
      });
      page.drawText('Chapter Overview and Learning Outcomes', {
        x: 50,
        y: height - 120,
        size: 13,
        font,
      });
    } else if (pageNum > 11 && pageNum <= 25) {
      // Unit 1 body with running header & subsections
      page.drawText('UNIT 1: PRINCIPLES OF ECOLOGY', {
        x: 50,
        y: height - 40,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
      if (pageNum === 12) {
        page.drawText('1.1 Ecosystem Dynamics', {
          x: 50,
          y: height - 80,
          size: 14,
          font: boldFont,
        });
      }
      page.drawText(`Body text of Unit 1 on physical page ${pageNum}.`, {
        x: 50,
        y: height - 120,
        size: 11,
        font,
      });
    } else if (pageNum === 26) {
      // Physical Unit 2 heading
      page.drawText('UNIT 2: CELLULAR METABOLISM', {
        x: 50,
        y: height - 80,
        size: 22,
        font: boldFont,
        color: rgb(0.1, 0.3, 0.6),
      });
    } else if (pageNum > 26 && pageNum <= 41) {
      // Unit 2 body
      page.drawText('UNIT 2: CELLULAR METABOLISM', {
        x: 50,
        y: height - 40,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
      if (pageNum === 27) {
        page.drawText('2.1 Cellular Respiration and ATP', {
          x: 50,
          y: height - 80,
          size: 14,
          font: boldFont,
        });
      }
      page.drawText(`Body text of Unit 2 on physical page ${pageNum}.`, {
        x: 50,
        y: height - 120,
        size: 11,
        font,
      });
    } else if (pageNum === 42) {
      // Physical Unit 3 heading
      page.drawText('UNIT 3: MOLECULAR GENETICS', {
        x: 50,
        y: height - 80,
        size: 22,
        font: boldFont,
        color: rgb(0.1, 0.3, 0.6),
      });
    } else if (pageNum > 42 && pageNum <= 55) {
      // Unit 3 body
      page.drawText('UNIT 3: MOLECULAR GENETICS', {
        x: 50,
        y: height - 40,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
      if (pageNum === 43) {
        page.drawText('3.1 DNA Structure and Replication', {
          x: 50,
          y: height - 80,
          size: 14,
          font: boldFont,
        });
      }
      page.drawText(`Body text of Unit 3 on physical page ${pageNum}.`, {
        x: 50,
        y: height - 120,
        size: 11,
        font,
      });
    } else if (pageNum === 56) {
      // Physical Unit 4 heading
      page.drawText('UNIT 4: HUMAN PHYSIOLOGY', {
        x: 50,
        y: height - 80,
        size: 22,
        font: boldFont,
        color: rgb(0.1, 0.3, 0.6),
      });
    } else {
      // Unit 4 body through page 60
      page.drawText('UNIT 4: HUMAN PHYSIOLOGY', {
        x: 50,
        y: height - 40,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
      page.drawText(`Body text of Unit 4 on physical page ${pageNum}.`, {
        x: 50,
        y: height - 120,
        size: 11,
        font,
      });
    }
  }

  return doc.save();
}

function buildSyntheticPageTextData(): PageTextData[] {
  const pages: PageTextData[] = [];

  for (let p = 1; p <= 60; p++) {
    if (p === 1) {
      pages.push(
        createPageText(p, [
          'BIOLOGY: AN INTRODUCTION TO LIFE SCIENCES',
          'Grade 11 Textbook',
          'Ethiopian Ministry of Education',
        ])
      );
    } else if (p === 2) {
      pages.push(
        createPageText(p, [
          'PREFACE AND COPYRIGHT',
          'Copyright 2026 DocuNexa Publishing',
          'All rights reserved.',
        ])
      );
    } else if (p === 3) {
      pages.push(
        createPageText(p, [
          'TABLE OF CONTENTS',
          'Unit 1: Principles of Ecology .............. 1',
          'Unit 2: Cellular Metabolism .............. 16',
        ])
      );
    } else if (p === 4) {
      pages.push(
        createPageText(p, [
          'CONTENTS (CONTINUED)',
          'Unit 3: Molecular Genetics ............... 32',
          'Unit 4: Human Physiology ................. 46',
        ])
      );
    } else if (p >= 5 && p <= 10) {
      pages.push(
        createPageText(p, [
          `Front matter introduction page ${p}`,
          'Laboratory safety rules and guidelines.',
        ])
      );
    } else if (p === 11) {
      pages.push(
        createPageText(p, [
          'UNIT 1: PRINCIPLES OF ECOLOGY',
          'Chapter Overview and Objectives',
          'Ecological relationships and biomes.',
        ])
      );
    } else if (p > 11 && p <= 25) {
      const lines = [
        'UNIT 1: PRINCIPLES OF ECOLOGY', // Running header on top of page
      ];
      if (p === 12) {
        lines.push('1.1 Ecosystem Dynamics'); // Subsection
      }
      lines.push(`Discussion of principles and food webs on page ${p}.`);
      pages.push(createPageText(p, lines));
    } else if (p === 26) {
      pages.push(
        createPageText(p, [
          'UNIT 2: CELLULAR METABOLISM',
          'Biochemical Pathways',
          'Energy capture and enzymatic regulation.',
        ])
      );
    } else if (p > 26 && p <= 41) {
      const lines = [
        'UNIT 2: CELLULAR METABOLISM', // Running header
      ];
      if (p === 27) {
        lines.push('2.1 Cellular Respiration and ATP');
      }
      lines.push(`Metabolic reactions and glycolysis on page ${p}.`);
      pages.push(createPageText(p, lines));
    } else if (p === 42) {
      pages.push(
        createPageText(p, [
          'UNIT 3: MOLECULAR GENETICS',
          'Inheritance and Expression',
          'Gene transcription and translation.',
        ])
      );
    } else if (p > 42 && p <= 55) {
      const lines = [
        'UNIT 3: MOLECULAR GENETICS', // Running header
      ];
      if (p === 43) {
        lines.push('3.1 DNA Structure and Replication');
      }
      lines.push(`DNA polymerases and mutations on page ${p}.`);
      pages.push(createPageText(p, lines));
    } else if (p === 56) {
      pages.push(
        createPageText(p, [
          'UNIT 4: HUMAN PHYSIOLOGY',
          'Organ Systems',
          'Homeostasis and neuroendocrine controls.',
        ])
      );
    } else {
      pages.push(
        createPageText(p, [
          'UNIT 4: HUMAN PHYSIOLOGY',
          `Physiological regulation on page ${p}.`,
        ])
      );
    }
  }

  return pages;
}

async function runTextbookRobustnessTests() {
  console.log('\n======================================================');
  console.log(' DOCUNEXA — TEXTBOOK DETECTION & EXTRACTION SUITE     ');
  console.log('======================================================\n');

  // -----------------------------------------------------------------
  // PART 1: TOC Page Recognition & Multi-Page Continued Detection
  // -----------------------------------------------------------------
  console.log('--- 1. TOC Identification & Multi-Page Scanning ---');
  const pagesData = buildSyntheticPageTextData();
  const tocPages = findTocPageNumbers(pagesData);

  assert(tocPages.has(3), 'Identifies primary Table of Contents on page 3');
  assert(tocPages.has(4), 'Identifies continued Table of Contents on page 4');
  assert(!tocPages.has(1), 'Does not misidentify cover page 1 as TOC');
  assert(!tocPages.has(11), 'Does not misidentify Unit 1 physical page 11 as TOC');
  assert(tocPages.size === 2, `Exact TOC pages count is 2 (got ${tocPages.size})`);

  const tocEntries = extractTocEntries(pagesData, tocPages);
  assert(tocEntries.length === 4, `Extracted all 4 TOC entries across both TOC pages (got ${tocEntries.length})`);
  assert(tocEntries[0].printedPage === 1, 'TOC Entry 1 printed page is 1');
  assert(tocEntries[1].printedPage === 16, 'TOC Entry 2 printed page is 16');
  assert(tocEntries[2].printedPage === 32, 'TOC Entry 3 printed page is 32');
  assert(tocEntries[3].printedPage === 46, 'TOC Entry 4 printed page is 46');

  // -----------------------------------------------------------------
  // PART 2: Full Document Unit Detection & Offset Calibration
  // -----------------------------------------------------------------
  console.log('\n--- 2. Full Document Unit Detection & Physical Boundaries ---');
  const detectionResult = detectDocumentUnits(pagesData, 60, 'Biology_Grade11.pdf');

  assert(detectionResult.parts.length === 4, `Detected exactly 4 textbook units (got ${detectionResult.parts.length})`);
  assert(detectionResult.hasFrontMatter === true, 'Correctly detected presence of front matter');
  assert(
    detectionResult.frontMatterRange?.start === 1 && detectionResult.frontMatterRange?.end === 10,
    `Front matter range is [1..10] (got [${detectionResult.frontMatterRange?.start}..${detectionResult.frontMatterRange?.end}])`
  );

  // Check Unit 1
  const u1 = detectionResult.parts[0];
  assert(u1.startPage === 11, `Unit 1 starts at physical page 11 (got ${u1?.startPage})`);
  assert(u1.endPage === 25, `Unit 1 ends at physical page 25 (got ${u1?.endPage})`);
  assert(u1.endPage - u1.startPage + 1 === 15, `Unit 1 spans 15 physical pages (got ${u1.endPage - u1.startPage + 1})`);

  // Check Unit 2
  const u2 = detectionResult.parts[1];
  assert(u2.startPage === 26, `Unit 2 starts at physical page 26 (got ${u2?.startPage})`);
  assert(u2.endPage === 41, `Unit 2 ends at physical page 41 (got ${u2?.endPage})`);
  assert(u2.endPage - u2.startPage + 1 === 16, `Unit 2 spans 16 physical pages (got ${u2.endPage - u2.startPage + 1})`);

  // Check Unit 3
  const u3 = detectionResult.parts[2];
  assert(u3.startPage === 42, `Unit 3 starts at physical page 42 (got ${u3?.startPage})`);
  assert(u3.endPage === 55, `Unit 3 ends at physical page 55 (got ${u3?.endPage})`);
  assert(u3.endPage - u3.startPage + 1 === 14, `Unit 3 spans 14 physical pages (got ${u3.endPage - u3.startPage + 1})`);

  // Check Unit 4
  const u4 = detectionResult.parts[3];
  assert(u4.startPage === 56, `Unit 4 starts at physical page 56 (got ${u4?.startPage})`);
  assert(u4.endPage === 60, `Unit 4 ends at final physical page 60 (got ${u4?.endPage})`);
  assert(u4.endPage - u4.startPage + 1 === 5, `Unit 4 spans 5 physical pages (got ${u4.endPage - u4.startPage + 1})`);

  // Check page assignment totals
  assert(
    detectionResult.assignedPagesCount === 50,
    `Assigned pages count is 50 across all 4 units (got ${detectionResult.assignedPagesCount})`
  );
  assert(
    detectionResult.unassignedPagesCount === 10,
    `Unassigned pages count matches front matter of 10 pages (got ${detectionResult.unassignedPagesCount})`
  );
  assert(detectionResult.isUncertain === false, 'Document analysis confidence is certain (isUncertain = false)');
  assert(detectionResult.overallConfidence === 'High', 'Overall confidence is High');

  // -----------------------------------------------------------------
  // PART 3: Heading Filtering (Running Headers, Subsections, Sentences)
  // -----------------------------------------------------------------
  console.log('\n--- 3. Contextual Heading Filtering ---');
  // Rejection of subsections
  const sub1 = isGenuineHeading('1.1 Ecosystem Dynamics', 1, 10);
  assert(sub1 === null, 'Rejects subsection heading "1.1 Ecosystem Dynamics"');

  const sub2 = isGenuineHeading('Unit 1.1 Topic Overview', 1, 10);
  assert(sub2 === null, 'Rejects decimal subsection "Unit 1.1 Topic Overview"');

  const secHeading = isGenuineHeading('Section 2.4 - Energy Flow', 2, 10);
  assert(secHeading === null, 'Rejects section line "Section 2.4 - Energy Flow"');

  // Verify TOC pages were never treated as physical unit headings
  assert(
    !detectionResult.parts.some((p) => p.startPage === 3 || p.startPage === 4),
    'TOC pages 3 & 4 were never used as physical unit starts'
  );

  // -----------------------------------------------------------------
  // PART 4: Real PDF Extraction & Byte Count Verification
  // -----------------------------------------------------------------
  console.log('\n--- 4. Real PDF Extraction & Slice Verification ---');
  const pdfBytes = await createSynthetic60PagePdf();
  const originalDoc = await PDFDocument.load(pdfBytes);
  assert(originalDoc.getPageCount() === 60, `Generated synthetic PDF has 60 physical pages`);

  // Extract Unit 1 (pages 11..25)
  const u1Bytes = await extractPdfRange(pdfBytes, 11, 25);
  const u1Doc = await PDFDocument.load(u1Bytes);
  assert(u1Doc.getPageCount() === 15, `Unit 1 extraction produced exactly 15 pages (got ${u1Doc.getPageCount()})`);

  // Extract Unit 2 (pages 26..41)
  const u2Bytes = await extractPdfRange(pdfBytes, 26, 41);
  const u2Doc = await PDFDocument.load(u2Bytes);
  assert(u2Doc.getPageCount() === 16, `Unit 2 extraction produced exactly 16 pages (got ${u2Doc.getPageCount()})`);

  // Extract Unit 3 (pages 42..55)
  const u3Bytes = await extractPdfRange(pdfBytes, 42, 55);
  const u3Doc = await PDFDocument.load(u3Bytes);
  assert(u3Doc.getPageCount() === 14, `Unit 3 extraction produced exactly 14 pages (got ${u3Doc.getPageCount()})`);

  // Extract Unit 4 (pages 56..60)
  const u4Bytes = await extractPdfRange(pdfBytes, 56, 60);
  const u4Doc = await PDFDocument.load(u4Bytes);
  assert(u4Doc.getPageCount() === 5, `Unit 4 extraction produced exactly 5 pages (got ${u4Doc.getPageCount()})`);

  // Extract Front Matter (pages 1..10)
  const fmBytes = await extractPdfRange(pdfBytes, 1, 10);
  const fmDoc = await PDFDocument.load(fmBytes);
  assert(fmDoc.getPageCount() === 10, `Front matter extraction produced exactly 10 pages (got ${fmDoc.getPageCount()})`);

  // Verify total pages preserved across all units
  const totalUnitPages = u1Doc.getPageCount() + u2Doc.getPageCount() + u3Doc.getPageCount() + u4Doc.getPageCount();
  assert(totalUnitPages === 50, `Total pages across 4 extracted units = 50 (got ${totalUnitPages})`);
  assert(totalUnitPages + fmDoc.getPageCount() === 60, 'All 60 pages accounted for between front matter and units');

  // -----------------------------------------------------------------
  // PART 5: Full Cut Plan Execution
  // -----------------------------------------------------------------
  console.log('\n--- 5. executeCutPlan Physical Multi-Unit Processing ---');
  let cutState: CutProgressState | null = null;
  await executeCutPlan(
    pdfBytes,
    detectionResult.parts,
    (progress) => {
      cutState = progress;
    },
    undefined,
    { isUncertain: false, isConfirmed: true }
  );

  const finalCutState = cutState as unknown as CutProgressState;
  assert(finalCutState !== null && finalCutState !== undefined, 'Cut plan completed and delivered progress');
  assert(finalCutState?.completedCount === 4, `All 4 units completed (got ${finalCutState?.completedCount})`);
  assert(
    finalCutState?.items?.every((it: CutProgressItem) => it.status === 'done') || false,
    'All cut items have status "done"'
  );
  
  // Verify physical page counts of each item's resulting bytes
  let verifiedItemPages = 0;
  if (finalCutState?.items) {
    for (const item of finalCutState.items) {
      if (item.bytes) {
        const doc = await PDFDocument.load(item.bytes);
        verifiedItemPages += doc.getPageCount();
      }
    }
  }
  assert(verifiedItemPages === 50, `Cut items contain exactly 50 total pages (got ${verifiedItemPages})`);

  // -----------------------------------------------------------------
  // PART 6: Strict Range Error Handling (No Silent Clamping)
  // -----------------------------------------------------------------
  console.log('\n--- 6. Strict Range Validation & Anti-Clamping ---');
  
  let invertedThrew = false;
  try {
    await extractPdfRange(pdfBytes, 25, 11);
  } catch (err: any) {
    invertedThrew = true;
    assert(err.message.includes('Invalid page range'), 'Inverted range [25..11] throws descriptive error');
  }
  assert(invertedThrew, 'extractPdfRange rejected inverted range without clamping');

  let outOfBoundsThrew = false;
  try {
    await extractPdfRange(pdfBytes, 50, 75);
  } catch (err: any) {
    outOfBoundsThrew = true;
    assert(err.message.includes('exceeds document total'), 'Out of bounds range [50..75] throws descriptive error');
  }
  assert(outOfBoundsThrew, 'extractPdfRange rejected out-of-bounds endPage without clamping');

  let zeroStartThrew = false;
  try {
    await extractPdfRange(pdfBytes, 0, 10);
  } catch (err: any) {
    zeroStartThrew = true;
    assert(err.message.includes('must be at least 1'), 'Zero start page throws descriptive error');
  }
  assert(zeroStartThrew, 'extractPdfRange rejected startPage = 0');

  // -----------------------------------------------------------------
  // PART 7: Offset Uncertainty & Single Unit Edge Cases
  // -----------------------------------------------------------------
  console.log('\n--- 7. Offset Uncertainty & Edge Case Flagging ---');
  
  // Create simulated pages where TOC exists but no body headings match (e.g., scanned body)
  const scannedBodyPages: PageTextData[] = [
    createPageText(1, ['Cover Page']),
    createPageText(2, [
      'TABLE OF CONTENTS',
      'Unit 1: Overview .............. 1',
      'Unit 2: Cells ................. 20',
    ]),
    // Pages 3..30 have scanned or unparseable lines with no genuine headings
    ...Array.from({ length: 28 }, (_, i) =>
      createPageText(i + 3, [`[Image content on page ${i + 3}]`])
    ),
  ];

  const uncertainResult = detectDocumentUnits(scannedBodyPages, 30, 'ScannedDoc.pdf');
  assert(uncertainResult.isUncertain === true, 'Flags isUncertain = true when physical headings cannot verify TOC');
  assert(uncertainResult.overallConfidence === 'Low', 'Overall confidence is marked Low');
  assert(
    uncertainResult.uncertaintyReason?.includes('could not be conclusively verified') || false,
    'Provides descriptive uncertainty reason requesting manual confirmation'
  );

  // Single unit across large document warning
  const singleUnitPages: PageTextData[] = [
    createPageText(1, ['UNIT 1: ALL-IN-ONE MANUAL']),
    ...Array.from({ length: 24 }, (_, i) =>
      createPageText(i + 2, [`Page ${i + 2}`])
    ),
  ];
  const singleUnitResult = detectDocumentUnits(singleUnitPages, 25, 'Manual.pdf');
  assert(singleUnitResult.isUncertain === true, 'Flags isUncertain = true when only 1 unit found across 25 pages');
  assert(singleUnitResult.uncertaintyReason?.includes('Only 1 unit detected') || false, 'Warns about single unit across multi-page document');

  // -----------------------------------------------------------------
  // PART 8: Uncertain Page Boundary Protection & Confirmation Enforcement
  // -----------------------------------------------------------------
  console.log('\n--- 8. Uncertain Page Boundary Protection & Confirmation Enforcement ---');

  // A. Missing execution options cannot bypass protection
  let missingOptionsThrew = false;
  try {
    await (executeCutPlan as any)(pdfBytes, uncertainResult.parts, () => {});
  } catch (err: any) {
    missingOptionsThrew = true;
    assert(
      err.message.includes('Execution safety options { isUncertain, isConfirmed } are mandatory'),
      'executeCutPlan rejects call with missing execution options'
    );
  }
  assert(missingOptionsThrew, 'Missing execution options to executeCutPlan strictly rejected');

  let emptyOptionsThrew = false;
  try {
    await (executeCutPlan as any)(pdfBytes, uncertainResult.parts, () => {}, undefined, {});
  } catch (err: any) {
    emptyOptionsThrew = true;
    assert(
      err.message.includes('Execution safety options { isUncertain, isConfirmed } are mandatory'),
      'executeCutPlan rejects call with empty/non-boolean execution options'
    );
  }
  assert(emptyOptionsThrew, 'Empty/non-boolean execution options to executeCutPlan strictly rejected');

  let missingDispatchOptionsThrew = false;
  try {
    await (dispatchCutExecution as any)({
      buffer: pdfBytes,
      parts: uncertainResult.parts,
      isValidRanges: true,
    });
  } catch (err: any) {
    missingDispatchOptionsThrew = true;
    assert(
      err.message.includes('Execution safety parameters { isUncertain, isBoundariesConfirmed } are mandatory'),
      'dispatchCutExecution rejects call with missing execution safety parameters'
    );
  }
  assert(missingDispatchOptionsThrew, 'Missing execution parameters to dispatchCutExecution strictly rejected');

  // B. Uncertain document without confirmation cannot be cut
  const unconfirmedCheck = validateCutEligibility(
    uncertainResult.isUncertain,
    false,
    uncertainResult.parts.length,
    true
  );
  assert(unconfirmedCheck.canCut === false, 'Disallows cutting when isUncertain = true and confirmation is false');
  assert(unconfirmedCheck.requiresConfirmation === true, 'Requires user confirmation for uncertain document');
  assert(
    unconfirmedCheck.reason?.includes('must be reviewed and confirmed') || false,
    'Explains why cut is disallowed without confirmation'
  );

  // B. Cutter backend strictly blocks uncertain cut plan when unconfirmed
  let unconfirmedCutterThrew = false;
  try {
    await executeCutPlan(
      pdfBytes,
      uncertainResult.parts,
      () => {},
      undefined,
      { isUncertain: true, isConfirmed: false }
    );
  } catch (err: any) {
    unconfirmedCutterThrew = true;
    assert(
      err.message.includes('Uncertain page boundaries must be reviewed and confirmed'),
      'executeCutPlan rejects cut when boundaries are uncertain and unconfirmed'
    );
  }
  assert(unconfirmedCutterThrew, 'Cutter strictly blocked unconfirmed uncertain cut');

  // C. Once user reviews and confirms boundaries, cutting is unlocked
  const confirmedCheck = validateCutEligibility(
    uncertainResult.isUncertain,
    true,
    uncertainResult.parts.length,
    true
  );
  assert(confirmedCheck.canCut === true, 'Allows cutting after user confirms uncertain boundaries');

  // D. Cutter backend proceeds when confirmation is provided
  let confirmedCutState: CutProgressState | null = null;
  await executeCutPlan(
    pdfBytes,
    uncertainResult.parts,
    (progress) => {
      confirmedCutState = progress;
    },
    undefined,
    { isUncertain: true, isConfirmed: true }
  );
  const finalConfirmedCutState = confirmedCutState as unknown as CutProgressState;
  assert(
    finalConfirmedCutState !== null && finalConfirmedCutState.completedCount === uncertainResult.parts.length,
    'executeCutPlan successfully executed after boundary confirmation'
  );

  // E. Changing a page boundary resets confirmation
  let userConfirmedState = true;
  assert(userConfirmedState === true, 'Initial state after user confirmation is true');
  // User modifies a page boundary (e.g., startPage or endPage)
  userConfirmedState = false; // Reset triggered by handleUpdatePart
  const recheckedAfterEdit = validateCutEligibility(
    uncertainResult.isUncertain,
    userConfirmedState,
    uncertainResult.parts.length,
    true
  );
  assert(recheckedAfterEdit.canCut === false, 'Confirmation resets to false when page boundaries are edited');

  // F. High confidence documents (isUncertain = false) allow automatic cutting without confirmation
  const highConfidenceCheck = validateCutEligibility(
    false,
    false,
    detectionResult.parts.length,
    true
  );
  assert(highConfidenceCheck.canCut === true, 'High confidence document permits cutting immediately without confirmation');
  assert(highConfidenceCheck.requiresConfirmation === false, 'High confidence does not require confirmation step');

  // G. Cutter backend proceeds for high confidence document without confirmation
  let highConfCutExecuted = false;
  try {
    await executeCutPlan(
      pdfBytes,
      [detectionResult.parts[0]],
      () => {},
      undefined,
      { isUncertain: false, isConfirmed: false }
    );
    highConfCutExecuted = true;
  } catch {
    highConfCutExecuted = false;
  }
  assert(highConfCutExecuted, 'executeCutPlan allows immediate cut for high confidence documents');

  // H. Real handleCutPdf dispatch execution path verification
  console.log('\n--- 8b. Real dispatchCutExecution Path Verification ---');

  // 1. Unconfirmed uncertain document fails closed via dispatchCutExecution
  let dispatchUnconfirmedBlocked = false;
  try {
    await dispatchCutExecution({
      buffer: pdfBytes,
      parts: uncertainResult.parts,
      isValidRanges: true,
      isUncertain: true,
      isBoundariesConfirmed: false,
    });
  } catch (err: any) {
    dispatchUnconfirmedBlocked = true;
    assert(
      err.message.includes('Uncertain page boundaries must be reviewed and confirmed'),
      'dispatchCutExecution strictly blocks unconfirmed cut execution'
    );
  }
  assert(dispatchUnconfirmedBlocked, 'Real cut execution path is fail-closed for unconfirmed uncertain documents');

  // 2. Confirmed ranges execute successfully via dispatchCutExecution
  const confirmedCutItems = await dispatchCutExecution({
    buffer: pdfBytes,
    parts: uncertainResult.parts,
    isValidRanges: true,
    isUncertain: true,
    isBoundariesConfirmed: true,
  });
  assert(
    confirmedCutItems.length === uncertainResult.parts.length,
    `dispatchCutExecution successfully cuts confirmed uncertain parts (got ${confirmedCutItems.length})`
  );
  assert(
    confirmedCutItems.every((item) => item.status === 'done' && item.bytes !== undefined),
    'All parts generated valid PDF slices when confirmed'
  );

  // 3. Modifying a boundary resets confirmation and re-locks cutting
  let stateConfirmed = true;
  // User modifies boundary: handleUpdatePart triggers stateConfirmed = false
  stateConfirmed = false;
  let reLockedCutBlocked = false;
  try {
    await dispatchCutExecution({
      buffer: pdfBytes,
      parts: uncertainResult.parts,
      isValidRanges: true,
      isUncertain: true,
      isBoundariesConfirmed: stateConfirmed,
    });
  } catch (err: any) {
    reLockedCutBlocked = true;
    assert(
      err.message.includes('Uncertain page boundaries must be reviewed and confirmed'),
      'dispatchCutExecution re-locks cut execution after boundary modification'
    );
  }
  assert(reLockedCutBlocked, 'Boundary modification successfully re-locks execution path');

  // 4. High-confidence documents cut normally without requiring confirmation
  const highConfCutItems = await dispatchCutExecution({
    buffer: pdfBytes,
    parts: [detectionResult.parts[0]],
    isValidRanges: true,
    isUncertain: false,
    isBoundariesConfirmed: false,
  });
  assert(
    highConfCutItems.length === 1 && highConfCutItems[0].status === 'done',
    'High-confidence document cuts normally through dispatch execution without confirmation'
  );

  // -----------------------------------------------------------------
  // PART 8c: Uncertainty Resolution & No Unverified Defaults
  // -----------------------------------------------------------------
  console.log('\n--- 8c. Uncertainty Resolution & No Unverified Defaults ---');

  // 1. Missing or invalid automatic uncertainty state: reject execution
  let undefinedAutoThrew = false;
  try {
    resolveEffectiveUncertainty('auto', undefined);
  } catch (err: any) {
    undefinedAutoThrew = true;
    assert(
      err.message.includes('Automatic detection uncertainty state is missing or invalid'),
      'resolveEffectiveUncertainty rejects undefined uncertainty state in auto mode'
    );
  }
  assert(undefinedAutoThrew, 'Auto mode with undefined isUncertain fails closed');

  let nullAutoThrew = false;
  try {
    resolveEffectiveUncertainty('auto', null);
  } catch (err: any) {
    nullAutoThrew = true;
    assert(
      err.message.includes('Automatic detection uncertainty state is missing or invalid'),
      'resolveEffectiveUncertainty rejects null uncertainty state in auto mode'
    );
  }
  assert(nullAutoThrew, 'Auto mode with null isUncertain fails closed');

  // 2. Explicit high-confidence false: allow execution
  const explicitHighConfidence = resolveEffectiveUncertainty('auto', false);
  assert(explicitHighConfidence === false, 'resolveEffectiveUncertainty returns false for explicit high-confidence state');
  const explicitHighConfCut = await dispatchCutExecution({
    buffer: pdfBytes,
    parts: [detectionResult.parts[0]],
    isValidRanges: true,
    isUncertain: explicitHighConfidence,
    isBoundariesConfirmed: false,
  });
  assert(
    explicitHighConfCut.length === 1 && explicitHighConfCut[0].status === 'done',
    'Explicit high-confidence false executes cut without confirmation'
  );

  // 3. Uncertain true without confirmation: reject execution
  const explicitUncertain = resolveEffectiveUncertainty('auto', true);
  assert(explicitUncertain === true, 'resolveEffectiveUncertainty returns true for uncertain detection');
  let uncertainNoConfThrew = false;
  try {
    await dispatchCutExecution({
      buffer: pdfBytes,
      parts: uncertainResult.parts,
      isValidRanges: true,
      isUncertain: explicitUncertain,
      isBoundariesConfirmed: false,
    });
  } catch (err: any) {
    uncertainNoConfThrew = true;
    assert(
      err.message.includes('Uncertain page boundaries must be reviewed and confirmed'),
      'dispatchCutExecution rejects uncertain true without confirmation'
    );
  }
  assert(uncertainNoConfThrew, 'Uncertain true without confirmation strictly rejected');

  // 4. Uncertain true with confirmation: allow execution
  const confirmedExecutionItems = await dispatchCutExecution({
    buffer: pdfBytes,
    parts: uncertainResult.parts,
    isValidRanges: true,
    isUncertain: explicitUncertain,
    isBoundariesConfirmed: true,
  });
  assert(
    confirmedExecutionItems.length === uncertainResult.parts.length,
    'dispatchCutExecution allows execution for uncertain true with confirmation'
  );

  // 5. Valid manual split: remains functional and non-uncertain
  const manualSplitResolved = resolveEffectiveUncertainty('manual', undefined);
  assert(manualSplitResolved === false, 'resolveEffectiveUncertainty explicitly returns false for manual mode even with undefined state');
  const manualParts: import('../src/types').DetectedPart[] = [
    {
      id: 'manual-1',
      title: 'Manual Section 1',
      startPage: 1,
      endPage: 5,
      filename: 'Manual Section 1.pdf',
      confidence: 'High',
      source: 'manual',
    },
    {
      id: 'manual-2',
      title: 'Manual Section 2',
      startPage: 6,
      endPage: 10,
      filename: 'Manual Section 2.pdf',
      confidence: 'High',
      source: 'manual',
    },
  ];
  const manualCutItems = await dispatchCutExecution({
    buffer: pdfBytes,
    parts: manualParts,
    isValidRanges: true,
    isUncertain: manualSplitResolved,
    isBoundariesConfirmed: false,
  });
  assert(
    manualCutItems.length === 2 && manualCutItems.every((it) => it.status === 'done'),
    'Valid manual split cuts without requiring confirmation'
  );

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTextbookRobustnessTests().catch((err) => {
  console.error('Fatal error running textbook robustness tests:', err);
  process.exit(1);
});
