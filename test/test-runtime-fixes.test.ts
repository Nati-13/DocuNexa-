import { PDFDocument, rgb, StandardFonts, PDFName } from 'pdf-lib';
import JSZip from 'jszip';
import { imagesToPdf, addWatermarkToPdf } from '../src/lib/pdfEngine';
import { convertPdfToWord } from '../src/lib/tools/pdfToWord';
import { convertPdfToExcel } from '../src/lib/tools/pdfToExcel';
import { convertPdfToPowerPoint } from '../src/lib/tools/pdfToPowerPoint';
import { detectPdfFormFields, fillPdfForm } from '../src/lib/tools/pdfForms';
import { convertWordToPdf, convertPowerPointToPdf } from '../src/lib/tools/officeToPdf';
import { performPdfCompression } from '../src/lib/tools/compressPdf';
import { repairPdf } from '../src/lib/tools/repairPdf';
import { cropPdf } from '../src/lib/pdfEngine';
import { summarizePdfDocument, formatSummaryAsMarkdown, formatSummaryAsPlainText } from '../src/lib/tools/aiSummarizer';
import { translatePdfDocument } from '../src/lib/tools/translatePdf';
import { getTranslationProvider } from '../src/lib/tools/translationProvider';
import { getToolDefinition, REGISTERED_TOOLS } from '../src/lib/tools/toolRegistry';
import * as fs from 'fs';
import * as path from 'path';

async function runRuntimeVerification() {
  console.log('================================================================');
  console.log('    DOCUNEXA — RUNTIME REPAIR & DISPATCH VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, message: string) {
    total++;
    if (condition) {
      console.log(`✓ [PASS] ${name}: ${message}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${name}: ${message}`);
      throw new Error(`Assertion failed for ${name}: ${message}`);
    }
  }

  // 1. Tool Registry Verification (All 34 tools registered)
  assert(
    'All 34 Tools Registered',
    Object.keys(REGISTERED_TOOLS).length === 34,
    `Registered tool count is exactly ${Object.keys(REGISTERED_TOOLS).length}`
  );
  assert(
    'scan-to-pdf Registered',
    Boolean(getToolDefinition('scan-to-pdf')),
    'scan-to-pdf is properly registered in toolRegistry'
  );
  assert(
    'edit-pdf Registered',
    Boolean(getToolDefinition('edit-pdf')),
    'edit-pdf is properly registered in toolRegistry'
  );

  // 2. JSZip Module Verification
  const zip = new JSZip();
  zip.file('test.txt', 'DocuNexa Runtime Verification');
  const zipBuffer = await zip.generateAsync({ type: 'uint8array' });
  assert(
    'JSZip Defined & Packaging',
    zipBuffer.length > 0 && zipBuffer[0] === 0x50 && zipBuffer[1] === 0x4b,
    `Generated ${zipBuffer.length} byte valid ZIP package with PK signature`
  );

  // 3. Create Sample PDF for testing tools
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const p1 = doc.addPage([600, 800]);
  p1.drawText('DocuNexa Test Document', { x: 50, y: 750, size: 18, font: bold });
  p1.drawText('Sample text for testing PDF processing pipeline.', { x: 50, y: 720, size: 12, font });
  p1.drawText('Unit 1 Chapter Summary: Science and Biology', { x: 50, y: 690, size: 11, font });

  // Add sample table
  p1.drawText('Quarter', { x: 50, y: 650, size: 10, font: bold });
  p1.drawText('Amount', { x: 200, y: 650, size: 10, font: bold });
  p1.drawText('Status', { x: 350, y: 650, size: 10, font: bold });
  for (let i = 1; i <= 3; i++) {
    const y = 650 - i * 25;
    p1.drawText(`Q${i} 2026`, { x: 50, y, size: 10, font });
    p1.drawText(`$${i * 250},000`, { x: 200, y, size: 10, font });
    p1.drawText('Approved', { x: 350, y, size: 10, font });
  }

  const rawBytes = await doc.save();
  const testBuffer = rawBytes.buffer.slice(rawBytes.byteOffset, rawBytes.byteOffset + rawBytes.byteLength) as ArrayBuffer;

  // 4. Scan to PDF processor test (Image input -> PDF output)
  // Simulate image file upload
  const minimalPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  const mockImageFile = {
    name: 'receipt.png',
    type: 'image/png',
    arrayBuffer: async () => minimalPng.buffer.slice(minimalPng.byteOffset, minimalPng.byteOffset + minimalPng.byteLength),
  } as any as File;

  const scannedPdfBytes = await imagesToPdf([mockImageFile]);
  assert(
    'Scan to PDF Processor',
    scannedPdfBytes.length > 100 && scannedPdfBytes[0] === 0x25 && scannedPdfBytes[1] === 0x50,
    `Compiled image into valid PDF (${scannedPdfBytes.length} bytes)`
  );

  // 5. Compress PDF processor test
  const compRes = await performPdfCompression(testBuffer.slice(0), 'test-doc', 'balanced');
  assert(
    'Compress PDF Processor',
    compRes.bytes.length > 0 && compRes.newSize > 0,
    `Compressed document verified (${compRes.bytes.length} bytes, delta: ${compRes.deltaPercent}%)`
  );

  // 6. Repair PDF processor test
  const repRes = await repairPdf(testBuffer.slice(0), 'test-doc');
  assert(
    'Repair PDF Processor',
    repRes.status === 'Healthy' && repRes.recoveredPages === 1,
    `Repaired PDF returned status: ${repRes.status} (${repRes.recoveredPages} page recovered)`
  );

  // 7. PDF to Word (.docx) processor test (Browser-safe Packer)
  const wordRes = await convertPdfToWord(testBuffer.slice(0), 'test-doc');
  assert(
    'PDF to Word Processor',
    wordRes.bytes.length > 0 && wordRes.bytes[0] === 0x50 && wordRes.bytes[1] === 0x4b,
    `Converted PDF to Word .docx (${wordRes.bytes.length} bytes with PK ZIP structure)`
  );

  // 8. PDF to Excel (.xlsx) processor test
  const excelRes = await convertPdfToExcel(testBuffer.slice(0), 'test-doc');
  assert(
    'PDF to Excel Processor',
    excelRes.success && excelRes.canDownload && excelRes.bytes !== null,
    `Converted PDF to Excel .xlsx (sheets: ${excelRes.sheetCount}, rows: ${excelRes.rowCount}, confidence: ${excelRes.confidence}%)`
  );

  // 9. Add Watermark processor test
  const watermarkedBytes = await addWatermarkToPdf(testBuffer.slice(0), {
    text: 'CONFIDENTIAL',
    opacity: 0.3,
    rotation: 45,
    fontSize: 36,
  });
  assert(
    'Add Watermark Processor',
    watermarkedBytes.length > 0 && watermarkedBytes[0] === 0x25,
    `Watermarked PDF generated (${watermarkedBytes.length} bytes)`
  );

  // 10. Crop PDF processor test
  const croppedBytes = await cropPdf(testBuffer.slice(0), { x: 20, y: 20, width: 560, height: 760 });
  assert(
    'Crop PDF Processor',
    croppedBytes.length > 0 && croppedBytes[0] === 0x25,
    `Cropped PDF generated (${croppedBytes.length} bytes)`
  );

  // 11. PDF Forms detection and filling
  const formDoc = await PDFDocument.create();
  const formPage = formDoc.addPage([600, 800]);
  const form = formDoc.getForm();
  const tf = form.createTextField('username');
  tf.setText('initial');
  tf.addToPage(formPage, { x: 50, y: 700, width: 150, height: 20 });
  const formBytes = await formDoc.save();
  const formBuffer = formBytes.buffer.slice(formBytes.byteOffset, formBytes.byteOffset + formBytes.byteLength) as ArrayBuffer;

  const detectRes = await detectPdfFormFields(formBuffer.slice(0));
  assert(
    'PDF Forms Detection',
    detectRes.hasForm && detectRes.fields.length === 1 && detectRes.fields[0].name === 'username',
    `Detected ${detectRes.fields.length} field(s): ${detectRes.fields[0]?.name}`
  );

  const filledRes = await fillPdfForm(formBuffer.slice(0), { username: 'Antigravity QA' }, 'form-test');
  assert(
    'PDF Forms Filler',
    filledRes.bytes.length > 0,
    `Filled form exported (${filledRes.bytes.length} bytes)`
  );

  // 12. Local Document Summarizer test
  const sumRes = await summarizePdfDocument(testBuffer.slice(0), 'test-doc');
  assert(
    'Local Document Summarizer',
    sumRes.pagesAnalyzed === 1 && sumRes.summary.overview.length > 0,
    `Summarizer processed ${sumRes.pagesAnalyzed} page(s) with overview length ${sumRes.summary.overview.length}`
  );

  // 13. Translate PDF (25-Language Matrix & Amharic local support)
  const transAmh = await translatePdfDocument(testBuffer.slice(0), 'amh');
  assert(
    'Translate PDF (Amharic)',
    transAmh.isSupported && transAmh.translatedText.length > 0,
    `Translated to Amharic (supported: ${transAmh.isSupported}, length: ${transAmh.translatedText.length})`
  );

  const transSpan = await translatePdfDocument(testBuffer.slice(0), 'es');
  assert(
    'Translate PDF (Unsupported Spanish)',
    !transSpan.isSupported && Boolean(transSpan.unsupportedMessage),
    `Spanish honestly returned unsupported (message: "${transSpan.unsupportedMessage?.slice(0, 45)}...")`
  );

  // ================================================================
  // STEP 2 DEDICATED VERIFICATION: PDF ENGINE RESILIENCE
  // ================================================================
  const { normalizePdfInput } = await import('../src/lib/pdfInputNormalizer');

  // 14. Shared Input Normalizer: Valid PDF
  const normValid = await normalizePdfInput(testBuffer);
  assert(
    'Normalizer Valid PDF',
    normValid.hasPdfHeader && normValid.headerOffset === 0 && normValid.size > 0,
    `Valid PDF normalized: offset ${normValid.headerOffset}, size ${normValid.size} bytes, version ${normValid.pdfVersion}`
  );

  // 15. Shared Input Normalizer: Leading UTF-8 BOM and whitespace offset
  const bomBytes = new Uint8Array(testBuffer.byteLength + 6);
  bomBytes.set([0xef, 0xbb, 0xbf, 0x20, 0x20, 0x20], 0);
  bomBytes.set(new Uint8Array(testBuffer), 6);
  const normBom = await normalizePdfInput(bomBytes.buffer);
  assert(
    'Normalizer BOM & Whitespace Offset',
    normBom.hasPdfHeader && normBom.headerOffset === 6 && normBom.uint8Array[0] === 0x25,
    `BOM offset detected at +${normBom.headerOffset} and realigned cleanly to '%PDF-' at index 0`
  );

  // 16. Shared Input Normalizer: Zero-byte rejection
  let zeroByteCaught = false;
  try {
    await normalizePdfInput(new ArrayBuffer(0));
  } catch (err: any) {
    zeroByteCaught = true;
    assert(
      'Normalizer Zero-Byte Rejection',
      err.message.includes('0 bytes'),
      `Zero-byte input rejected honestly: "${err.message}"`
    );
  }
  if (!zeroByteCaught) {
    throw new Error('Zero-byte buffer was not rejected by normalizer');
  }

  // 17. Shared Input Normalizer: Corrupt non-PDF binary rejection
  let nonPdfCaught = false;
  try {
    const fakeHtml = new TextEncoder().encode('<html><body>Not a PDF</body></html>');
    await normalizePdfInput(fakeHtml.buffer);
  } catch (err: any) {
    nonPdfCaught = true;
    assert(
      'Normalizer Non-PDF Rejection',
      err.message.includes('does not contain a valid PDF header'),
      `Corrupt non-PDF rejected honestly: "${err.message}"`
    );
  }
  if (!nonPdfCaught) {
    throw new Error('Non-PDF input was not rejected by normalizer');
  }

  // 18. Crop PDF: Multi-page document with different page dimensions
  const multiDoc = await PDFDocument.create();
  const page1 = multiDoc.addPage([600, 800]); // Portrait Letter-like
  page1.drawText('Page 1 Portrait', { x: 50, y: 700 });
  const page2 = multiDoc.addPage([800, 500]); // Landscape
  page2.drawText('Page 2 Landscape', { x: 50, y: 400 });
  const multiBytes = await multiDoc.save();
  const multiBuffer = multiBytes.buffer.slice(multiBytes.byteOffset, multiBytes.byteOffset + multiBytes.byteLength) as ArrayBuffer;

  const croppedMulti = await cropPdf(multiBuffer, { marginPercent: 10 });
  const verifyCropped = await PDFDocument.load(croppedMulti);
  assert(
    'Crop PDF Mixed Page Dimensions',
    verifyCropped.getPageCount() === 2,
    'Cropped 2-page document with mixed page dimensions successfully'
  );
  const p1Crop = verifyCropped.getPages()[0].getCropBox();
  const p2Crop = verifyCropped.getPages()[1].getCropBox();
  assert(
    'Crop PDF Proportional Margins',
    p1Crop.width === 480 && p2Crop.width === 640,
    `Page 1 crop width: ${p1Crop.width} (600 - 20%), Page 2 crop width: ${p2Crop.width} (800 - 20%)`
  );

  // 19. Watermark: Verification of actual modification
  const markedPdf = await addWatermarkToPdf(testBuffer, {
    text: 'VERIFIED QA',
    opacity: 0.5,
    rotation: 45,
    fontSize: 40,
  });
  assert(
    'Watermark Modification Confirmed',
    markedPdf.byteLength !== testBuffer.byteLength && markedPdf.byteLength > 0,
    `Watermarked PDF bytes modified (original: ${testBuffer.byteLength}, marked: ${markedPdf.byteLength})`
  );

  // 20. Repair PDF: Intentionally Unrecoverable Binary
  const noiseBytes = new Uint8Array(1024);
  for (let i = 0; i < noiseBytes.length; i++) {
    noiseBytes[i] = (i * 37 + 11) % 256;
  }
  const unrecRes = await repairPdf(noiseBytes.buffer, 'corrupt-noise');
  assert(
    'Repair PDF Unrecoverable',
    unrecRes.status === 'Unrecoverable' && unrecRes.bytes === null && unrecRes.recoveredPages === 0,
    `Unrecoverable binary classified as ${unrecRes.status} with bytes === null and diagnostics: "${unrecRes.diagnostics[0]}"`
  );

  // 21. Repair PDF: Realigned from leading BOM/offset
  const repBomRes = await repairPdf(bomBytes.buffer, 'bom-repaired');
  assert(
    'Repair PDF Offset Recovery',
    repBomRes.status === 'Repaired' && repBomRes.bytes !== null && repBomRes.recoveredPages === 1,
    `Repaired BOM-damaged PDF returned status ${repBomRes.status} with ${repBomRes.recoveredPages} page recovered`
  );

  // 22. PowerPoint to PDF: Multi-slide presentation with title slide and multiple text blocks
  const pptxZip = new JSZip();
  pptxZip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>');
  pptxZip.file(
    'ppt/slides/slide1.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
    <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:cSld><p:spTree>
        <p:sp><p:txBody><a:p><a:r><a:t xml:space="preserve">DocuNexa Executive Presentation</a:t></a:r></a:p></p:txBody></p:sp>
        <p:sp><p:txBody><a:p><a:r><a:t>Overview of client-side document processing suite</a:t></a:r></a:p></p:txBody></p:sp>
        <p:sp><p:txBody><a:p><a:r><a:t>Zero data transmission guarantee</a:t></a:r></a:p></p:txBody></p:sp>
      </p:spTree></p:cSld>
    </p:sld>`
  );
  pptxZip.file(
    'ppt/slides/slide2.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
    <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:cSld><p:spTree>
        <p:sp><p:txBody><a:p><a:r><a:t>Architecture &amp; Features</a:t></a:r></a:p></p:txBody></p:sp>
        <p:sp><p:txBody><a:p><a:r><a:t>WebAssembly PDF parsing</a:t></a:r></a:p></p:txBody></p:sp>
        <p:sp><p:txBody><a:p><a:r><a:t>Offline translation matrix (25 languages)</a:t></a:r></a:p></p:txBody></p:sp>
        <p:sp><p:txBody><a:p><a:r><a:t>AcroForm field interaction &amp; export</a:t></a:r></a:p></p:txBody></p:sp>
      </p:spTree></p:cSld>
    </p:sld>`
  );
  pptxZip.file(
    'ppt/slides/slide3.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
    <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:cSld><p:spTree>
        <p:sp><p:txBody><a:p><a:r><a:t>Conclusion &amp; Release Roadmap</a:t></a:r></a:p></p:txBody></p:sp>
        <p:sp><p:txBody><a:p><a:r><a:t>All 34 tools verified in local browser</a:t></a:r></a:p></p:txBody></p:sp>
        <p:sp><p:txBody><a:p><a:r><a:t>Production readiness confirmed</a:t></a:r></a:p></p:txBody></p:sp>
      </p:spTree></p:cSld>
    </p:sld>`
  );
  const pptxBuffer = await pptxZip.generateAsync({ type: 'arraybuffer' });
  const pptxPdfRes = await convertPowerPointToPdf(pptxBuffer, 'docunexa-pitch');
  assert(
    'PowerPoint to PDF Multi-Slide Conversion',
    pptxPdfRes.pageCount === 3 && pptxPdfRes.bytes.length > 500,
    `Converted 3-slide PPTX to PDF with exactly ${pptxPdfRes.pageCount} pages (${pptxPdfRes.bytes.length} bytes)`
  );
  const verifyPptxPdf = await PDFDocument.load(pptxPdfRes.bytes);
  assert(
    'PowerPoint PDF Load Verification',
    verifyPptxPdf.getPageCount() === 3,
    'Resulting PowerPoint PDF opens cleanly and contains 3 slides'
  );

  // 23. PowerPoint to PDF: Legacy .ppt Rejection
  const legacyPptBytes = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  let legacyPptRejected = false;
  try {
    await convertPowerPointToPdf(legacyPptBytes.buffer, 'legacy');
  } catch (err: any) {
    legacyPptRejected = err.message.includes('Legacy binary PowerPoint (.ppt) format is not supported');
    assert(
      'PowerPoint Legacy .ppt Rejection',
      legacyPptRejected,
      `Honest error returned for legacy .ppt: "${err.message}"`
    );
  }
  if (!legacyPptRejected) throw new Error('Legacy .ppt was not rejected');

  // 24. Word to PDF: OpenXML .docx with headings and paragraphs
  const docxZip = new JSZip();
  docxZip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>');
  docxZip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Unit 1: Introduction to DocuNexa Architecture</w:t></w:r></w:p>
        <w:p><w:r><w:t>DocuNexa is a comprehensive, client-side PDF and office document suite.</w:t></w:r></w:p>
        <w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Core Engineering Principles</w:t></w:r></w:p>
        <w:p><w:r><w:t>• 100% browser-based execution with zero cloud storage</w:t></w:r></w:p>
        <w:p><w:r><w:t>• Accurate format transformation with OpenXML standards</w:t></w:r></w:p>
        <w:p><w:r><w:t>• Transparent error states without fake fallback files</w:t></w:r></w:p>
      </w:body>
    </w:document>`
  );
  const docxBuffer = await docxZip.generateAsync({ type: 'arraybuffer' });
  const docxPdfRes = await convertWordToPdf(docxBuffer, 'architecture-spec');
  assert(
    'Word to PDF OpenXML Conversion',
    docxPdfRes.pageCount >= 1 && docxPdfRes.bytes.length > 500,
    `Converted .docx to PDF with ${docxPdfRes.pageCount} page(s) (${docxPdfRes.bytes.length} bytes)`
  );
  const verifyDocxPdf = await PDFDocument.load(docxPdfRes.bytes);
  assert(
    'Word PDF Load Verification',
    verifyDocxPdf.getPageCount() >= 1,
    'Resulting Word PDF opens cleanly with verified page structure'
  );

  // 25. Word to PDF: Legacy .doc Rejection
  const legacyDocBytes = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  let legacyDocRejected = false;
  try {
    await convertWordToPdf(legacyDocBytes.buffer, 'legacy');
  } catch (err: any) {
    legacyDocRejected = err.message.includes('Legacy binary Word (.doc) format is not supported');
    assert(
      'Word Legacy .doc Rejection',
      legacyDocRejected,
      `Honest error returned for legacy .doc: "${err.message}"`
    );
  }
  if (!legacyDocRejected) throw new Error('Legacy .doc was not rejected');

  // 26. PDF Forms: Text field, Checkbox, Dropdown detection & value persistence
  const multiFormDoc = await PDFDocument.create();
  const multiFormPage = multiFormDoc.addPage([600, 400]);
  const pdfForm = multiFormDoc.getForm();

  // Add text field
  const txtField = pdfForm.createTextField('applicantName');
  txtField.setText('Initial Name');
  txtField.addToPage(multiFormPage, { x: 50, y: 300, width: 200, height: 25 });

  // Add checkbox
  const chkField = pdfForm.createCheckBox('agreeTerms');
  chkField.uncheck();
  chkField.addToPage(multiFormPage, { x: 50, y: 250, width: 20, height: 20 });

  // Add dropdown
  const dropField = pdfForm.createDropdown('preferredCountry');
  dropField.setOptions(['Ethiopia', 'United States', 'Germany', 'Japan']);
  dropField.select('United States');
  dropField.addToPage(multiFormPage, { x: 50, y: 200, width: 150, height: 25 });

  const rawFormBytes = await multiFormDoc.save();
  const formBuf = rawFormBytes.buffer.slice(rawFormBytes.byteOffset, rawFormBytes.byteOffset + rawFormBytes.byteLength) as ArrayBuffer;

  const detected = await detectPdfFormFields(formBuf);
  assert(
    'PDF Forms Detection',
    detected.hasForm && detected.fields.length === 3,
    `Detected ${detected.fields.length} interactive fields (expected: 3)`
  );

  // Fill the form fields
  const filledMultiRes = await fillPdfForm(
    formBuf,
    {
      applicantName: 'Dr. Jane Doe',
      agreeTerms: true,
      preferredCountry: 'Ethiopia',
    },
    'application-form'
  );

  assert(
    'PDF Forms Fill & Persistence',
    filledMultiRes.bytes.length > 500 && filledMultiRes.modifiedCount >= 3,
    `Filled form exported with ${filledMultiRes.modifiedCount} modified fields`
  );

  // Verify persistence in reloaded PDF
  const reloadedFilled = await PDFDocument.load(filledMultiRes.bytes);
  const reloadedForm = reloadedFilled.getForm();
  const reloadedName = reloadedForm.getTextField('applicantName').getText();
  const reloadedAgree = reloadedForm.getCheckBox('agreeTerms').isChecked();
  const reloadedCountry = reloadedForm.getDropdown('preferredCountry').getSelected();

  assert(
    'PDF Form Field Values Persisted',
    reloadedName === 'Dr. Jane Doe' && reloadedAgree === true && reloadedCountry[0] === 'Ethiopia',
    `Persisted values verified: Name="${reloadedName}", Agree=${reloadedAgree}, Country="${reloadedCountry[0]}"`
  );

  // 27. PDF Forms: Non-Form Rejection
  const blankDoc = await PDFDocument.create();
  blankDoc.addPage([600, 400]);
  const blankBytes = await blankDoc.save();
  const blankBuffer = blankBytes.buffer.slice(blankBytes.byteOffset, blankBytes.byteOffset + blankBytes.byteLength) as ArrayBuffer;
  let nonFormCaught = false;
  try {
    await fillPdfForm(blankBuffer, { name: 'test' }, 'blank');
  } catch (err: any) {
    nonFormCaught = err.message.includes('no interactive AcroForm fields');
    assert(
      'PDF Forms Non-Form Rejection',
      nonFormCaught,
      `Rejects form filling on non-form document: "${err.message}"`
    );
  }
  if (!nonFormCaught) throw new Error('Non-form document was not rejected by fillPdfForm');

  // 28. PDF Forms: Adobe XFA Detection and Rejection
  const xfaDoc = await PDFDocument.create();
  xfaDoc.addPage([600, 400]);
  // Inject mock XFA key into AcroForm dict
  const acroFormDict = xfaDoc.context.obj({
    Fields: [],
    XFA: xfaDoc.context.obj(['preamble', 'xdp']),
  });
  xfaDoc.catalog.set(PDFName.of('AcroForm'), acroFormDict);
  const xfaBytes = await xfaDoc.save();
  const xfaBuffer = xfaBytes.buffer.slice(xfaBytes.byteOffset, xfaBytes.byteOffset + xfaBytes.byteLength) as ArrayBuffer;

  const xfaDetect = await detectPdfFormFields(xfaBuffer);
  assert(
    'PDF Forms XFA Detection',
    xfaDetect.isXfa === true && Boolean(xfaDetect.xfaNotice),
    `XFA form detected: isXfa=${xfaDetect.isXfa}, notice: "${xfaDetect.xfaNotice?.slice(0, 50)}..."`
  );

  let xfaFillCaught = false;
  try {
    await fillPdfForm(xfaBuffer, { test: 'val' }, 'xfa-test');
  } catch (err: any) {
    xfaFillCaught = err.message.includes('Unsupported Form Technology: This document uses Adobe XML Forms Architecture (XFA)');
    assert(
      'PDF Forms XFA Fill Rejection',
      xfaFillCaught,
      `Honest rejection of XFA modification: "${err.message}"`
    );
  }
  if (!xfaFillCaught) throw new Error('XFA form was not rejected by fillPdfForm');

  // ----------------------------------------------------------------------
  // STEP 4 OF 5 — SCAN TO PDF, TRANSLATE PDF, DOCUMENT INTELLIGENCE TESTS
  // ----------------------------------------------------------------------

  // 29. Scan to PDF: Multiple images in sequence with order preservation
  const redDotPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  const blueDotPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEElEQVR42mNk+M/wHwAE/wH+Ts+ZmgAAAABJRU5ErkJggg==',
    'base64'
  );

  const multiImageBytes = await imagesToPdf([
    { buffer: redDotPng, name: 'page1_red.png', type: 'image/png' },
    { buffer: blueDotPng, name: 'page2_blue.png', type: 'image/png' },
  ]);
  const multiImagePdf = await PDFDocument.load(multiImageBytes);
  assert(
    'Scan to PDF Multi-Image Pages',
    multiImagePdf.getPageCount() === 2,
    `Compiled 2 images into ${multiImagePdf.getPageCount()} valid PDF pages`
  );
  assert(
    'Scan to PDF Page Geometry',
    multiImagePdf.getPage(0).getWidth() === 2 && multiImagePdf.getPage(0).getHeight() === 2,
    `Page dimensions match embedded image geometry (2x2)`
  );

  // 30. Scan to PDF: Mixed format (PNG + JPG) support
  const minimalJpg = Buffer.from(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
    'base64'
  );
  const mixedImageBytes = await imagesToPdf([
    { buffer: redDotPng, name: 'scan_01.png', type: 'image/png' },
    { buffer: minimalJpg, name: 'scan_02.jpg', type: 'image/jpeg' },
  ]);
  const mixedImagePdf = await PDFDocument.load(mixedImageBytes);
  assert(
    'Scan to PDF Mixed JPG/PNG',
    mixedImagePdf.getPageCount() === 2,
    `Successfully compiled mixed PNG and JPG files into ${mixedImagePdf.getPageCount()} page PDF`
  );

  // 31. Translate PDF: Authentic Amharic glossary transformation
  const vocabDoc = await PDFDocument.create();
  const vPage = vocabDoc.addPage([600, 400]);
  const vFont = await vocabDoc.embedFont(StandardFonts.Helvetica);
  vPage.drawText('Unit 1: Introduction to Biology and Science', { x: 50, y: 350, size: 14, font: vFont });
  vPage.drawText('Chapter summary: The cell is the basic unit of genetics.', { x: 50, y: 300, size: 12, font: vFont });
  const vocabPdfBytes = await vocabDoc.save();
  const vocabBuffer = vocabPdfBytes.buffer.slice(vocabPdfBytes.byteOffset, vocabPdfBytes.byteOffset + vocabPdfBytes.byteLength) as ArrayBuffer;

  const amhTrans = await translatePdfDocument(vocabBuffer, 'amh');
  assert(
    'Translate PDF Amharic Glossary',
    amhTrans.isSupported === true && amhTrans.translatedText.includes('ምዕራፍ') && amhTrans.translatedText.includes('ሳይንስ'),
    `Amharic translation correctly transformed terms: "${amhTrans.translatedText.slice(0, 80)}..."`
  );

  // 32. Translate PDF: Zero-match honesty (never returns source text as fake translation)
  const noMatchDoc = await PDFDocument.create();
  const nmFont = await noMatchDoc.embedFont(StandardFonts.Helvetica);
  const nmPage = noMatchDoc.addPage([600, 400]);
  nmPage.drawText('Xylophone quantum kaleidoscope zebra orbit xenon.', { x: 50, y: 350, size: 12, font: nmFont });
  const noMatchBytes = await noMatchDoc.save();
  const noMatchBuffer = noMatchBytes.buffer.slice(noMatchBytes.byteOffset, noMatchBytes.byteOffset + noMatchBytes.byteLength) as ArrayBuffer;

  const noMatchTrans = await translatePdfDocument(noMatchBuffer, 'amh');
  assert(
    'Translate PDF Zero-Match Honesty',
    noMatchTrans.isSupported === false && noMatchTrans.translatedText === '',
    `Honestly refused fake translation when 0 glossary terms matched: "${noMatchTrans.unsupportedMessage?.slice(0, 60)}..."`
  );

  // 33. Translate PDF: Unsupported language rejection (Spanish / French / etc.)
  const spanTrans = await translatePdfDocument(vocabBuffer, 'spa');
  assert(
    'Translate PDF Unsupported Language Rejection',
    spanTrans.isSupported === false && spanTrans.translatedText === '' && Boolean(spanTrans.unsupportedMessage),
    `Rejected Spanish with external provider requirement: "${spanTrans.unsupportedMessage?.slice(0, 60)}..."`
  );

  // 34. Translate PDF: Scanned-only PDF rejection (0 selectable text)
  const samplesDir = path.join(__dirname, 'samples');
  const scannedPdfBuf = fs.readFileSync(path.join(samplesDir, 'scanned-document.pdf'));
  const scTrans = await translatePdfDocument(
    scannedPdfBuf.buffer.slice(scannedPdfBuf.byteOffset, scannedPdfBuf.byteOffset + scannedPdfBuf.byteLength) as ArrayBuffer,
    'amh'
  );
  assert(
    'Translate PDF Scanned Document Rejection',
    scTrans.isScannedWarning === true && scTrans.isSupported === false,
    `Scanned document detected and redirected to OCR: "${scTrans.unsupportedMessage?.slice(0, 60)}..."`
  );

  // 35. Document Summarizer: Text PDF Extraction, Chunking & Exports
  const sumRes2 = await summarizePdfDocument(vocabBuffer, 'test-unit');
  assert(
    'Document Summarizer Overview Generation',
    Boolean(sumRes2.summary.overview) && sumRes2.isScannedWarning === false && sumRes2.pagesAnalyzed === 1,
    `Generated executive overview: "${sumRes2.summary.overview.slice(0, 70)}..."`
  );

  const mdExport = formatSummaryAsMarkdown(sumRes2, 'Test Unit');
  assert(
    'Document Summarizer Markdown Export',
    mdExport.includes('# Executive Document Summary: Test Unit') && mdExport.includes('## Overview'),
    `Formatted valid Markdown export (${mdExport.length} chars)`
  );

  const txtExport = formatSummaryAsPlainText(sumRes2, 'Test Unit');
  assert(
    'Document Summarizer Plain Text Export',
    txtExport.includes('EXECUTIVE DOCUMENT SUMMARY: TEST UNIT') && txtExport.includes('OVERVIEW:'),
    `Formatted valid plain text export (${txtExport.length} chars)`
  );

  // 36. Document Summarizer: Scanned Document Zero-Fabrication
  const sumScanned = await summarizePdfDocument(
    scannedPdfBuf.buffer.slice(scannedPdfBuf.byteOffset, scannedPdfBuf.byteOffset + scannedPdfBuf.byteLength) as ArrayBuffer,
    'scanned'
  );
  assert(
    'Document Summarizer Scanned Rejection',
    sumScanned.isScannedWarning === true && sumScanned.summary.keyPoints.length === 0,
    `Scanned document identified without fabricating dummy key takeaways: "${sumScanned.summary.overview.slice(0, 60)}..."`
  );

  console.log('\n================================================================');
  console.log(` ALL ${passed} OF ${total} RUNTIME REPAIR TESTS PASSED (100%)`);
  console.log('================================================================\n');
}

runRuntimeVerification().catch((err) => {
  console.error('Runtime verification failed:', err);
  process.exit(1);
});
