import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import {
  detectDocumentStructure,
  extractOutlineStructure,
  detectTocStructure,
  detectHeadingsStructure,
  classifyDocumentText,
  parseTocLines,
  isConversationalSentence,
  parseNumberString,
  validateSectionInvariants,
  splitSection,
  mergeSections,
  createManualSection,
  ExtractedPageText
} from '../src/lib/structureDetector';
import { DocumentSection, DocumentStructure } from '../src/types/structure';
import { getPdfJs, getPdfJsDocumentParams } from '../src/lib/pdfReader';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`  ✓ PASS: ${message}`);
}

function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
}

// --------------------------------------------------------------------------
// Deterministic Test PDF Generators
// --------------------------------------------------------------------------

// A. PDF with Outline Bookmarks
async function createOutlinePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= 6; i++) {
    const page = doc.addPage([600, 800]);
    page.drawText(`Content of Page ${i}`, { x: 50, y: 700, size: 18, font });
  }

  // Save document with genuine outline structure
  return await doc.save();
}

// B & C. PDF with TOC and Printed Page Offset
async function createTocPdfWithOffset(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  // Pages 1-2: Front matter (Title page, Dedication)
  const p1 = doc.addPage([600, 800]);
  p1.drawText('PHYSICS FOR ENGINEERS', { x: 50, y: 700, size: 24, font });

  const p2 = doc.addPage([600, 800]);
  p2.drawText('Published by DocuNexa Press', { x: 50, y: 700, size: 14, font });

  // Page 3: Table of Contents (Printed page 1 starts on PDF page 4 -> offset = +3)
  const p3 = doc.addPage([600, 800]);
  p3.drawText('TABLE OF CONTENTS', { x: 50, y: 720, size: 20, font });
  p3.drawText('Unit 1: Classical Mechanics ......... 1', { x: 50, y: 680, size: 12, font });
  p3.drawText('Unit 2: Thermodynamics ............. 4', { x: 50, y: 650, size: 12, font });
  p3.drawText('Unit 3: Electromagnetism ............ 7', { x: 50, y: 620, size: 12, font });

  // Pages 4-6: Unit 1 (Printed pp 1-3)
  const p4 = doc.addPage([600, 800]);
  p4.drawText('UNIT 1: CLASSICAL MECHANICS', { x: 50, y: 720, size: 20, font });
  p4.drawText('Newtonian laws govern macroscopic kinematics.', { x: 50, y: 680, size: 12, font });

  const p5 = doc.addPage([600, 800]);
  p5.drawText('Conservation of linear momentum.', { x: 50, y: 700, size: 12, font });

  const p6 = doc.addPage([600, 800]);
  p6.drawText('Rotational motion and torque.', { x: 50, y: 700, size: 12, font });

  // Pages 7-9: Unit 2 (Printed pp 4-6, PDF pp 7-9)
  const p7 = doc.addPage([600, 800]);
  p7.drawText('UNIT 2: THERMODYNAMICS', { x: 50, y: 720, size: 20, font });
  p7.drawText('Heat capacity and enthalpy relations.', { x: 50, y: 680, size: 12, font });

  const p8 = doc.addPage([600, 800]);
  p8.drawText('Entropy and the Carnot cycle.', { x: 50, y: 700, size: 12, font });

  const p9 = doc.addPage([600, 800]);
  p9.drawText('Phase transitions and latent heat.', { x: 50, y: 700, size: 12, font });

  // Page 10: Unit 3 (Printed p 7, PDF p 10)
  const p10 = doc.addPage([600, 800]);
  p10.drawText('UNIT 3: ELECTROMAGNETISM', { x: 50, y: 720, size: 20, font });

  return await doc.save();
}

// D & E. PDF with Hierarchical & Numbered Headings
async function createHierarchicalHeadingPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const p1 = doc.addPage([600, 800]);
  p1.drawText('UNIT 1: CELL BIOLOGY', { x: 50, y: 720, size: 22, font });
  p1.drawText('1.1 Cell Membrane Structure', { x: 50, y: 660, size: 14, font });

  const p2 = doc.addPage([600, 800]);
  p2.drawText('1.2 Organelles and Cytoplasm', { x: 50, y: 700, size: 14, font });

  const p3 = doc.addPage([600, 800]);
  p3.drawText('UNIT 2: GENETICS', { x: 50, y: 720, size: 22, font });
  p3.drawText('2.1 Mendelian Inheritance', { x: 50, y: 660, size: 14, font });

  return await doc.save();
}

// F. Mixed Scanned & Text PDF
async function createMixedScannedPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  // Page 1: Digital text
  const p1 = doc.addPage([600, 800]);
  p1.drawText('CHAPTER 1: INTRODUCTION', { x: 50, y: 700, size: 20, font });
  p1.drawText('Digital text available on this page.', { x: 50, y: 650, size: 12, font });

  // Page 2: Empty / scanned placeholder (no text stream)
  doc.addPage([600, 800]);

  return await doc.save();
}

// G. Scanned-only PDF (Zero text items on any page)
async function createScannedOnlyPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  // Pages with no text drawing whatsoever
  doc.addPage([600, 800]);
  doc.addPage([600, 800]);
  return await doc.save();
}

async function runUnitCutter2Tests() {
  console.log('================================================================');
  console.log(' DOCUNEXA — PDF UNIT CUTTER 2.0 (PHASE 1) TEST SUITE');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // 1. CONTEXTUAL FALSE POSITIVE FILTERING
  // --------------------------------------------------------------------------
  console.log('[1/7] Testing Contextual Filtering (No False Structures)...');

  assert(isConversationalSentence('In Unit 1 we learned that cells reproduce.'), 'Rejects "In Unit 1 we learned..."');
  assert(isConversationalSentence('As discussed in Chapter 2, enzymes catalyze reactions.'), 'Rejects "As discussed in Chapter 2..."');
  assert(isConversationalSentence('Refer to Module 1 for further readings.'), 'Rejects "Refer to Module 1..."');
  assert(isConversationalSentence('Unit 1 review questions:'), 'Rejects "Unit 1 review questions:"');
  assert(isConversationalSentence('Figure 1: Cross-section of chloroplast.'), 'Rejects "Figure 1:"');
  assert(isConversationalSentence('Exercise 1: Solve for velocity.'), 'Rejects "Exercise 1:"');
  assert(isConversationalSentence('Question 1: Define momentum.'), 'Rejects "Question 1:"');
  assert(!isConversationalSentence('UNIT 1: INTRODUCTION TO MECHANICS'), 'Accepts genuine heading "UNIT 1: INTRODUCTION TO MECHANICS"');
  assert(!isConversationalSentence('Chapter 3 - The Digestive System'), 'Accepts genuine heading "Chapter 3 - The Digestive System"');

  // --------------------------------------------------------------------------
  // 2. NUMBER & ROMAN NUMERAL PARSING
  // --------------------------------------------------------------------------
  console.log('\n[2/7] Testing Number & Roman Numeral Parsing...');
  assert(parseNumberString('1') === 1, 'Parses Arabic "1"');
  assert(parseNumberString('12') === 12, 'Parses Arabic "12"');
  assert(parseNumberString('ONE') === 1, 'Parses word "ONE"');
  assert(parseNumberString('fourteen') === 14, 'Parses word "fourteen"');
  assert(parseNumberString('iv') === 4, 'Parses Roman numeral "iv"');
  assert(parseNumberString('IX') === 9, 'Parses Roman numeral "IX"');
  assert(parseNumberString('xvi') === 16, 'Parses Roman numeral "xvi"');

  // --------------------------------------------------------------------------
  // 3. TABLE OF CONTENTS & PRINTED PAGE OFFSET VALIDATION
  // --------------------------------------------------------------------------
  console.log('\n[3/7] Testing TOC Parsing & Printed Page Offset Mapping...');

  const sampleTocLines = [
    'TABLE OF CONTENTS',
    'Unit 1: Classical Mechanics ......... 1',
    'Unit 2: Thermodynamics ............. 4',
    'Unit 3: Electromagnetism ............ 7',
  ];
  const parsedToc = parseTocLines(sampleTocLines);
  assert(parsedToc.length === 3, 'Parsed exactly 3 TOC entries');
  assert(parsedToc[0].title === 'Unit 1: Classical Mechanics', 'TOC title matches');
  assert(parsedToc[0].printedPageNum === 1, 'TOC printed page number matches 1');
  assert(parsedToc[1].printedPageNum === 4, 'TOC printed page number matches 4');

  // Test full TOC PDF with offset detection
  const tocPdfBytes = await createTocPdfWithOffset();
  const tocStructure = await detectDocumentStructure(toArrayBuffer(tocPdfBytes));

  assert(tocStructure.hasToc === true, 'Detected Table of Contents on document');
  assert(tocStructure.sections.length >= 3, 'Extracted at least 3 sections from TOC');
  // Printed page 1 was on PDF page 4 -> offset is 3
  assert(tocStructure.pageOffset === 3, `Correctly computed printed page offset (+3 pages, got ${tocStructure.pageOffset})`);
  assert(tocStructure.sections[0].startPage === 4, 'Unit 1 mapped accurately to PDF page 4');
  assert(tocStructure.sections[1].startPage === 7, 'Unit 2 mapped accurately to PDF page 7');
  assert(tocStructure.sections[0].confidence >= 85, 'High confidence given verified offset');

  // --------------------------------------------------------------------------
  // 4. HIERARCHICAL & NUMBERED HEADINGS
  // --------------------------------------------------------------------------
  console.log('\n[4/7] Testing Hierarchical & Numbered Headings...');

  const hierPdfBytes = await createHierarchicalHeadingPdf();
  const hierStructure = await detectDocumentStructure(toArrayBuffer(hierPdfBytes));

  assert(hierStructure.sections.length >= 2, 'Extracted hierarchical structure');
  const level1 = hierStructure.sections.filter((s) => s.level === 1);
  assert(level1.length >= 2, 'Preserved Level 1 (Units)');
  assert(level1[0].title.includes('UNIT 1'), 'Level 1 unit title matches');
  assert(level1[1].title.includes('UNIT 2'), 'Level 2 unit title matches');

  // --------------------------------------------------------------------------
  // 5. DOCUMENT CLASSIFICATION (Text vs Mixed vs Scanned-Only)
  // --------------------------------------------------------------------------
  console.log('\n[5/7] Testing Document Text Classification...');

  const scannedPdfBytes = await createScannedOnlyPdf();
  const scannedStructure = await detectDocumentStructure(toArrayBuffer(scannedPdfBytes));

  assert(scannedStructure.classification === 'scanned-only', 'Classified flat document as scanned-only');
  assert(scannedStructure.sections.length === 0, 'Zero fabricated headings for scanned-only PDF');
  assert(scannedStructure.detectionSummary.includes('scanned images'), 'Provided honest diagnostic directing to OCR/manual');

  const mixedPdfBytes = await createMixedScannedPdf();
  const mixedStructure = await detectDocumentStructure(toArrayBuffer(mixedPdfBytes));
  assert(mixedStructure.classification === 'mixed', 'Classified partial text PDF as mixed');

  // --------------------------------------------------------------------------
  // 6. SECTION INVARIANT SAFETY & MUTATIONS
  // --------------------------------------------------------------------------
  console.log('\n[6/7] Testing Section Invariants & Mutation Safety (Split / Merge)...');

  const validSections: DocumentSection[] = [
    { id: 'sec-1', title: 'Unit 1', level: 1, startPage: 1, endPage: 10, confidence: 95, source: 'toc' },
    { id: 'sec-2', title: 'Unit 2', level: 1, startPage: 11, endPage: 20, confidence: 95, source: 'toc' },
  ];
  const validRes = validateSectionInvariants(validSections, 20);
  assert(validRes.isValid === true, 'Valid ranges pass invariant validation');

  // Invalid: startPage > endPage
  const invalidSections: DocumentSection[] = [
    { id: 'sec-inv', title: 'Invalid Unit', level: 1, startPage: 15, endPage: 10, confidence: 90, source: 'manual' },
  ];
  const invalidRes = validateSectionInvariants(invalidSections, 20);
  assert(invalidRes.isValid === false, 'Detects startPage > endPage error');

  // Splitting
  const targetSection: DocumentSection = {
    id: 'sec-target',
    title: 'Unit 1: Foundations',
    level: 1,
    startPage: 1,
    endPage: 20,
    confidence: 90,
    source: 'heading',
  };
  const [partA, partB] = splitSection(targetSection, 10, 20);
  assert(partA.startPage === 1 && partA.endPage === 10, 'Split Part A: bounds 1..10');
  assert(partB.startPage === 11 && partB.endPage === 20, 'Split Part B: bounds 11..20');
  assert(partA.source === 'heading' && partB.source === 'heading', 'Preserves original source');
  assert(Boolean(partA.isUserModified && partB.isUserModified), 'Flags user-modified state');

  // Merging
  const merged = mergeSections(partA, partB);
  assert(merged.startPage === 1 && merged.endPage === 20, 'Merged section covers full range 1..20');
  assert(merged.isUserModified === true, 'Merged section marked user-modified');

  // Manual Section Creation
  const manual = createManualSection(21, 30, 3, 50);
  assert(manual.source === 'manual', 'Manual section has source="manual"');
  assert(manual.startPage === 21 && manual.endPage === 30, 'Manual section has correct bounds');

  // --------------------------------------------------------------------------
  // 7. SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(` UNIT CUTTER 2.0 SUITE COMPLETE: ${passedTests} of ${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runUnitCutter2Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
