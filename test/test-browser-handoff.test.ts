import { PDFDocument, rgb, StandardFonts, PDFName } from 'pdf-lib';
import JSZip from 'jszip';
import * as fs from 'fs';
import * as path from 'path';
import { convertPowerPointToPdf, convertWordToPdf } from '../src/lib/tools/officeToPdf';
import { convertPdfToWord } from '../src/lib/tools/pdfToWord';
import { convertPdfToExcel } from '../src/lib/tools/pdfToExcel';
import { detectPdfFormFields, fillPdfForm } from '../src/lib/tools/pdfForms';
import { normalizePdfInput } from '../src/lib/pdfInputNormalizer';

async function runBrowserHandoffAudit() {
  console.log('================================================================');
  console.log('  DOCUNEXA — BROWSER RUNTIME & BINARY HANDOFF AUDIT (STEP 3/5)');
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

  const samplesDir = path.join(__dirname, 'samples');

  // ----------------------------------------------------
  // 1. POWERPOINT TO PDF BROWSER PIPELINE
  // ----------------------------------------------------
  console.log('--- 1. Testing PowerPoint to PDF Browser Pipeline ---');
  const pptxFileBuffer = fs.readFileSync(path.join(samplesDir, 'presentation.pptx'));
  const pptxAb = pptxFileBuffer.buffer.slice(
    pptxFileBuffer.byteOffset,
    pptxFileBuffer.byteOffset + pptxFileBuffer.byteLength
  ) as ArrayBuffer;

  // Simulate mock browser File object
  const mockPptxFile = {
    name: 'presentation.pptx',
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    size: pptxAb.byteLength,
    arrayBuffer: async () => pptxAb.slice(0),
  } as any as File;

  // Handoff 1: Normalizer must NOT require PDF header for PowerPoint tool
  const pptxNorm = await normalizePdfInput(mockPptxFile, {
    requirePdfHeader: false,
    toolName: 'PowerPoint to PDF',
  });
  assert(
    'PPTX Normalizer Handoff',
    pptxNorm.arrayBuffer.byteLength === pptxAb.byteLength,
    `Normalizer accepted non-PDF PowerPoint without false header rejection (${pptxNorm.arrayBuffer.byteLength} bytes)`
  );

  // Handoff 2: Processor converts PPTX OpenXML to PDF
  const pptxRes = await convertPowerPointToPdf(pptxNorm.arrayBuffer, 'presentation');
  assert(
    'PPTX Processor Execution',
    pptxRes.pageCount === 2 && pptxRes.bytes.length > 500,
    `Converted 2 slides to ${pptxRes.pageCount} page PDF (${pptxRes.bytes.length} bytes)`
  );

  // Handoff 3: Resulting PDF opens cleanly
  const pptxVerifyDoc = await PDFDocument.load(pptxRes.bytes);
  assert(
    'PPTX PDF Document Integrity',
    pptxVerifyDoc.getPageCount() === 2,
    `Resulting PDF has valid structure with ${pptxVerifyDoc.getPageCount()} pages`
  );

  // Handoff 4: Output Blob & Download URL generation
  const pptxBlob = new Blob([pptxRes.bytes as BlobPart], { type: 'application/pdf' });
  assert(
    'PPTX Output Blob Packaging',
    pptxBlob.size === pptxRes.bytes.byteLength && pptxBlob.type === 'application/pdf',
    `Generated valid Blob (${pptxBlob.size} bytes, MIME: ${pptxBlob.type})`
  );

  // ----------------------------------------------------
  // 2. WORD TO PDF BROWSER PIPELINE
  // ----------------------------------------------------
  console.log('\n--- 2. Testing Word to PDF Browser Pipeline ---');
  const docxFileBuffer = fs.readFileSync(path.join(samplesDir, 'report.docx'));
  const docxAb = docxFileBuffer.buffer.slice(
    docxFileBuffer.byteOffset,
    docxFileBuffer.byteOffset + docxFileBuffer.byteLength
  ) as ArrayBuffer;

  const mockDocxFile = {
    name: 'report.docx',
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: docxAb.byteLength,
    arrayBuffer: async () => docxAb.slice(0),
  } as any as File;

  // Handoff 1: Normalizer
  const docxNorm = await normalizePdfInput(mockDocxFile, {
    requirePdfHeader: false,
    toolName: 'Word to PDF',
  });
  assert(
    'DOCX Normalizer Handoff',
    docxNorm.arrayBuffer.byteLength === docxAb.byteLength,
    `Normalizer accepted non-PDF Word doc without false header rejection (${docxNorm.arrayBuffer.byteLength} bytes)`
  );

  // Handoff 2: Processor
  const docxRes = await convertWordToPdf(docxNorm.arrayBuffer, 'report');
  assert(
    'DOCX Processor Execution',
    docxRes.pageCount >= 1 && docxRes.bytes.length > 500,
    `Converted Word OpenXML to ${docxRes.pageCount} page PDF (${docxRes.bytes.length} bytes)`
  );

  // Handoff 3: Integrity
  const docxVerifyDoc = await PDFDocument.load(docxRes.bytes);
  assert(
    'DOCX PDF Document Integrity',
    docxVerifyDoc.getPageCount() >= 1,
    `Resulting PDF verified with ${docxVerifyDoc.getPageCount()} page(s)`
  );

  // Handoff 4: Output Blob
  const docxBlob = new Blob([docxRes.bytes as BlobPart], { type: 'application/pdf' });
  assert(
    'DOCX Output Blob Packaging',
    docxBlob.size === docxRes.bytes.byteLength && docxBlob.type === 'application/pdf',
    `Generated valid Blob (${docxBlob.size} bytes, MIME: ${docxBlob.type})`
  );

  // ----------------------------------------------------
  // 3. PDF TO WORD BROWSER PIPELINE
  // ----------------------------------------------------
  console.log('\n--- 3. Testing PDF to Word Browser Pipeline ---');
  const pdfTableBuffer = fs.readFileSync(path.join(samplesDir, 'financial-table.pdf'));
  const pdfTableAb = pdfTableBuffer.buffer.slice(
    pdfTableBuffer.byteOffset,
    pdfTableBuffer.byteOffset + pdfTableBuffer.byteLength
  ) as ArrayBuffer;

  const mockTablePdfFile = {
    name: 'financial-table.pdf',
    type: 'application/pdf',
    size: pdfTableAb.byteLength,
    arrayBuffer: async () => pdfTableAb.slice(0),
  } as any as File;

  // Handoff 1: Normalizer requires valid PDF header
  const tablePdfNorm = await normalizePdfInput(mockTablePdfFile, {
    requirePdfHeader: true,
    toolName: 'PDF to Word',
  });
  assert(
    'PDF to Word Normalizer',
    tablePdfNorm.arrayBuffer.byteLength > 0,
    `Normalizer verified valid PDF header (%PDF-) (${tablePdfNorm.arrayBuffer.byteLength} bytes)`
  );

  // Handoff 2: Processor
  const wordRes = await convertPdfToWord(tablePdfNorm.arrayBuffer, 'financial-table');
  assert(
    'PDF to Word Conversion',
    wordRes.bytes.length > 500 && wordRes.paragraphCount > 0,
    `Generated DOCX with ${wordRes.paragraphCount} paragraphs, ${wordRes.headingsCount} headings (${wordRes.bytes.length} bytes)`
  );

  // Handoff 3: ZIP and word/document.xml verification
  const wordZip = await JSZip.loadAsync(wordRes.bytes);
  assert(
    'PDF to Word OpenXML Package',
    Boolean(wordZip.file('word/document.xml')),
    'Output is a genuine OpenXML DOCX package containing word/document.xml'
  );
  const wordXml = await wordZip.file('word/document.xml')!.async('string');
  assert(
    'PDF to Word Extracted Text',
    wordXml.includes('Financial Summary') && wordXml.includes('Quarter') && wordXml.includes('Revenue'),
    'Output document.xml contains faithfully extracted headings and tabular content'
  );

  // Handoff 4: Output Blob with correct MIME
  const wordBlob = new Blob([wordRes.bytes as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  assert(
    'PDF to Word Blob Packaging',
    wordBlob.size === wordRes.bytes.byteLength,
    `Generated valid DOCX Blob (${wordBlob.size} bytes)`
  );

  // ----------------------------------------------------
  // 4. PDF TO EXCEL 4-CATEGORY ACCEPTANCE PIPELINE
  // ----------------------------------------------------
  console.log('\n--- 4. Testing PDF to Excel Acceptance Pipeline ---');

  // Category A & B: Structured Multi-row Table
  const excelTableRes = await convertPdfToExcel(tablePdfNorm.arrayBuffer.slice(0), 'financial-table');
  assert(
    'PDF to Excel Structured Table Success',
    excelTableRes.success === true && excelTableRes.canDownload === true && excelTableRes.bytes !== null,
    `Structured table converted successfully: success=${excelTableRes.success}, canDownload=${excelTableRes.canDownload}`
  );
  assert(
    'PDF to Excel Grid Inferred',
    excelTableRes.isTableStructured === true && excelTableRes.confidence >= 50,
    `Grid inferred with confidence ${excelTableRes.confidence}%, rows: ${excelTableRes.rowCount}, cols: ${excelTableRes.colCount}`
  );
  assert(
    'PDF to Excel Worksheets Count',
    excelTableRes.sheetCount === 1,
    `Generated ${excelTableRes.sheetCount} worksheet(s) matching extractable pages`
  );

  // Category D: Entirely Scanned / Image-Only Document
  const scannedPdfBuffer = fs.readFileSync(path.join(samplesDir, 'scanned-document.pdf'));
  const scannedAb = scannedPdfBuffer.buffer.slice(
    scannedPdfBuffer.byteOffset,
    scannedPdfBuffer.byteOffset + scannedPdfBuffer.byteLength
  ) as ArrayBuffer;

  const scannedExcelRes = await convertPdfToExcel(scannedAb, 'scanned-document');
  assert(
    'PDF to Excel Scanned-Only Strict Contract: success === false',
    scannedExcelRes.success === false,
    `success reported: ${scannedExcelRes.success}`
  );
  assert(
    'PDF to Excel Scanned-Only Strict Contract: canDownload === false',
    scannedExcelRes.canDownload === false,
    `canDownload reported: ${scannedExcelRes.canDownload}`
  );
  assert(
    'PDF to Excel Scanned-Only Strict Contract: bytes === null',
    scannedExcelRes.bytes === null,
    'bytes is strictly null (no misleading empty XLSX exposed)'
  );
  assert(
    'PDF to Excel Scanned-Only Strict Contract: rowCount === 0',
    scannedExcelRes.rowCount === 0,
    `rowCount: ${scannedExcelRes.rowCount}`
  );
  assert(
    'PDF to Excel Scanned-Only Strict Contract: confidence === 0',
    scannedExcelRes.confidence === 0,
    `confidence: ${scannedExcelRes.confidence}`
  );
  assert(
    'PDF to Excel Scanned-Only Strict Contract: isScannedOnly === true',
    scannedExcelRes.isScannedOnly === true,
    `isScannedOnly: ${scannedExcelRes.isScannedOnly}`
  );
  assert(
    'PDF to Excel Scanned-Only Strict Contract: recommends OCR PDF',
    scannedExcelRes.recommendedTool === 'ocr-pdf' &&
      scannedExcelRes.warnings.some((w) => w.toLowerCase().includes('ocr pdf')),
    'Explicitly recommends running OCR PDF first'
  );

  // ----------------------------------------------------
  // 5. PDF FORMS BROWSER PIPELINE
  // ----------------------------------------------------
  console.log('\n--- 5. Testing PDF Forms Browser Pipeline ---');
  const formPdfBuffer = fs.readFileSync(path.join(samplesDir, 'registration-form.pdf'));
  const formAb = formPdfBuffer.buffer.slice(
    formPdfBuffer.byteOffset,
    formPdfBuffer.byteOffset + formPdfBuffer.byteLength
  ) as ArrayBuffer;

  // Detection
  const formDetect = await detectPdfFormFields(formAb.slice(0));
  assert(
    'PDF Forms Field Detection',
    formDetect.hasForm === true && formDetect.fields.length === 3,
    `Detected ${formDetect.fields.length} interactive fields: [${formDetect.fields.map((f) => f.name).join(', ')}]`
  );

  // Filling & Persistence
  const formFillRes = await fillPdfForm(
    formAb.slice(0),
    {
      fullName: 'Kenenisa Bekele',
      department: 'Operations',
      agreeTerms: true,
    },
    'registration-form'
  );
  assert(
    'PDF Forms Fill Execution',
    formFillRes.bytes.length > 500 && formFillRes.modifiedCount === 3,
    `Applied 3 field modifications (${formFillRes.bytes.length} bytes)`
  );

  // Verify reloaded document persists values
  const reloadedDoc = await PDFDocument.load(formFillRes.bytes);
  const reloadedForm = reloadedDoc.getForm();
  const nameVal = reloadedForm.getTextField('fullName').getText();
  const deptVal = reloadedForm.getDropdown('department').getSelected();
  const agreeVal = reloadedForm.getCheckBox('agreeTerms').isChecked();

  assert(
    'PDF Forms Value Persistence',
    nameVal === 'Kenenisa Bekele' && deptVal[0] === 'Operations' && agreeVal === true,
    `Persisted values verified: fullName="${nameVal}", department="${deptVal[0]}", agreeTerms=${agreeVal}`
  );

  console.log('\n================================================================');
  console.log(` ALL ${passed} OF ${total} BROWSER HANDOFF AUDIT TESTS PASSED (100%)`);
  console.log('================================================================\n');
}

runBrowserHandoffAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
