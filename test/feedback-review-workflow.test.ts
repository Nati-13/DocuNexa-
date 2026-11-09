import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import {
  processPdfForReview,
  validateZipBundle,
} from '../src/lib/batchReviewProcessor';
import {
  saveFeedbackRecord,
  getAllFeedbackRecords,
  deleteFeedbackRecord,
  exportFeedbackJson,
  importFeedbackJson,
  clearAllFeedbackRecords,
  FeedbackRecord,
  DETECTOR_VERSION,
} from '../src/lib/feedbackDb';

async function createSampleTextbook(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  // Page 1: Cover
  const cover = doc.addPage([600, 800]);
  cover.drawText('General Science Grade 9', { x: 50, y: 700, size: 24, font, color: rgb(0.1, 0.1, 0.1) });

  // Page 2: Table of Contents
  const toc = doc.addPage([600, 800]);
  toc.drawText('TABLE OF CONTENTS', { x: 50, y: 750, size: 18, font, color: rgb(0.1, 0.1, 0.1) });
  toc.drawText('Unit 1: Structure of the Earth ................ 4', { x: 50, y: 700, size: 12, font, color: rgb(0.2, 0.2, 0.2) });
  toc.drawText('Unit 2: Ecosystems and Energy ............... 12', { x: 50, y: 670, size: 12, font, color: rgb(0.2, 0.2, 0.2) });

  // Page 3: Preface / Front Matter
  const preface = doc.addPage([600, 800]);
  preface.drawText('Preface and Introduction', { x: 50, y: 750, size: 16, font, color: rgb(0.2, 0.2, 0.2) });

  // Pages 4–11: Unit 1
  for (let p = 4; p <= 11; p++) {
    const page = doc.addPage([600, 800]);
    if (p === 4) {
      page.drawText('UNIT ONE: STRUCTURE OF THE EARTH', { x: 50, y: 750, size: 18, font, color: rgb(0, 0, 0) });
    } else {
      page.drawText(`Unit 1 Content page ${p}`, { x: 50, y: 750, size: 12, font, color: rgb(0.3, 0.3, 0.3) });
    }
  }

  // Pages 12–20: Unit 2
  for (let p = 12; p <= 20; p++) {
    const page = doc.addPage([600, 800]);
    if (p === 12) {
      page.drawText('UNIT TWO: ECOSYSTEMS AND ENERGY', { x: 50, y: 750, size: 18, font, color: rgb(0, 0, 0) });
    } else {
      page.drawText(`Unit 2 Content page ${p}`, { x: 50, y: 750, size: 12, font, color: rgb(0.3, 0.3, 0.3) });
    }
  }

  return await doc.save();
}

async function runReviewWorkflowTests() {
  console.log('--- Testing Real-PDF Review & Feedback Dataset Workflow ---');

  // Step 0: Clear feedback store
  await clearAllFeedbackRecords();

  // Step 1: Create test PDF and run review processor
  console.log('Test 1: Client-side sequential review processing and physical verification');
  const pdfBytes = await createSampleTextbook();
  const fileMock = {
    name: 'General_Science_Grade9.pdf',
    size: pdfBytes.byteLength,
    arrayBuffer: async () => pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength),
  };

  const result = await processPdfForReview(fileMock);

  console.log(`- Filename: ${result.filename}`);
  console.log(`- Page Count: ${result.pageCount}`);
  console.log(`- Detected Units: ${result.parts.length}`);
  console.log(`- Detected Confidence: ${result.detection.overallConfidence}`);

  if (result.parts.length < 2) {
    throw new Error(`Expected at least 2 detected units, found ${result.parts.length}`);
  }

  // Verify physical unit slices
  for (const slice of result.unitSlices) {
    console.log(`  * ${slice.filename}: physical ${slice.physicalCount} pages (valid: ${slice.isValid})`);
    if (!slice.isValid || slice.physicalCount !== slice.expectedCount) {
      throw new Error(`Unit slice verification failed for ${slice.filename}`);
    }
  }

  // Verify ZIP archive
  if (!result.zipBlob || !result.zipValid) {
    throw new Error('ZIP archive creation or validation failed');
  }
  console.log(`- ZIP Bundle verified: ${result.zipEntryCount} valid non-empty PDF files contained.`);

  // Step 2: Test CORRECT feedback recording
  console.log('\nTest 2: Save CORRECT feedback record');
  const correctRecord: FeedbackRecord = {
    id: result.fingerprint,
    documentFingerprint: result.fingerprint,
    filename: result.filename,
    pageCount: result.pageCount,
    language: result.language,
    extractedHeadingEvidence: result.evidence,
    detectorVersion: DETECTOR_VERSION,
    originalBoundaries: result.parts.map((p) => ({
      title: p.title,
      startPage: p.startPage,
      endPage: p.endPage,
    })),
    decision: 'CORRECT',
    timestamp: new Date().toISOString(),
  };

  await saveFeedbackRecord(correctRecord);
  let records = await getAllFeedbackRecords();
  if (records.length !== 1 || records[0].decision !== 'CORRECT') {
    throw new Error('Failed to record CORRECT feedback in database');
  }
  console.log('✅ CORRECT feedback saved successfully');

  // Step 3: Test INCORRECT feedback recording with boundary corrections
  console.log('\nTest 3: Save INCORRECT feedback with corrected boundaries');
  const incorrectRecord: FeedbackRecord = {
    id: 'doc_math_g10_p50',
    documentFingerprint: 'doc_math_g10_p50',
    filename: 'Mathematics_Grade10.pdf',
    pageCount: 50,
    language: 'en',
    extractedHeadingEvidence: ['Heading: UNIT 1 on p.4'],
    detectorVersion: DETECTOR_VERSION,
    originalBoundaries: [
      { title: 'Unit 1: Algebra', startPage: 4, endPage: 23 },
      { title: 'Unit 2: Geometry', startPage: 24, endPage: 50 },
    ],
    correctedBoundaries: [
      { title: 'Unit 1: Algebra & Functions', startPage: 5, endPage: 24 },
      { title: 'Unit 2: Geometry & Proofs', startPage: 25, endPage: 50 },
    ],
    decision: 'INCORRECT',
    timestamp: new Date().toISOString(),
  };

  await saveFeedbackRecord(incorrectRecord);
  records = await getAllFeedbackRecords();
  if (records.length !== 2) {
    throw new Error(`Expected 2 records, got ${records.length}`);
  }
  console.log('✅ INCORRECT feedback with boundary adjustments saved successfully');

  // Step 4: Test Export JSON
  console.log('\nTest 4: Export feedback dataset as JSON');
  const exportedJson = await exportFeedbackJson();
  const parsed = JSON.parse(exportedJson);
  if (parsed.totalRecords !== 2 || parsed.positiveCount !== 1 || parsed.correctedCount !== 1) {
    throw new Error('Exported JSON summary counts mismatch');
  }
  console.log('✅ Exported JSON matches expected schema and counts');

  // Step 5: Test Delete and Import JSON
  console.log('\nTest 5: Delete single record and Import dataset');
  await deleteFeedbackRecord(incorrectRecord.id);
  records = await getAllFeedbackRecords();
  if (records.length !== 1) {
    throw new Error(`Expected 1 record after deletion, got ${records.length}`);
  }

  // Import JSON back
  const importRes = await importFeedbackJson(exportedJson);
  if (importRes.importedCount !== 2 || importRes.errors.length > 0) {
    throw new Error(`Import failed: ${JSON.stringify(importRes)}`);
  }
  records = await getAllFeedbackRecords();
  if (records.length !== 2) {
    throw new Error(`Expected 2 records after import, got ${records.length}`);
  }
  console.log('✅ Dataset export, record deletion, and JSON import verified successfully');

  console.log('\n🎉 ALL REAL-PDF REVIEW & FEEDBACK DATASET TESTS PASSED!');
}

runReviewWorkflowTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

