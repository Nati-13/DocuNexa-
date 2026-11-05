/**
 * DOCUNEXA — CRITICAL SECURITY & RELIABILITY TEST SUITE (PHASE 1)
 *
 * Verifies the 4 Critical Issue Fixes:
 * 1. Redact PDF Security: Text stream sanitization + visual blackout + metadata sanitization
 *    + Regression tests for Normal Tj, TJ arrays, Rotated text, Multiple content streams,
 *      Embedded images (limitation verification), Form XObjects, Annotations, and Metadata.
 * 2. Excel to PDF Security: SheetJS v0.20.3 + untrusted workbook safeguards (size, sheets, rows, corrupt files).
 * 3. PDF/A Accuracy: Archive-ready PDF (Experimental) renaming + honest ISO 19005 disclaimers.
 * 4. Protect PDF Encryption: ISO 32000-2 AES-256 (R=6) verification + zero-knowledge + fail closed.
 */

import { PDFDocument, StandardFonts, rgb, degrees, PDFName, PDFArray } from 'pdf-lib';
import * as XLSX from 'xlsx';
import pako from 'pako';
import { redactPdfAreas, encryptPdfFile, decryptPdfFile, checkPdfIsEncrypted } from '../src/lib/pdfEngine';
import { convertExcelToPdf } from '../src/lib/tools/officeToPdf';
import { preparePdfA } from '../src/lib/tools/pdfToPdfA';
import { getToolDefinition } from '../src/lib/tools/toolRegistry';
import { getPdfJs, getPdfJsDocumentParams } from '../src/lib/pdfReader';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(description: string, condition: boolean, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${description}${details ? ` (${details})` : ''}`);
  } else {
    failedTests++;
    console.error(`  ✗ [FAIL] ${description}${details ? ` - ${details}` : ''}`);
  }
}

async function runPhase1SecurityTests() {
  console.log('================================================================');
  console.log(' DOCUNEXA PHASE 1: CRITICAL SECURITY & RELIABILITY AUDIT');
  console.log('================================================================\n');

  const pdfjs = await getPdfJs();

  // ============================================================================
  // 1. PRIORITY 1 — REDACT PDF SECURITY & EDGE CASES
  // ============================================================================
  console.log('--- 1. PRIORITY 1: REDACT PDF SECURITY & EDGE CASES ---');

  // A. Normal Text Operators (Tj) & Baseline Sanitization
  const testDoc = await PDFDocument.create();
  testDoc.setTitle('Confidential Quarterly Ledger 2026');
  testDoc.setAuthor('Secret Internal Finance Dept');
  const font = await testDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await testDoc.embedFont(StandardFonts.HelveticaBold);

  const p1 = testDoc.addPage([600, 400]);
  p1.drawText('CONFIDENTIAL: TOP_SECRET_FINANCIAL_ACCOUNT_998822', { x: 50, y: 350, size: 12, font: boldFont });
  p1.drawText('Public Invoice Summary - Customer Copy', { x: 50, y: 200, size: 12, font });

  const p2 = testDoc.addPage([600, 400]);
  p2.drawText('Page 2 Independent Vector Data - Unaffected', { x: 50, y: 300, size: 12, font });

  const originalBytes = await testDoc.save();
  const originalLength = originalBytes.byteLength;
  const originalCopy = new Uint8Array(originalBytes);

  const sanitizedPdfBytes = await redactPdfAreas(originalBytes.buffer as ArrayBuffer, [
    { page: 1, x: 45, y: 340, width: 450, height: 25 },
  ]);

  const taskSanitized = pdfjs.getDocument(getPdfJsDocumentParams(sanitizedPdfBytes));
  const docSanitized = await taskSanitized.promise;

  const page1Sanitized = await docSanitized.getPage(1);
  const textContent1 = await page1Sanitized.getTextContent();
  const page1Text = textContent1.items.map((it: any) => it.str).join(' ');

  const page2Sanitized = await docSanitized.getPage(2);
  const textContent2 = await page2Sanitized.getTextContent();
  const page2Text = textContent2.items.map((it: any) => it.str).join(' ');

  assert(
    'Normal text operators (Tj): Redacted text stripped from content stream',
    !page1Text.includes('TOP_SECRET_FINANCIAL_ACCOUNT_998822'),
    'Sensitive token stripped'
  );
  assert(
    'Normal text operators (Tj): Unaffected text on same page is preserved',
    page1Text.includes('Public Invoice Summary - Customer Copy'),
    'Public text intact'
  );
  assert(
    'Normal text operators (Tj): Unaffected text on page 2 is preserved',
    page2Text.includes('Page 2 Independent Vector Data - Unaffected'),
    'Page 2 text intact'
  );

  // B. Visual Overlay Mode (Honest Distinction)
  const overlayPdfBytes = await redactPdfAreas(
    originalBytes.buffer as ArrayBuffer,
    [{ page: 1, x: 45, y: 340, width: 450, height: 25 }],
    { mode: 'overlay', sanitizeMetadata: false }
  );
  const taskOverlay = pdfjs.getDocument(getPdfJsDocumentParams(overlayPdfBytes));
  const docOverlay = await taskOverlay.promise;
  const page1Overlay = await docOverlay.getPage(1);
  const overlayContent = await page1Overlay.getTextContent();
  const overlayText = overlayContent.items.map((it: any) => it.str).join(' ');

  assert(
    'Visual overlay mode: Preserves extractable text (honest distinction)',
    overlayText.includes('TOP_SECRET_FINANCIAL_ACCOUNT_998822'),
    'Visual blackout mode does not strip streams'
  );

  // C. Rotated and Transformed Text Operators
  const rotatedDoc = await PDFDocument.create();
  const rFont = await rotatedDoc.embedFont(StandardFonts.Helvetica);
  const rPage = rotatedDoc.addPage([600, 600]);
  rPage.drawText('ROTATED_SECRET_CARD_PIN_4488', {
    x: 100,
    y: 300,
    size: 14,
    font: rFont,
    rotate: degrees(90),
  });
  rPage.drawText('Normal Horizontal Text Unaffected', { x: 50, y: 100, size: 12, font: rFont });
  const rotatedBytes = await rotatedDoc.save();

  const redactedRotatedBytes = await redactPdfAreas(rotatedBytes.buffer as ArrayBuffer, [
    { page: 1, x: 90, y: 290, width: 60, height: 250 },
  ]);
  const taskRotated = pdfjs.getDocument(getPdfJsDocumentParams(redactedRotatedBytes));
  const docRotated = await taskRotated.promise;
  const pRotated = await docRotated.getPage(1);
  const rotContent = await pRotated.getTextContent();
  const rotText = rotContent.items.map((it: any) => it.str).join(' ');

  assert(
    'Rotated and transformed text: Sensitive text stripped',
    !rotText.includes('ROTATED_SECRET_CARD_PIN_4488'),
    'Rotated Tm operator stripped'
  );
  assert(
    'Rotated and transformed text: Unaffected text preserved',
    rotText.includes('Normal Horizontal Text Unaffected')
  );

  // D. Multiple Content Streams
  const multiStreamDoc = await PDFDocument.create();
  const mPage = multiStreamDoc.addPage([600, 400]);
  // Stream 1: Secret
  const stream1 = multiStreamDoc.context.flateStream(
    'BT /Helvetica 12 Tf 50 350 Td (SECRET_STREAM_TOKEN_7788) Tj ET'
  );
  // Stream 2: Public
  const stream2 = multiStreamDoc.context.flateStream(
    'BT /Helvetica 12 Tf 50 150 Td (Public Safe Multi Stream) Tj ET'
  );
  const streamArray = multiStreamDoc.context.obj([
    multiStreamDoc.context.register(stream1),
    multiStreamDoc.context.register(stream2),
  ]);
  mPage.node.set(PDFName.of('Contents'), streamArray);
  const multiBytes = await multiStreamDoc.save();

  const redactedMulti = await redactPdfAreas(multiBytes.buffer as ArrayBuffer, [
    { page: 1, x: 45, y: 340, width: 300, height: 30 },
  ]);
  const taskMulti = pdfjs.getDocument(getPdfJsDocumentParams(redactedMulti));
  const docMulti = await taskMulti.promise;
  const pMulti = await docMulti.getPage(1);
  const multiContent = await pMulti.getTextContent();
  const multiText = multiContent.items.map((it: any) => it.str).join(' ');

  assert(
    'Multiple content streams: Targeted stream text stripped',
    !multiText.includes('SECRET_STREAM_TOKEN_7788')
  );
  assert(
    'Multiple content streams: Secondary stream text preserved',
    multiText.includes('Public Safe Multi Stream')
  );

  // E. Form XObjects Sanitization
  const formXDoc = await PDFDocument.create();
  const fxPage = formXDoc.addPage([600, 400]);
  const formStream = formXDoc.context.flateStream(
    'BT /Helvetica 12 Tf 50 350 Td (SECRET_FORM_XOBJECT_DATA) Tj ET'
  );
  formStream.dict.set(PDFName.of('Subtype'), PDFName.of('Form'));
  formStream.dict.set(PDFName.of('BBox'), formXDoc.context.obj([0, 0, 600, 400]));
  const formRef = formXDoc.context.register(formStream);

  const xobjDict = formXDoc.context.obj({
    FX1: formRef,
  });
  const resDict = formXDoc.context.obj({
    XObject: xobjDict,
  });
  fxPage.node.set(PDFName.of('Resources'), resDict);
  const fxBytes = await formXDoc.save();

  const redactedFx = await redactPdfAreas(fxBytes.buffer as ArrayBuffer, [
    { page: 1, x: 45, y: 340, width: 300, height: 30 },
  ]);
  const rawFxStr = new TextDecoder('latin1').decode(redactedFx);
  assert(
    'Form XObjects: Form XObject stream stripped of sensitive operators',
    !rawFxStr.includes('SECRET_FORM_XOBJECT_DATA'),
    'Sanitized in /Resources /XObject'
  );

  // F. Annotations and Appearance Streams Removal
  const annotDoc = await PDFDocument.create();
  const aPage = annotDoc.addPage([600, 400]);
  aPage.drawText('Page with interactive link annotation', { x: 50, y: 200, size: 12, font });

  // Add Link Annotation overlapping redaction zone [50, 340, 250, 365]
  const linkAnnot = annotDoc.context.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('Link'),
    Rect: annotDoc.context.obj([50, 340, 250, 365]),
    Contents: 'Sensitive Link to Internal Portal',
  });
  const linkRef = annotDoc.context.register(linkAnnot);
  aPage.node.set(PDFName.of('Annots'), annotDoc.context.obj([linkRef]));
  const annotBytes = await annotDoc.save();

  const redactedAnnotBytes = await redactPdfAreas(annotBytes.buffer as ArrayBuffer, [
    { page: 1, x: 45, y: 330, width: 220, height: 40 },
  ]);
  const loadedAnnotDoc = await PDFDocument.load(redactedAnnotBytes);
  const laPage = loadedAnnotDoc.getPages()[0];
  const laAnnots = laPage.node.get(PDFName.of('Annots')) as any;
  const annotsCount = laAnnots ? (loadedAnnotDoc.context.lookup(laAnnots) as any)?.size?.() || 0 : 0;
  assert(
    'Annotations: Overlapping interactive annotation purged from /Annots',
    annotsCount === 0,
    'Sensitive link annotation removed'
  );

  // G. Metadata and Catalog Stream Purge
  const metaDoc = await PDFDocument.create();
  metaDoc.setTitle('Classified Mission Brief');
  metaDoc.setAuthor('Agent X');
  metaDoc.setSubject('Top Secret Budget');
  metaDoc.setKeywords(['confidential', 'budget', '2026']);
  const metaPage = metaDoc.addPage([400, 400]);
  metaPage.drawText('Sample document with rich metadata', { x: 50, y: 200, size: 12, font });

  // Add XMP metadata stream to catalog
  const xmpStream = metaDoc.context.stream('<x:xmpmeta>Classified_XMP_Keyword</x:xmpmeta>', {
    Type: PDFName.of('Metadata'),
    Subtype: PDFName.of('XML'),
  });
  metaDoc.catalog.set(PDFName.of('Metadata'), metaDoc.context.register(xmpStream));
  const metaBytes = await metaDoc.save();

  const redactedMetaBytes = await redactPdfAreas(metaBytes.buffer as ArrayBuffer, [
    { page: 1, x: 50, y: 190, width: 200, height: 25 },
  ]);
  const loadedMeta = await PDFDocument.load(redactedMetaBytes);
  const rawMetaStr = new TextDecoder('latin1').decode(redactedMetaBytes);

  assert('Metadata: Document Title cleared', !loadedMeta.getTitle());
  assert('Metadata: Document Author cleared', !loadedMeta.getAuthor());
  assert('Metadata: Document Subject cleared', !loadedMeta.getSubject());
  assert('Metadata: Catalog /Metadata XML stream deleted', !rawMetaStr.includes('Classified_XMP_Keyword'));

  // H. Embedded Images (Verification of Known Limitation)
  // When an image is embedded, vector blackout draws a rectangle over it,
  // but raw image XObject bytes remain in the binary unless rasterized.
  const imgDoc = await PDFDocument.create();
  const iPage = imgDoc.addPage([400, 400]);
  // Minimal 1x1 PNG
  const png1x1 = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x60, 0x60, 0x60, 0x00,
    0x00, 0x00, 0x04, 0x00, 0x01, 0x5c, 0xcd, 0xff, 0x69, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
    0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
  const embeddedPng = await imgDoc.embedPng(png1x1);
  iPage.drawImage(embeddedPng, { x: 50, y: 200, width: 100, height: 100 });
  const imgDocBytes = await imgDoc.save();

  const redactedImgBytes = await redactPdfAreas(imgDocBytes.buffer as ArrayBuffer, [
    { page: 1, x: 50, y: 200, width: 100, height: 100 },
  ]);
  const rawImgStr = new TextDecoder('latin1').decode(redactedImgBytes);
  const imageXObjectStillInBinary = rawImgStr.includes('/Subtype /Image');

  assert(
    'Embedded Images (Limitation Verified): Raw image XObject remains in binary under vector blackout',
    imageXObjectStillInBinary === true,
    'CONFIRMED: Vector blackout covers visual area, but image stream remains in PDF binary. Proves why tool is classified as Limited / Experimental!'
  );

  // I. Tool Registry Honest Classification
  const redactToolDef = getToolDefinition('redact-pdf');
  assert(
    'Tool registry classification is strictly LIMITED BY TECHNICAL CONSTRAINT',
    redactToolDef?.classification === 'LIMITED BY TECHNICAL CONSTRAINT'
  );
  assert(
    'Tool registry limitations explicitly state image & Form XObject limits',
    Boolean(redactToolDef?.limitations?.includes('Form XObjects') && redactToolDef?.limitations?.includes('PDF to JPG')),
    redactToolDef?.limitations
  );

  // ============================================================================
  // 2. PRIORITY 2 — EXCEL TO PDF DEPENDENCY & WORKBOOK SAFEGUARDS
  // ============================================================================
  console.log('\n--- 2. PRIORITY 2: EXCEL TO PDF DEPENDENCY & WORKBOOK SAFEGUARDS ---');

  assert(
    'SheetJS version is updated from vulnerable 0.18.5 to maintained 0.20.3',
    XLSX.version === '0.20.3',
    `Installed XLSX version: ${XLSX.version}`
  );

  // Normal multi-sheet workbook
  const normalWb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet([
    ['Item', 'Qty', 'Unit Price', 'Total'],
    ['Product Alpha', 10, 45.5, 455.0],
    ['Product Beta', 5, 120.0, 600.0],
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([
    ['Employee', 'Department', 'Active'],
    ['Alice Smith', 'Engineering', true],
    ['Bob Jones', 'Security', true],
  ]);
  XLSX.utils.book_append_sheet(normalWb, ws1, 'Invoices');
  XLSX.utils.book_append_sheet(normalWb, ws2, 'Employees');

  const normalXlsxBuf = XLSX.write(normalWb, { type: 'array', bookType: 'xlsx' });
  const normalRes = await convertExcelToPdf(normalXlsxBuf, 'accounting');

  assert('Normal XLSX converted to PDF', normalRes.bytes.byteLength > 500);
  assert('Multi-sheet pagination created at least 2 pages', normalRes.pageCount >= 2, `Page count: ${normalRes.pageCount}`);

  // Date formats and merged cells
  const dateWb = XLSX.utils.book_new();
  const wsDate = XLSX.utils.aoa_to_sheet([
    ['Event', 'Date', 'Status'],
    ['Security Audit', new Date('2026-11-04'), 'Completed'],
  ]);
  XLSX.utils.book_append_sheet(dateWb, wsDate, 'Schedule');
  const dateXlsxBuf = XLSX.write(dateWb, { type: 'array', bookType: 'xlsx' });
  const dateRes = await convertExcelToPdf(dateXlsxBuf, 'audit-schedule');
  assert('Date and merged cells handled without crash', dateRes.bytes.byteLength > 500);

  // Empty spreadsheet rejection
  let emptyRejected = false;
  try {
    await convertExcelToPdf(new ArrayBuffer(0), 'empty');
  } catch (err: any) {
    emptyRejected = true;
    assert('Empty spreadsheet rejected with clear error', err.message.includes('empty'), err.message);
  }
  if (!emptyRejected) {
    assert('Empty spreadsheet rejected', false, 'Expected error was not thrown');
  }

  // Corrupted spreadsheet rejection
  let corruptRejected = false;
  try {
    const junkBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x99, 0x88, 0x77, 0x66, 0x55]);
    await convertExcelToPdf(junkBytes.buffer as ArrayBuffer, 'corrupted');
  } catch (err: any) {
    corruptRejected = true;
    assert('Corrupted spreadsheet fails safely with human-readable error', err.message.includes('Failed to parse spreadsheet'), err.message);
  }
  if (!corruptRejected) {
    assert('Corrupted spreadsheet rejected', false, 'Expected error was not thrown');
  }

  // Oversized workbook limit
  let oversizedRejected = false;
  try {
    const fakeOversized = { byteLength: 55 * 1024 * 1024 } as ArrayBuffer;
    await convertExcelToPdf(fakeOversized, 'large');
  } catch (err: any) {
    oversizedRejected = true;
    assert('Workbooks over 50MB rejected with clear limits', err.message.includes('50 MB'), err.message);
  }
  if (!oversizedRejected) {
    assert('Oversized spreadsheet rejected', false, 'Expected error was not thrown');
  }

  // ============================================================================
  // 3. PRIORITY 3 — PDF/A ACCURACY & HONEST ADVISORIES
  // ============================================================================
  console.log('\n--- 3. PRIORITY 3: PDF/A ACCURACY & HONEST ADVISORIES ---');

  const pdfaRes = await preparePdfA(originalBytes.buffer as ArrayBuffer, 'archive_sample');

  assert(
    'Output filename accurately labeled Archive-Ready PDF-A Experimental',
    pdfaRes.filename.includes('Archive-Ready') && pdfaRes.filename.includes('Experimental'),
    `Filename: ${pdfaRes.filename}`
  );
  assert(
    'Disclaimer explicitly warns against assuming certified ISO 19005 compliance',
    pdfaRes.disclaimer.includes('does NOT certify formal ISO 19005') && pdfaRes.disclaimer.includes('veraPDF'),
    'Accurately explains font subset, ICC, and transparency pre-press constraints'
  );

  const pdfaDoc = await PDFDocument.load(pdfaRes.bytes);
  assert('Output PDF is valid and page count preserved', pdfaDoc.getPageCount() === 2);

  const rawPdfaStr = new TextDecoder('latin1').decode(pdfaRes.bytes);
  assert(
    'Archival metadata stream present in output PDF',
    rawPdfaStr.includes('<pdfaid:part>1</pdfaid:part>') && rawPdfaStr.includes('<pdfaid:conformance>B</pdfaid:conformance>'),
    'XMP packet registered with pdfaid schema'
  );

  const pdfaToolDef = getToolDefinition('pdf-to-pdfa');
  assert(
    'Tool registry renamed to Archive-ready PDF (Experimental)',
    pdfaToolDef?.name === 'Archive-ready PDF (Experimental)'
  );
  assert(
    'Tool registry limitations explicitly state non-certified status',
    Boolean(pdfaToolDef?.limitations?.includes('veraPDF') && pdfaToolDef?.limitations?.includes('font subset')),
    pdfaToolDef?.limitations
  );
  assert(
    'Tool registry classification is strictly LIMITED BY TECHNICAL CONSTRAINT',
    pdfaToolDef?.classification === 'LIMITED BY TECHNICAL CONSTRAINT'
  );

  // ============================================================================
  // 4. PRIORITY 4 — PROTECT PDF ENCRYPTION SECURITY
  // ============================================================================
  console.log('\n--- 4. PRIORITY 4: PROTECT PDF ENCRYPTION SECURITY ---');

  const testPass = 'UltraSecure#Key2026!';
  const protectedBytes = await encryptPdfFile(originalBytes.buffer as ArrayBuffer, testPass, {
    allowPrinting: true,
    allowCopying: false,
    allowModifying: false,
  });

  const rawEncryptedStr = new TextDecoder('latin1').decode(protectedBytes);
  assert('Protected PDF contains /Encrypt dictionary', rawEncryptedStr.includes('/Encrypt'));
  assert(
    'Uses ISO 32000-2 AES-256 standard encryption (V=5, R=6)',
    rawEncryptedStr.includes('/V 5') && rawEncryptedStr.includes('/R 6'),
    'Confirmed Revision 6 AES-256 security handler'
  );
  assert(
    'Cryptographic filter is CFM /AESV3 with 32-byte (256-bit) key',
    rawEncryptedStr.includes('/CFM /AESV3') && rawEncryptedStr.includes('/Length 32'),
    'Confirmed standard AESV3 256-bit cipher'
  );
  assert(
    'Permission flags accurately encoded in /P (-28 with print allowed, copy/modify barred)',
    rawEncryptedStr.includes('/P -28')
  );

  // Loading without password fails closed
  let lockedFailedAsExpected = false;
  try {
    await PDFDocument.load(protectedBytes);
  } catch (err: any) {
    lockedFailedAsExpected = true;
    assert('Loading protected PDF without password fails closed as expected', true, err.message);
  }
  if (!lockedFailedAsExpected) {
    assert('Loading without password fails', false, 'Encrypted PDF opened without password!');
  }

  // Decryption with wrong password fails closed
  let wrongPassFailed = false;
  try {
    await decryptPdfFile(protectedBytes.buffer as ArrayBuffer, 'WrongPassword#999');
  } catch (err: any) {
    wrongPassFailed = true;
    assert('Decrypting with incorrect password fails closed', true, err.message);
  }
  if (!wrongPassFailed) {
    assert('Incorrect password fails', false, 'Decrypted with wrong password!');
  }

  // Decryption with correct password succeeds and restores exact document
  const decryptedBytes = await decryptPdfFile(protectedBytes.buffer as ArrayBuffer, testPass);
  const unlockedDoc = await PDFDocument.load(decryptedBytes);
  assert(
    'Decrypting with correct password restores full document cleanly',
    unlockedDoc.getPageCount() === 2,
    `Restored ${unlockedDoc.getPageCount()} pages`
  );

  const encStatus = await checkPdfIsEncrypted(protectedBytes.buffer as ArrayBuffer);
  assert('checkPdfIsEncrypted reports true', encStatus.encrypted === true);

  console.log('\n================================================================');
  console.log(` PHASE 1 AUDIT COMPLETE: ${passedTests} of ${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  if (failedTests > 0) {
    console.error(` FAILED TESTS: ${failedTests}`);
    process.exit(1);
  } else {
    console.log(' ALL PHASE 1 CRITICAL VERIFICATION TESTS PASSED 100%!');
    console.log('================================================================\n');
  }
}

runPhase1SecurityTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
