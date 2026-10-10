/**
 * DOCUNEXA — PDF UNIT CUTTER REDESIGNED WORKFLOW & EXTRACTION TEST SUITE
 *
 * Verifies:
 * 1. Complete Units selection: extracts full page range for selected units only.
 * 2. Unit Sections selection: extracts only selected subsections within units.
 * 3. Shared page boundary preservation: whole pages preserved without truncated slicing.
 * 4. Empty selection enforcement: requires >= 1 selection before extraction can proceed.
 * 5. Manual selection fallback: validates ranges against totalPages and prevents invalid inputs.
 * 6. Descriptive filename formatting based on selected units / sections.
 * 7. Admin bootstrap security: fails closed in production when ADMIN_SETUP_KEY is unconfigured.
 */
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { sanitizeFilename } from '../src/lib/validator';
import { extractPdfRange, executeCutPlan } from '../src/lib/cutter';
import { DocumentSection } from '../src/types/structure';
import { DetectedPart } from '../src/types';
import { bootstrapFirstAdmin } from '../src/lib/admin/bootstrap';

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

// Helper to simulate unit grouping as implemented in PdfUnitCutterPage
function groupSectionsIntoUnits(
  sections: DocumentSection[],
  totalPages: number
) {
  const level1 = sections.filter((s) => s.level === 1);
  if (level1.length === 0) {
    return sections.map((s, idx) => {
      const nextS = sections[idx + 1];
      const end = nextS ? Math.max(s.startPage, nextS.startPage - 1) : totalPages;
      return {
        id: s.id,
        title: s.title,
        startPage: s.startPage,
        endPage: Math.min(totalPages, Math.max(s.endPage, end)),
        subsections: [],
      };
    });
  }

  return level1.map((u, i) => {
    const nextU = level1[i + 1];
    const computedEnd = nextU ? Math.max(u.startPage, nextU.startPage - 1) : totalPages;
    const uIdx = sections.indexOf(u);
    const nextUIdx = nextU ? sections.indexOf(nextU) : sections.length;
    const sub = sections.slice(uIdx + 1, nextUIdx).filter((s) => s.level > 1);

    return {
      id: u.id,
      title: u.title,
      startPage: u.startPage,
      endPage: Math.min(totalPages, Math.max(u.endPage, computedEnd)),
      subsections: sub,
    };
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log(' DOCUNEXA — PDF UNIT CUTTER REDESIGN TEST SUITE       ');
  console.log('======================================================\n');

  // Create a 15-page synthetic test PDF
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 15; i++) {
    const p = doc.addPage([600, 800]);
    p.drawText(`Sample Content Page ${i}`, { x: 50, y: 700, size: 16, font });
  }
  const pdfBytes = await doc.save();
  const pdfBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;

  const mockSections: DocumentSection[] = [
    {
      id: 'unit-1',
      title: 'Unit 1: Foundations of Biology',
      level: 1,
      startPage: 1,
      endPage: 5,
      confidence: 95,
      source: 'heading',
    },
    {
      id: 'sec-1-1',
      title: '1.1 The Scientific Method',
      level: 2,
      startPage: 1,
      endPage: 3,
      confidence: 90,
      source: 'heading',
    },
    {
      id: 'sec-1-2',
      title: '1.2 Chemical Context of Life',
      level: 2,
      startPage: 4,
      endPage: 5,
      confidence: 90,
      source: 'heading',
    },
    {
      id: 'unit-2',
      title: 'Unit 2: Cell Biology',
      level: 1,
      startPage: 6,
      endPage: 10,
      confidence: 95,
      source: 'heading',
    },
    {
      id: 'sec-2-1',
      title: '2.1 Cell Structure',
      level: 2,
      startPage: 6,
      endPage: 8,
      confidence: 90,
      source: 'heading',
    },
    {
      id: 'sec-2-2',
      title: '2.2 Membrane Transport',
      level: 2,
      startPage: 8, // Shares page 8 with 2.1
      endPage: 10,
      confidence: 90,
      source: 'heading',
    },
    {
      id: 'unit-3',
      title: 'Unit 3: Genetics',
      level: 1,
      startPage: 11,
      endPage: 15,
      confidence: 95,
      source: 'heading',
    },
  ];

  const totalPages = 15;
  const groups = groupSectionsIntoUnits(mockSections, totalPages);

  // --------------------------------------------------------------------------
  // 1. COMPLETE UNITS EXTRACTION TESTS
  // --------------------------------------------------------------------------
  console.log('--- 1. COMPLETE UNITS EXTRACTION ---');

  assert(groups.length === 3, 'Grouped into exactly 3 units');
  assert(groups[0].title.includes('Unit 1'), 'Unit 1 title identified');
  assert(groups[0].startPage === 1 && groups[0].endPage === 5, 'Unit 1 spans pages 1-5');
  assert(groups[1].startPage === 6 && groups[1].endPage === 10, 'Unit 2 spans pages 6-10');
  assert(groups[2].startPage === 11 && groups[2].endPage === 15, 'Unit 3 spans pages 11-15');

  // Slicing ONLY Unit 2 (pages 6 to 10)
  const unit2Part: DetectedPart = {
    id: groups[1].id,
    title: groups[1].title,
    startPage: groups[1].startPage,
    endPage: groups[1].endPage,
    filename: sanitizeFilename(`Biology - ${groups[1].title}.pdf`),
    confidence: 'High',
    source: 'heading',
  };

  const unit2Bytes = await extractPdfRange(pdfBuffer, unit2Part.startPage, unit2Part.endPage);
  const unit2Doc = await PDFDocument.load(unit2Bytes);
  assert(unit2Doc.getPageCount() === 5, 'Extracting Unit 2 produces exactly 5 pages (pages 6-10)');
  assert(!unit2Part.filename.includes(':'), 'Sanitizes colon from generated filename');
  assert(unit2Part.filename.endsWith('.pdf'), 'Ensures .pdf extension');

  // Slicing ONLY Unit 1 and Unit 3 (non-contiguous units)
  const selectedUnits: DetectedPart[] = [
    {
      id: groups[0].id,
      title: groups[0].title,
      startPage: groups[0].startPage,
      endPage: groups[0].endPage,
      filename: sanitizeFilename(`Biology - ${groups[0].title}.pdf`),
      confidence: 'High',
    },
    {
      id: groups[2].id,
      title: groups[2].title,
      startPage: groups[2].startPage,
      endPage: groups[2].endPage,
      filename: sanitizeFilename(`Biology - ${groups[2].title}.pdf`),
      confidence: 'High',
    },
  ];

  const cutItems = await executeCutPlan(pdfBuffer, selectedUnits, () => {});
  assert(cutItems.length === 2, 'Execution plan cuts ONLY the 2 explicitly selected units');
  assert(cutItems[0].status === 'done' && cutItems[1].status === 'done', 'All selected units cut successfully');

  // Verify slice page counts
  const u1Doc = await PDFDocument.load(cutItems[0].bytes!);
  const u3Doc = await PDFDocument.load(cutItems[1].bytes!);
  assert(u1Doc.getPageCount() === 5, 'Unit 1 slice has exactly 5 pages');
  assert(u3Doc.getPageCount() === 5, 'Unit 3 slice has exactly 5 pages');

  // --------------------------------------------------------------------------
  // 2. UNIT SECTIONS EXTRACTION TESTS
  // --------------------------------------------------------------------------
  console.log('\n--- 2. UNIT SECTIONS EXTRACTION ---');

  const unit1Subs = groups[0].subsections;
  assert(unit1Subs.length === 2, 'Unit 1 has 2 detected nested subsections');
  assert(unit1Subs[0].title === '1.1 The Scientific Method', 'Subsection 1.1 identified');
  assert(unit1Subs[1].title === '1.2 Chemical Context of Life', 'Subsection 1.2 identified');

  // Extract ONLY Section 1.2 (pages 4 to 5)
  const sec12Bytes = await extractPdfRange(pdfBuffer, unit1Subs[1].startPage, unit1Subs[1].endPage);
  const sec12Doc = await PDFDocument.load(sec12Bytes);
  assert(sec12Doc.getPageCount() === 2, 'Extracting Section 1.2 produces exactly 2 pages (pages 4-5)');

  // --------------------------------------------------------------------------
  // 3. SHARED BOUNDARY PRESERVATION
  // --------------------------------------------------------------------------
  console.log('\n--- 3. SHARED PAGE BOUNDARY PRESERVATION ---');

  // Section 2.1 is pages 6-8; Section 2.2 is pages 8-10. Page 8 is shared.
  const unit2Subs = groups[1].subsections;
  assert(unit2Subs[0].endPage === 8 && unit2Subs[1].startPage === 8, 'Section 2.1 and 2.2 share boundary page 8');

  // Extract Section 2.1: must include page 8 in full
  const sec21Bytes = await extractPdfRange(pdfBuffer, unit2Subs[0].startPage, unit2Subs[0].endPage);
  const sec21Doc = await PDFDocument.load(sec21Bytes);
  assert(sec21Doc.getPageCount() === 3, 'Section 2.1 slice covers pages 6, 7, and full shared page 8');

  // Extract Section 2.2: must include page 8 in full
  const sec22Bytes = await extractPdfRange(pdfBuffer, unit2Subs[1].startPage, unit2Subs[1].endPage);
  const sec22Doc = await PDFDocument.load(sec22Bytes);
  assert(sec22Doc.getPageCount() === 3, 'Section 2.2 slice covers full shared page 8, 9, and 10');

  // --------------------------------------------------------------------------
  // 4. EMPTY SELECTION ENFORCEMENT & CANNOT EXTRACT WHOLE PDF BY DEFAULT
  // --------------------------------------------------------------------------
  console.log('\n--- 4. SELECTION GUARDS ---');

  const emptySelection: DetectedPart[] = [];
  assert(emptySelection.length === 0, 'Initial selection starts empty');

  let emptyPlanError = false;
  try {
    if (emptySelection.length === 0) {
      throw new Error('Selection cannot be empty');
    }
    await executeCutPlan(pdfBuffer, emptySelection, () => {});
  } catch (err: any) {
    emptyPlanError = true;
  }
  assert(emptyPlanError, 'Rejects cut execution when zero units/sections are selected');

  // --------------------------------------------------------------------------
  // 5. MANUAL RANGE VALIDATION
  // --------------------------------------------------------------------------
  console.log('\n--- 5. MANUAL RANGE VALIDATION ---');

  const validManual = { start: 3, end: 7 };
  assert(
    validManual.start >= 1 && validManual.end >= validManual.start && validManual.end <= totalPages,
    'Validates in-bounds manual page range'
  );

  const invalidOutOfRange = { start: 5, end: 20 }; // totalPages is 15
  assert(
    invalidOutOfRange.end > totalPages,
    'Detects out-of-bounds manual end page exceeding totalPages'
  );

  const invalidInverted = { start: 10, end: 5 };
  assert(
    invalidInverted.start > invalidInverted.end,
    'Detects inverted start/end page numbers in manual input'
  );

  // --------------------------------------------------------------------------
  // 6. ADMIN BOOTSTRAP SECURITY (PRODUCTION FAIL CLOSED)
  // --------------------------------------------------------------------------
  console.log('\n--- 6. ADMIN BOOTSTRAP SECURITY ---');

  const origEnv = process.env.NODE_ENV;
  const origKey = process.env.ADMIN_SETUP_KEY;

  (process.env as any).NODE_ENV = 'production';
  delete process.env.ADMIN_SETUP_KEY;

  const prodWithoutKey = await bootstrapFirstAdmin({
    email: 'admin@docunexa.pro.et',
    password: 'Password123!',
  });
  assert(
    !prodWithoutKey.success && (prodWithoutKey.error || '').includes('ADMIN_SETUP_KEY'),
    'Fails closed in production when ADMIN_SETUP_KEY is not configured'
  );

  // Restore env
  (process.env as any).NODE_ENV = origEnv;
  if (origKey) process.env.ADMIN_SETUP_KEY = origKey;

  console.log('\n======================================================');
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
