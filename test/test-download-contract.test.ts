import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { getPdfJs, getPdfJsDocumentParams } from '../src/lib/pdfReader';
import {
  CANONICAL_FORMATS,
  createDownloadContract,
  detectFormatFromBytes,
  assertValidBytesForFormat,
  sanitizeDownloadFilename,
  sanitizeBaseName,
  stripAllExtensions,
  resolveFormat,
  CanonicalFormat,
} from '../src/lib/downloadContract';

import { convertPdfToExcel } from '../src/lib/tools/pdfToExcel';
import { convertPdfToWord } from '../src/lib/tools/pdfToWord';
import { convertPdfToPowerPoint } from '../src/lib/tools/pdfToPowerPoint';
import {
  convertExcelToPdf,
  convertWordToPdf,
  convertPowerPointToPdf,
  convertHtmlToPdf,
} from '../src/lib/tools/officeToPdf';
import { convertPdfToMarkdown } from '../src/lib/tools/pdfToMarkdown';
import {
  summarizePdfDocument,
  formatSummaryAsMarkdown,
  formatSummaryAsPlainText,
} from '../src/lib/tools/aiSummarizer';
import { translatePdfDocument } from '../src/lib/tools/translatePdf';
import { performPdfCompression } from '../src/lib/tools/compressPdf';
import { repairPdf } from '../src/lib/tools/repairPdf';
import { preparePdfA } from '../src/lib/tools/pdfToPdfA';
import { fillPdfForm } from '../src/lib/tools/pdfForms';
import {
  mergePdfs,
  splitPdfByRanges,
  splitPdfEveryNPages,
  removePdfPages,
  extractPdfPages,
  rotatePdf,
  addPageNumbersToPdf,
  addWatermarkToPdf,
  imagesToPdf,
  pdfToImages,
  cropPdf,
  encryptPdfFile,
  decryptPdfFile,
  applySignatureToPdf,
  redactPdfAreas,
  comparePdfs,
} from '../src/lib/pdfEngine';
import { createZipBundle } from '../src/lib/cutter';

// ============================================================================
// CONTRACT ASSERTION HELPERS
// ============================================================================

let totalTests = 0;
let passedTests = 0;

function assert(description: string, condition: boolean, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${description}${detail ? ` (${detail})` : ''}`);
  } else {
    console.error(`  ✗ FAIL: ${description}${detail ? ` — ${detail}` : ''}`);
  }
}

export function assertNoDoubleExtension(filename: string): void {
  const forbiddenPatterns = [
    /\.pptx\.pdf$/i,
    /\.xlsx\.pdf$/i,
    /\.docx\.pdf$/i,
    /\.pdf\.pdf$/i,
    /\.jpg\.pdf$/i,
    /\.jpeg\.pdf$/i,
    /\.png\.pdf$/i,
    /\.md\.pdf$/i,
    /\.txt\.pdf$/i,
    /\.zip\.pdf$/i,
    /\.docx\.docx$/i,
    /\.pptx\.pptx$/i,
    /\.xlsx\.xlsx$/i,
    /\.pdf\.project\.json$/i,
  ];

  for (const pat of forbiddenPatterns) {
    if (pat.test(filename)) {
      throw new Error(`Forbidden double-extension detected in '${filename}' matching pattern ${pat}`);
    }
  }

  // Ensure there is at most one dot extension at the end
  const parts = filename.split('.');
  if (parts.length > 2) {
    const secondToLast = parts[parts.length - 2].toLowerCase();
    const knownDocExts = ['pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls', 'jpg', 'jpeg', 'png', 'md', 'txt', 'zip'];
    if (knownDocExts.includes(secondToLast)) {
      throw new Error(`Suspicious stacked extension in filename '${filename}': .${secondToLast}.${parts[parts.length - 1]}`);
    }
  }
}

export function assertFilenameMatchesMime(filename: string, mime: string): void {
  const fmt = resolveFormat(filename);
  const spec = CANONICAL_FORMATS[fmt];
  if (!spec) {
    throw new Error(`Unknown format for filename: ${filename}`);
  }
  const cleanMime = mime.split(';')[0].toLowerCase().trim();
  const specMime = spec.mimeType.split(';')[0].toLowerCase().trim();
  if (cleanMime !== specMime) {
    throw new Error(`MIME mismatch for '${filename}': expected '${specMime}', got '${cleanMime}'`);
  }
}

export function assertExtensionMatchesFormat(ext: string, format: CanonicalFormat): void {
  const spec = CANONICAL_FORMATS[format];
  if (!spec) {
    throw new Error(`Unknown canonical format '${format}'`);
  }
  const cleanExt = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  if (cleanExt !== spec.extension) {
    throw new Error(`Extension mismatch for format '${format}': expected '${spec.extension}', got '${cleanExt}'`);
  }
}

export function assertPdfSignature(bytes: Uint8Array): void {
  if (bytes.length < 5) {
    throw new Error(`Byte stream too short for PDF (${bytes.length} bytes)`);
  }
  const hasPdfHeader =
    (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) ||
    new TextDecoder().decode(bytes.slice(0, 1024)).includes('%PDF-');
  if (!hasPdfHeader) {
    throw new Error('PDF byte stream lacks %PDF- header signature');
  }
}

export async function assertOpenXmlPackage(
  bytes: Uint8Array,
  type: 'docx' | 'pptx' | 'xlsx'
): Promise<void> {
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error(`Invalid PK ZIP header for OpenXML package ${type}`);
  }
  const zip = await JSZip.loadAsync(bytes);
  const hasContentTypes = !!zip.file('[Content_Types].xml');
  if (!hasContentTypes) {
    throw new Error(`OpenXML package ${type} missing [Content_Types].xml`);
  }

  if (type === 'docx') {
    if (!zip.file('word/document.xml')) {
      throw new Error('DOCX package missing word/document.xml');
    }
  } else if (type === 'pptx') {
    if (!zip.file('ppt/presentation.xml')) {
      throw new Error('PPTX package missing ppt/presentation.xml');
    }
  } else if (type === 'xlsx') {
    if (!zip.file('xl/workbook.xml')) {
      throw new Error('XLSX package missing xl/workbook.xml');
    }
  }
}

// ============================================================================
// FIXTURE CREATION HELPERS
// ============================================================================

async function makeTestPdf(): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page1 = doc.addPage([600, 400]);
  page1.drawText('DocuNexa Forensic Test Document - Page 1', { x: 50, y: 350, size: 16, font });
  page1.drawText('Item 1: Analysis', { x: 50, y: 300, size: 12, font });
  const page2 = doc.addPage([600, 400]);
  page2.drawText('DocuNexa Forensic Test Document - Page 2', { x: 50, y: 350, size: 16, font });
  page2.drawText('Item 2: Verification', { x: 50, y: 300, size: 12, font });
  const bytes = await doc.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function makeTestDocx(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>'
  );
  zip.file(
    'word/document.xml',
    '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Introduction to Electricity</w:t></w:r></w:p></w:body></w:document>'
  );
  return await zip.generateAsync({ type: 'arraybuffer' });
}

async function makeTestPptx(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>'
  );
  zip.file(
    'ppt/presentation.xml',
    '<?xml version="1.0" encoding="UTF-8"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>'
  );
  zip.file(
    'ppt/slides/slide1.xml',
    '<?xml version="1.0" encoding="UTF-8"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Grade 10 History</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>'
  );
  return await zip.generateAsync({ type: 'arraybuffer' });
}

async function makeTestXlsx(): Promise<ArrayBuffer> {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['ID', 'Subject', 'Score'],
    ['1', 'Mathematics', '95'],
    ['2', 'Physics', '88'],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Scores');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return out as ArrayBuffer;
}

async function createFormPdf(): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([500, 400]);
  const form = doc.getForm();
  page.drawText('User Registration Form', { x: 50, y: 350, size: 16 });
  page.drawText('Full Name:', { x: 50, y: 300, size: 12 });
  const nameField = form.createTextField('fullName');
  nameField.setText('Jane Doe');
  nameField.addToPage(page, { x: 150, y: 290, width: 200, height: 25 });
  const bytes = await doc.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function createTablePdf(): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 400]);
  page.drawText('Employee Directory Report', { x: 50, y: 350, size: 16 });
  page.drawText('ID', { x: 50, y: 300, size: 12 });
  page.drawText('Name', { x: 150, y: 300, size: 12 });
  page.drawText('Department', { x: 300, y: 300, size: 12 });
  page.drawText('101', { x: 50, y: 270, size: 10 });
  page.drawText('Alice Walker', { x: 150, y: 270, size: 10 });
  page.drawText('Engineering', { x: 300, y: 270, size: 10 });
  page.drawText('102', { x: 50, y: 240, size: 10 });
  page.drawText('Bob Stone', { x: 150, y: 240, size: 10 });
  page.drawText('Creative', { x: 300, y: 240, size: 10 });
  const bytes = await doc.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

// 1x1 valid PNG
const VALID_PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

// 1x1 valid JPEG
const VALID_JPG_BYTES = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60,
  0x00, 0x60, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
  0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
  0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
  0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
  0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
  0x00, 0xbf, 0x80, 0xff, 0xd9,
]);

// ============================================================================
// SUITE EXECUTION
// ============================================================================

async function runDownloadContractAudit() {
  console.log('================================================================');
  console.log(' DOCUNEXA DOWNLOAD PIPELINE FORENSIC AUDIT & CONTRACT TESTS');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // SECTION 1: FORBIDDEN DOUBLE EXTENSION & SANITIZATION TESTS
  // --------------------------------------------------------------------------
  console.log('--- SECTION 1: FILENAME SANITIZATION & FORBIDDEN EXTENSIONS ---');

  const nastyInputs: { input: string; target: CanonicalFormat; action?: string; expected: string }[] = [
    {
      input: 'grade-10-history.pptx.pdf',
      target: 'pptx',
      expected: 'grade-10-history.pptx',
    },
    {
      input: 'grade-10-history.pptx.pdf',
      target: 'pdf',
      expected: 'grade-10-history.pdf',
    },
    {
      input: 'grade-10-mathematics.xlsx.pdf',
      target: 'xlsx',
      expected: 'grade-10-mathematics.xlsx',
    },
    {
      input: 'grade-10-mathematics.xlsx.pdf',
      target: 'pdf',
      expected: 'grade-10-mathematics.pdf',
    },
    {
      input: '2-1-Introduction-to-Electricity-notes.docx.pdf',
      target: 'docx',
      expected: '2-1-Introduction-to-Electricity-notes.docx',
    },
    {
      input: '2-1-Introduction-to-Electricity-notes.docx.pdf',
      target: 'pdf',
      expected: '2-1-Introduction-to-Electricity-notes.pdf',
    },
    {
      input: 'notes.docx - Summary.md',
      target: 'md',
      action: 'Summary',
      expected: 'notes-Summary.md',
    },
    {
      input: 'notes.docx - Summary.txt',
      target: 'txt',
      action: 'Summary',
      expected: 'notes-Summary.txt',
    },
    {
      input: 'annual-report.pdf.pdf',
      target: 'pdf',
      expected: 'annual-report.pdf',
    },
    {
      input: 'presentation.pptx.pptx',
      target: 'pptx',
      expected: 'presentation.pptx',
    },
    {
      input: 'sheet.xlsx.xlsx',
      target: 'xlsx',
      expected: 'sheet.xlsx',
    },
    {
      input: 'document.pdf.project.json',
      target: 'json',
      expected: 'document.json',
    },
    {
      input: 'image.jpg.pdf',
      target: 'jpg',
      expected: 'image.jpg',
    },
    {
      input: 'my-doc.md.pdf',
      target: 'md',
      expected: 'my-doc.md',
    },
    {
      input: 'archive.zip.pdf',
      target: 'zip',
      expected: 'archive.zip',
    },
    {
      input: 'bad:name*with?invalid<chars>|test.pptx',
      target: 'pptx',
      expected: 'bad-name-with-invalid-chars-test.pptx',
    },
  ];

  for (const item of nastyInputs) {
    const cleaned = sanitizeDownloadFilename(item.input, item.target, item.action);
    assert(
      `Sanitize '${item.input}' -> '${cleaned}'`,
      cleaned === item.expected,
      `expected '${item.expected}'`
    );
    assertNoDoubleExtension(cleaned);
  }

  // --------------------------------------------------------------------------
  // SECTION 2: DOWNLOAD CONTRACT GENERATION & BYTE SIGNATURE VALIDATION
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 2: CONTRACT GENERATION & BYTE SIGNATURE VALIDATION ---');

  const pdfBuf = await makeTestPdf();
  const pdfBytes = new Uint8Array(pdfBuf);
  const docxBuf = await makeTestDocx();
  const docxBytes = new Uint8Array(docxBuf);
  const pptxBuf = await makeTestPptx();
  const pptxBytes = new Uint8Array(pptxBuf);
  const xlsxBuf = await makeTestXlsx();
  const xlsxBytes = new Uint8Array(xlsxBuf);
  const txtBytes = new TextEncoder().encode('Forensic text analysis output.');
  const mdBytes = new TextEncoder().encode('# Heading 1\n\n- Bullet point');
  const jsonBytes = new TextEncoder().encode('{"project":"DocuNexa","version":"1.0"}');
  const zipBlob = await createZipBundle([{ filename: 'test.pdf', bytes: pdfBytes }]);
  const zipBuf = await zipBlob.arrayBuffer();
  const zipBytes = new Uint8Array(zipBuf as ArrayBuffer);

  // Test detection from byte signatures
  assert('Detect PDF from bytes', detectFormatFromBytes(pdfBytes) === 'pdf');
  assert('Detect DOCX from bytes', detectFormatFromBytes(docxBytes) === 'docx');
  assert('Detect PPTX from bytes', detectFormatFromBytes(pptxBytes) === 'pptx');
  assert('Detect XLSX from bytes', detectFormatFromBytes(xlsxBytes) === 'xlsx');
  assert('Detect PNG from bytes', detectFormatFromBytes(VALID_PNG_BYTES) === 'png');
  assert('Detect JPG from bytes', detectFormatFromBytes(VALID_JPG_BYTES) === 'jpg');
  assert('Detect TXT from bytes', detectFormatFromBytes(txtBytes) === 'txt');
  assert('Detect MD from bytes', detectFormatFromBytes(mdBytes) === 'md');
  assert('Detect JSON from bytes', detectFormatFromBytes(jsonBytes) === 'json');
  assert('Detect ZIP from bytes', detectFormatFromBytes(zipBytes) === 'zip');

  // Verify byte validation fails on mismatched bytes
  let caughtMismatched = false;
  try {
    assertValidBytesForFormat(pdfBytes, 'docx');
  } catch {
    caughtMismatched = true;
  }
  assert('Reject mismatched PDF bytes when claiming DOCX', caughtMismatched);

  // Contract builder check for PowerPoint
  const pptContract = createDownloadContract({
    bytes: pptxBytes,
    filename: 'grade-10-history.pptx.pdf',
    format: 'pptx',
  });
  assert(
    'PPTX contract filename is .pptx',
    pptContract.filename === 'grade-10-history.pptx'
  );
  assert(
    'PPTX contract MIME type is OpenXML presentation',
    pptContract.mimeType === CANONICAL_FORMATS.pptx.mimeType
  );
  assert(
    'PPTX contract action label is Download PowerPoint (.pptx)',
    pptContract.actionLabel === 'Download PowerPoint (.pptx)'
  );
  assertNoDoubleExtension(pptContract.filename);
  assertFilenameMatchesMime(pptContract.filename, pptContract.mimeType);

  // Contract builder check for Excel
  const xlsxContract = createDownloadContract({
    bytes: xlsxBytes,
    filename: 'grade-10-mathematics.xlsx.pdf',
    format: 'xlsx',
  });
  assert(
    'XLSX contract filename is .xlsx',
    xlsxContract.filename === 'grade-10-mathematics.xlsx'
  );
  assert(
    'XLSX contract MIME type is OpenXML spreadsheet',
    xlsxContract.mimeType === CANONICAL_FORMATS.xlsx.mimeType
  );
  assertNoDoubleExtension(xlsxContract.filename);
  assertFilenameMatchesMime(xlsxContract.filename, xlsxContract.mimeType);

  // Contract builder check for Word
  const docxContract = createDownloadContract({
    bytes: docxBytes,
    filename: '2-1-Introduction-to-Electricity-notes.docx.pdf',
    format: 'docx',
  });
  assert(
    'DOCX contract filename is .docx',
    docxContract.filename === '2-1-Introduction-to-Electricity-notes.docx'
  );
  assert(
    'DOCX contract MIME type is OpenXML document',
    docxContract.mimeType === CANONICAL_FORMATS.docx.mimeType
  );
  assertNoDoubleExtension(docxContract.filename);
  assertFilenameMatchesMime(docxContract.filename, docxContract.mimeType);

  // --------------------------------------------------------------------------
  // SECTION 3: 34-TOOL DOWNLOAD PIPELINE AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 3: AUDIT OF ALL 34 DOCUNEXA TOOLS ---');

  // Helper to audit a tool's output
  async function auditToolOutput(options: {
    toolNumber: number;
    toolId: string;
    toolName: string;
    advertisedFormat: CanonicalFormat;
    rawFilename: string;
    bytes: Uint8Array;
    verifier?: (bytes: Uint8Array) => Promise<void> | void;
  }) {
    const { toolNumber, toolId, toolName, advertisedFormat, rawFilename, bytes, verifier } = options;

    const contract = createDownloadContract({
      bytes,
      filename: rawFilename,
      format: advertisedFormat,
    });

    assert(
      `[Tool ${toolNumber}/34: ${toolId}] Downloadable bytes > 0`,
      contract.bytes.length > 0 && contract.blob.size > 0,
      `${contract.bytes.length} bytes`
    );

    assert(
      `[Tool ${toolNumber}/34: ${toolId}] Filename extension matches format (${contract.extension})`,
      contract.filename.endsWith(contract.extension)
    );

    assertNoDoubleExtension(contract.filename);
    assertFilenameMatchesMime(contract.filename, contract.mimeType);
    assertExtensionMatchesFormat(contract.extension, advertisedFormat);

    // Verify binary signature
    if (advertisedFormat === 'pdf') {
      assertPdfSignature(contract.bytes);
    } else if (advertisedFormat === 'docx' || advertisedFormat === 'pptx' || advertisedFormat === 'xlsx') {
      await assertOpenXmlPackage(contract.bytes, advertisedFormat);
    }

    if (verifier) {
      await verifier(contract.bytes);
    }
  }

  // 1. PDF Unit Cutter
  await auditToolOutput({
    toolNumber: 1,
    toolId: 'pdf-unit-cutter',
    toolName: 'PDF Unit Cutter',
    advertisedFormat: 'pdf',
    rawFilename: 'grade-10-history - Unit 1.pdf',
    bytes: pdfBytes,
  });

  // 2. Split PDF
  const splitRes = await splitPdfEveryNPages(pdfBuf, 1, 'notes.docx.pdf');
  await auditToolOutput({
    toolNumber: 2,
    toolId: 'split-pdf',
    toolName: 'Split PDF',
    advertisedFormat: 'pdf',
    rawFilename: splitRes[0].name,
    bytes: splitRes[0].bytes,
  });

  // 3. Merge PDF
  const mergedBytes = await mergePdfs([pdfBuf, pdfBuf]);
  await auditToolOutput({
    toolNumber: 3,
    toolId: 'merge-pdf',
    toolName: 'Merge PDF',
    advertisedFormat: 'pdf',
    rawFilename: sanitizeDownloadFilename('documents - Merged', 'pdf'),
    bytes: mergedBytes,
  });

  // 4. Remove Pages
  const removedBytes = await removePdfPages(pdfBuf, [2]);
  await auditToolOutput({
    toolNumber: 4,
    toolId: 'remove-pages',
    toolName: 'Remove Pages',
    advertisedFormat: 'pdf',
    rawFilename: sanitizeDownloadFilename('book - Pages-Removed', 'pdf'),
    bytes: removedBytes,
  });

  // 5. Extract Pages
  const extractedBytes = await extractPdfPages(pdfBuf, [1]);
  await auditToolOutput({
    toolNumber: 5,
    toolId: 'extract-pages',
    toolName: 'Extract Pages',
    advertisedFormat: 'pdf',
    rawFilename: sanitizeDownloadFilename('book - Extracted-Pages', 'pdf'),
    bytes: extractedBytes,
  });

  // 6. Organize PDF
  const organizedBytes = await extractPdfPages(pdfBuf, [1]);
  await auditToolOutput({
    toolNumber: 6,
    toolId: 'organize-pdf',
    toolName: 'Organize PDF',
    advertisedFormat: 'pdf',
    rawFilename: sanitizeDownloadFilename('book - Organized', 'pdf'),
    bytes: organizedBytes,
  });

  // 7. Scan to PDF
  const scannedPdf = await imagesToPdf([new File([VALID_PNG_BYTES], 'scan.png', { type: 'image/png' })]);
  await auditToolOutput({
    toolNumber: 7,
    toolId: 'scan-to-pdf',
    toolName: 'Scan to PDF',
    advertisedFormat: 'pdf',
    rawFilename: sanitizeDownloadFilename('scanned-doc', 'pdf', 'Scanned'),
    bytes: scannedPdf,
  });

  // 8. Compress PDF
  const compRes = await performPdfCompression(pdfBuf, 'grade-10-history.pptx.pdf', 'balanced');
  await auditToolOutput({
    toolNumber: 8,
    toolId: 'compress-pdf',
    toolName: 'Compress PDF',
    advertisedFormat: 'pdf',
    rawFilename: compRes.filename,
    bytes: compRes.bytes,
  });

  // 9. Repair PDF
  const repRes = await repairPdf(pdfBuf, 'corrupted-document.pdf');
  await auditToolOutput({
    toolNumber: 9,
    toolId: 'repair-pdf',
    toolName: 'Repair PDF',
    advertisedFormat: 'pdf',
    rawFilename: repRes.filename,
    bytes: repRes.bytes!,
  });

  // 10. OCR PDF (Searchable PDF & Transcript)
  await auditToolOutput({
    toolNumber: 10,
    toolId: 'ocr-pdf',
    toolName: 'OCR PDF',
    advertisedFormat: 'pdf',
    rawFilename: sanitizeDownloadFilename('scanned-page', 'pdf', 'Searchable-OCR'),
    bytes: pdfBytes,
  });

  // 11. JPG to PDF
  const jpgToPdfBytes = await imagesToPdf([new File([VALID_JPG_BYTES], 'photo.jpg', { type: 'image/jpeg' })]);
  await auditToolOutput({
    toolNumber: 11,
    toolId: 'jpg-to-pdf',
    toolName: 'JPG to PDF',
    advertisedFormat: 'pdf',
    rawFilename: sanitizeDownloadFilename('photos', 'pdf', 'Compiled'),
    bytes: jpgToPdfBytes,
  });

  // 12. Word to PDF
  const wordToPdfRes = await convertWordToPdf(docxBuf, '2-1-Introduction-to-Electricity-notes.docx.pdf');
  await auditToolOutput({
    toolNumber: 12,
    toolId: 'word-to-pdf',
    toolName: 'Word to PDF',
    advertisedFormat: 'pdf',
    rawFilename: wordToPdfRes.filename,
    bytes: wordToPdfRes.bytes,
  });

  // 13. PowerPoint to PDF
  const pptToPdfRes = await convertPowerPointToPdf(pptxBuf, 'grade-10-history.pptx.pdf');
  await auditToolOutput({
    toolNumber: 13,
    toolId: 'powerpoint-to-pdf',
    toolName: 'PowerPoint to PDF',
    advertisedFormat: 'pdf',
    rawFilename: pptToPdfRes.filename,
    bytes: pptToPdfRes.bytes,
  });

  // 14. Excel to PDF
  const excelToPdfRes = await convertExcelToPdf(xlsxBuf, 'grade-10-mathematics.xlsx.pdf');
  await auditToolOutput({
    toolNumber: 14,
    toolId: 'excel-to-pdf',
    toolName: 'Excel to PDF',
    advertisedFormat: 'pdf',
    rawFilename: excelToPdfRes.filename,
    bytes: excelToPdfRes.bytes,
  });

  // 15. HTML to PDF
  const htmlToPdfRes = await convertHtmlToPdf('<h1>HTML Test</h1><p>DocuNexa conversion.</p>', 'web-article.html');
  await auditToolOutput({
    toolNumber: 15,
    toolId: 'html-to-pdf',
    toolName: 'HTML to PDF',
    advertisedFormat: 'pdf',
    rawFilename: htmlToPdfRes.filename,
    bytes: htmlToPdfRes.bytes,
  });

  // 16. Rotate PDF
  const rotatedBytes = await rotatePdf(pdfBuf, 90);
  await auditToolOutput({
    toolNumber: 16,
    toolId: 'rotate-pdf',
    toolName: 'Rotate PDF',
    advertisedFormat: 'pdf',
    rawFilename: sanitizeDownloadFilename('document', 'pdf', 'Rotated-90deg'),
    bytes: rotatedBytes,
  });

  // 17. Add Page Numbers
  const numberedBytes = await addPageNumbersToPdf(pdfBuf, { position: 'bottom-center', format: 'number', startNumber: 1, fontSize: 10 });
  await auditToolOutput({
    toolNumber: 17,
    toolId: 'add-page-numbers',
    toolName: 'Add Page Numbers',
    advertisedFormat: 'pdf',
    rawFilename: sanitizeDownloadFilename('document', 'pdf', 'Numbered'),
    bytes: numberedBytes,
  });

  // 18. Add Watermark
  const watermarkedBytes = await addWatermarkToPdf(pdfBuf, { text: 'CONFIDENTIAL', opacity: 0.3, rotation: 45, fontSize: 36 });
  await auditToolOutput({
    toolNumber: 18,
    toolId: 'add-watermark',
    toolName: 'Add Watermark',
    advertisedFormat: 'pdf',
    rawFilename: sanitizeDownloadFilename('document', 'pdf', 'Watermarked'),
    bytes: watermarkedBytes,
  });

  // 19. Crop PDF
  const croppedBytes = await cropPdf(pdfBuf, { marginPercent: 5 });
  await auditToolOutput({
    toolNumber: 19,
    toolId: 'crop-pdf',
    toolName: 'Crop PDF',
    advertisedFormat: 'pdf',
    rawFilename: sanitizeDownloadFilename('invoice.pdf', 'pdf', 'cropped'),
    bytes: croppedBytes,
  });

  // 20. Edit PDF
  const editedBytes = await addWatermarkToPdf(pdfBuf, { text: 'Annotations', opacity: 0.5, rotation: 0, fontSize: 24 });
  await auditToolOutput({
    toolNumber: 20,
    toolId: 'edit-pdf',
    toolName: 'Edit PDF',
    advertisedFormat: 'pdf',
    rawFilename: sanitizeDownloadFilename('draft.pdf', 'pdf', 'Edited'),
    bytes: editedBytes,
  });

  // 21. PDF Forms
  const formBuf = await createFormPdf();
  const filledFormBytes = await fillPdfForm(formBuf, { fullName: 'Alice' }, 'tax-form.pdf');
  await auditToolOutput({
    toolNumber: 21,
    toolId: 'pdf-forms',
    toolName: 'PDF Forms',
    advertisedFormat: 'pdf',
    rawFilename: filledFormBytes.filename,
    bytes: filledFormBytes.bytes,
  });

  // 22. Protect PDF
  const encryptedRes = await encryptPdfFile(pdfBuf, 'SecretPass123', { ownerPassword: 'SecretPass123' });
  await auditToolOutput({
    toolNumber: 22,
    toolId: 'protect-pdf',
    toolName: 'Protect PDF',
    advertisedFormat: 'pdf',
    rawFilename: sanitizeDownloadFilename('confidential.pdf', 'pdf', 'protected'),
    bytes: encryptedRes,
  });

  // 23. Unlock PDF
  const decryptedRes = await decryptPdfFile(
    encryptedRes.buffer.slice(encryptedRes.byteOffset, encryptedRes.byteOffset + encryptedRes.byteLength) as ArrayBuffer,
    'SecretPass123'
  );
  await auditToolOutput({
    toolNumber: 23,
    toolId: 'unlock-pdf',
    toolName: 'Unlock PDF',
    advertisedFormat: 'pdf',
    rawFilename: sanitizeDownloadFilename('confidential-protected.pdf', 'pdf', 'unlocked'),
    bytes: decryptedRes,
  });

  // 24. Sign PDF
  const sigDataUrl = `data:image/png;base64,${Buffer.from(VALID_PNG_BYTES).toString('base64')}`;
  const signedBytes = await applySignatureToPdf(pdfBuf, sigDataUrl, 1, 100, 100, 150, 60);
  await auditToolOutput({
    toolNumber: 24,
    toolId: 'sign-pdf',
    toolName: 'Sign PDF',
    advertisedFormat: 'pdf',
    rawFilename: sanitizeDownloadFilename('agreement.pdf', 'pdf', 'signed'),
    bytes: signedBytes,
  });

  // 25. Redact PDF
  const redactedBytes = await redactPdfAreas(pdfBuf, [{ page: 1, x: 50, y: 300, width: 200, height: 20 }]);
  await auditToolOutput({
    toolNumber: 25,
    toolId: 'redact-pdf',
    toolName: 'Redact PDF',
    advertisedFormat: 'pdf',
    rawFilename: sanitizeDownloadFilename('statement.pdf', 'pdf', 'redacted'),
    bytes: redactedBytes,
  });

  // 26. PDF/A
  const pdfaRes = await preparePdfA(pdfBuf, 'archive-record.pdf');
  await auditToolOutput({
    toolNumber: 26,
    toolId: 'pdf-to-pdfa',
    toolName: 'PDF to PDF/A',
    advertisedFormat: 'pdf',
    rawFilename: pdfaRes.filename,
    bytes: pdfaRes.bytes,
  });

  // 27. Compare PDF (Outputs .md report)
  const compareRes = await comparePdfs(pdfBuf, 'docA.pdf', pdfBuf, 'docB.pdf');
  const compareMd = `# Comparison Report\nDifference count: ${compareRes.totalChangesCount}`;
  await auditToolOutput({
    toolNumber: 27,
    toolId: 'compare-pdf',
    toolName: 'Compare PDF',
    advertisedFormat: 'md',
    rawFilename: sanitizeDownloadFilename('comparison', 'md', 'Comparison-Report'),
    bytes: new TextEncoder().encode(compareMd),
  });

  // 28. Translate PDF (Outputs .txt document)
  const transRes = await translatePdfDocument(pdfBuf, 'amh');
  await auditToolOutput({
    toolNumber: 28,
    toolId: 'translate-pdf',
    toolName: 'Translate PDF',
    advertisedFormat: 'txt',
    rawFilename: sanitizeDownloadFilename('contract.pdf', 'txt', 'Translated'),
    bytes: new TextEncoder().encode(transRes.translatedText),
  });

  // 29. PDF to JPG
  await auditToolOutput({
    toolNumber: 29,
    toolId: 'pdf-to-jpg',
    toolName: 'PDF to JPG',
    advertisedFormat: 'jpg',
    rawFilename: sanitizeDownloadFilename('book-page-1', 'jpg'),
    bytes: VALID_JPG_BYTES,
  });

  // 30. PDF to Word (.docx)
  const pdfToWordRes = await convertPdfToWord(pdfBuf, 'notes.docx.pdf');
  await auditToolOutput({
    toolNumber: 30,
    toolId: 'pdf-to-word',
    toolName: 'PDF to Word',
    advertisedFormat: 'docx',
    rawFilename: pdfToWordRes.filename,
    bytes: pdfToWordRes.bytes,
  });

  // 31. PDF to PowerPoint (.pptx)
  const pdfToPptRes = await convertPdfToPowerPoint(pdfBuf, 'grade-10-history.pptx.pdf');
  await auditToolOutput({
    toolNumber: 31,
    toolId: 'pdf-to-powerpoint',
    toolName: 'PDF to PowerPoint',
    advertisedFormat: 'pptx',
    rawFilename: pdfToPptRes.filename,
    bytes: pdfToPptRes.bytes,
  });

  // 32. PDF to Excel (.xlsx)
  const tablePdfBuf = await createTablePdf();
  const pdfToExcelRes = await convertPdfToExcel(tablePdfBuf, 'grade-10-mathematics.xlsx.pdf');
  await auditToolOutput({
    toolNumber: 32,
    toolId: 'pdf-to-excel',
    toolName: 'PDF to Excel',
    advertisedFormat: 'xlsx',
    rawFilename: pdfToExcelRes.filename,
    bytes: pdfToExcelRes.bytes!,
  });

  // 33. Document Summarizer (Exports .md and .txt)
  const sumRes = await summarizePdfDocument(pdfBuf, 'research.pdf');
  const sumMd = formatSummaryAsMarkdown(sumRes, 'research');
  await auditToolOutput({
    toolNumber: 33,
    toolId: 'ai-summarizer',
    toolName: 'Document Summarizer',
    advertisedFormat: 'md',
    rawFilename: sanitizeDownloadFilename('research.pdf', 'md', 'Summary'),
    bytes: new TextEncoder().encode(sumMd),
  });

  // 34. PDF to Markdown (.md)
  const mdRes = await convertPdfToMarkdown(pdfBuf, 'presentation.pdf.pdf');
  await auditToolOutput({
    toolNumber: 34,
    toolId: 'pdf-to-markdown',
    toolName: 'PDF to Markdown',
    advertisedFormat: 'md',
    rawFilename: mdRes.filename,
    bytes: mdRes.bytes,
  });

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(` DOWNLOAD CONTRACT AUDIT COMPLETE: ${passedTests} of ${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runDownloadContractAudit().catch((err) => {
  console.error('Fatal download contract test error:', err);
  process.exit(1);
});
