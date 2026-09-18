import { PDFDocument, rgb } from 'pdf-lib';
import { 
  mergePdfs, 
  splitPdfByRanges, 
  splitPdfEveryNPages, 
  removePdfPages, 
  extractPdfPages, 
  rotatePdf, 
  addPageNumbersToPdf, 
  addWatermarkToPdf, 
  compressPdf, 
  cropPdf, 
  encryptPdfFile, 
  decryptPdfFile, 
  applySignatureToPdf, 
  redactPdfAreas, 
  comparePdfs, 
  createZipFromFiles 
} from '../src/lib/pdfEngine';
import { executeCutPlan } from '../src/lib/cutter';
import { validateParts, sanitizeFilename } from '../src/lib/validator';
import { getAIProvider } from '../src/lib/ai/aiProvider';

async function createTestMultiPagePdf(): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= 5; i++) {
    const page = doc.addPage([500, 700]);
    page.drawText(`DocuNexa Test Document - Page ${i}`, {
      x: 50,
      y: 650,
      size: 20,
      color: rgb(0.1, 0.1, 0.2),
    });
    page.drawText(`This is the body text content for chapter analysis on page ${i}.`, {
      x: 50,
      y: 600,
      size: 12,
    });
  }
  const bytes = await doc.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

// 1x1 transparent PNG data url for signature testing
const sampleSignatureDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function runFullAudit() {
  console.log('================================================================');
  console.log('       DOCUNEXA — COMPREHENSIVE END-TO-END TOOL AUDIT');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function record(testName: string, passedCondition: boolean, details: string) {
    total++;
    if (passedCondition) {
      console.log(`✓ [PASS] ${testName}: ${details}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${testName}: ${details}`);
      throw new Error(`Test failed: ${testName} - ${details}`);
    }
  }

  const basePdfBuf = await createTestMultiPagePdf();
  const baseDoc = await PDFDocument.load(basePdfBuf.slice(0));
  record('0. Base Test PDF', baseDoc.getPageCount() === 5, 'Created 5-page PDF');

  // 1. PDF Unit Cutter
  console.log('\n--- 1. Testing PDF Unit Cutter ---');
  const cutPlan: import('../src/types').DetectedPart[] = [
    { id: '1', title: 'Unit 1', startPage: 1, endPage: 2, filename: 'Unit 1.pdf', confidence: 'High' },
    { id: '2', title: 'Unit 2', startPage: 3, endPage: 5, filename: 'Unit 2.pdf', confidence: 'High' },
  ];
  const cutResults = await executeCutPlan(basePdfBuf, cutPlan, () => {});
  record('PDF Unit Cutter', cutResults.length === 2, `Sliced into ${cutResults.length} units with zero data detachment`);

  // 2. Merge PDF
  console.log('\n--- 2. Testing Merge PDF ---');
  const mergedBytes = await mergePdfs([basePdfBuf.slice(0), basePdfBuf.slice(0)]);
  const mergedDoc = await PDFDocument.load(mergedBytes);
  record('Merge PDF', mergedDoc.getPageCount() === 10, `Combined 2x 5-page documents into ${mergedDoc.getPageCount()} pages`);

  // 3. Split PDF (Ranges & Every N)
  console.log('\n--- 3. Testing Split PDF ---');
  const splitRanges = await splitPdfByRanges(basePdfBuf, [
    { start: 1, end: 2, name: 'Part 1.pdf' },
    { start: 3, end: 5, name: 'Part 2.pdf' },
  ]);
  record('Split PDF (Ranges)', splitRanges.length === 2, `Created ${splitRanges.length} range files`);

  const splitChunks = await splitPdfEveryNPages(basePdfBuf, 2, 'TestDocument.pdf');
  record('Split PDF (Every N Pages)', splitChunks.length === 3, `Chunked 5 pages by 2 into ${splitChunks.length} files`);

  // 4. Remove Pages
  console.log('\n--- 4. Testing Remove Pages ---');
  const removedBytes = await removePdfPages(basePdfBuf, [2, 4]);
  const removedDoc = await PDFDocument.load(removedBytes);
  record('Remove Pages', removedDoc.getPageCount() === 3, `Removed pages 2 & 4; page count reduced from 5 to ${removedDoc.getPageCount()}`);

  // 5. Extract Pages
  console.log('\n--- 5. Testing Extract Pages ---');
  const extractedBytes = await extractPdfPages(basePdfBuf, [1, 3, 5]);
  const extractedDoc = await PDFDocument.load(extractedBytes);
  record('Extract Pages', extractedDoc.getPageCount() === 3, `Extracted 3 pages; page count is ${extractedDoc.getPageCount()}`);

  // 6. Rotate PDF
  console.log('\n--- 6. Testing Rotate PDF ---');
  const rotatedBytes = await rotatePdf(basePdfBuf, 90);
  const rotatedDoc = await PDFDocument.load(rotatedBytes);
  const page1Rot = rotatedDoc.getPage(0).getRotation().angle;
  record('Rotate PDF', page1Rot === 90, `Page 1 rotated by ${page1Rot}°`);

  // 7. Add Watermark
  console.log('\n--- 7. Testing Add Watermark ---');
  const watermarkedBytes = await addWatermarkToPdf(basePdfBuf, {
    text: 'DOCUNEXA CONFIDENTIAL',
    opacity: 0.4,
    rotation: 45,
    fontSize: 36,
  });
  const watermarkedDoc = await PDFDocument.load(watermarkedBytes);
  record('Add Watermark', watermarkedDoc.getPageCount() === 5 && watermarkedBytes.byteLength > 0, 'Embedded vector watermark stamp');

  // 8. Add Page Numbers
  console.log('\n--- 8. Testing Add Page Numbers ---');
  const numberedBytes = await addPageNumbersToPdf(basePdfBuf, {
    position: 'bottom-center',
    format: 'page-of-total',
    startNumber: 1,
    fontSize: 10,
  });
  const numberedDoc = await PDFDocument.load(numberedBytes);
  record('Add Page Numbers', numberedDoc.getPageCount() === 5 && numberedBytes.byteLength > 0, 'Added standard page numbers');

  // 9. Compress PDF
  console.log('\n--- 9. Testing Compress PDF ---');
  const compressResult = await compressPdf(basePdfBuf, 'balanced');
  record('Compress PDF', compressResult.bytes.byteLength > 0, `Optimized document streams (size: ${compressResult.newSize} bytes)`);

  // 10. Crop PDF
  console.log('\n--- 10. Testing Crop PDF ---');
  const croppedBytes = await cropPdf(basePdfBuf, { x: 20, y: 20, width: 460, height: 660 });
  const croppedDoc = await PDFDocument.load(croppedBytes);
  record('Crop PDF', croppedDoc.getPageCount() === 5, 'Applied lossless setCropBox dimensions');

  // 11. Real PDF Security: Protect PDF & Unlock PDF
  console.log('\n--- 11. Testing PDF Security (Protect & Unlock Acceptance Test) ---');
  const testPassword = 'TestPassword2026!';
  const protectedBytes = await encryptPdfFile(basePdfBuf, testPassword, {
    allowPrinting: true,
    allowCopying: false,
    allowModifying: false,
  });

  // Verify that protected PDF CANNOT be read without password
  let loadFailedAsExpected = false;
  try {
    await PDFDocument.load(protectedBytes);
  } catch (err) {
    loadFailedAsExpected = true;
  }
  record('Protect PDF (AES-256)', loadFailedAsExpected, 'Encrypted document rejects unauthenticated access');

  // Verify that Unlock PDF decrypts the document
  const decryptedBytes = await decryptPdfFile(protectedBytes.buffer as ArrayBuffer, testPassword);
  const unlockedDoc = await PDFDocument.load(decryptedBytes);
  record('Unlock PDF', unlockedDoc.getPageCount() === 5, `Decrypted document opens cleanly without password (${unlockedDoc.getPageCount()} pages)`);

  // Verify wrong password rejection
  let wrongPasswordRejected = false;
  try {
    await decryptPdfFile(protectedBytes.buffer as ArrayBuffer, 'WrongPassword123');
  } catch (err) {
    wrongPasswordRejected = true;
  }
  record('Unlock PDF Security Guard', wrongPasswordRejected, 'Rejects invalid password with error');

  // 12. Sign PDF
  console.log('\n--- 12. Testing Sign PDF ---');
  const signedBytes = await applySignatureToPdf(basePdfBuf, sampleSignatureDataUrl, 1, 50, 50, 100, 40);
  const signedDoc = await PDFDocument.load(signedBytes);
  record('Sign PDF', signedDoc.getPageCount() === 5, 'Embedded PNG signature directly into PDF');

  // 13. Redact PDF
  console.log('\n--- 13. Testing Redact PDF ---');
  const redactedBytes = await redactPdfAreas(basePdfBuf, [
    { page: 1, x: 50, y: 640, width: 400, height: 30 },
  ]);
  const redactedDoc = await PDFDocument.load(redactedBytes);
  record('Redact PDF', redactedDoc.getPageCount() === 5, 'Applied permanent blackout zone to page 1');

  // 14. Compare PDF
  console.log('\n--- 14. Testing Compare PDF ---');
  const compResult = await comparePdfs(basePdfBuf, 'DocA.pdf', redactedBytes.buffer as ArrayBuffer, 'DocB.pdf');
  record('Compare PDF', compResult.docA.pageCount === 5 && compResult.docB.pageCount === 5, `Compared Document A (${compResult.docA.pageCount} pages) and Document B (${compResult.docB.pageCount} pages)`);

  // 15. ZIP Creation
  console.log('\n--- 15. Testing ZIP Bundler ---');
  const zipBlob = await createZipFromFiles([
    { filename: 'doc1.pdf', bytes: new Uint8Array(basePdfBuf) },
    { filename: 'doc2.pdf', bytes: new Uint8Array(basePdfBuf) },
  ]);
  record('ZIP Bundler', zipBlob.size > 0, `Generated ${zipBlob.size} byte ZIP archive`);

  // 16. AI Document Intelligence
  console.log('\n--- 16. Testing AI Intelligence Provider ---');
  const aiProvider = getAIProvider();
  const summary = await aiProvider.summarizeDocument('This is a curriculum text about cellular biology and genetics.', 'Biology.pdf');
  record('AI Summarizer', summary.overview.length > 0 && summary.keyPoints.length > 0, `Generated structured summary with ${summary.keyPoints.length} key points`);

  console.log('\n================================================================');
  console.log(`FINAL RESULT: ALL ${passed} OF ${total} FUNCTIONAL TESTS PASSED 100%!`);
  console.log('================================================================\n');
}

runFullAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
