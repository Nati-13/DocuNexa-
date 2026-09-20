import { convertPdfToExcel, ExcelConversionResult } from './pdfToExcel';
import { convertPdfToWord, WordConversionResult } from './pdfToWord';
import { convertPdfToPowerPoint, PowerPointConversionResult } from './pdfToPowerPoint';
import { preparePdfA, PdfAResult } from './pdfToPdfA';
import { repairPdf, RepairPdfResult } from './repairPdf';
import { performPdfOcr, OcrResult } from './ocrPdf';
import { performPdfCompression, CompressResult } from './compressPdf';
import { detectPdfFormFields, fillPdfForm, DetectFormFieldsResult } from './pdfForms';
import { convertExcelToPdf, convertWordToPdf, convertPowerPointToPdf, convertHtmlToPdf, OfficeConversionResult } from './officeToPdf';
import { summarizePdfDocument, ChunkedSummaryResult } from './aiSummarizer';
import { translatePdfDocument, TranslationResult } from './translatePdf';
import { convertPdfToMarkdown, MarkdownResult } from './pdfToMarkdown';
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
} from '../pdfEngine';

export type ToolClassification =
  | 'FULLY WORKING'
  | 'PARTIALLY WORKING'
  | 'LIMITED BY TECHNICAL CONSTRAINT'
  | 'NOT IMPLEMENTED';

export interface ToolDefinition {
  id: string;
  name: string;
  category: string;
  inputType: string[];
  outputType: string;
  classification: ToolClassification;
  limitations?: string;
  verificationMethod: string;
}

export const REGISTERED_TOOLS: Record<string, ToolDefinition> = {
  // 1. Organize PDF (7 tools)
  'pdf-unit-cutter': {
    id: 'pdf-unit-cutter',
    name: 'PDF Unit Cutter',
    category: 'organize',
    inputType: ['.pdf'],
    outputType: '.pdf / .zip / folder',
    classification: 'FULLY WORKING',
    verificationMethod: 'Automated 23-part unit detector suite & page boundary check',
  },
  'merge-pdf': {
    id: 'merge-pdf',
    name: 'Merge PDF',
    category: 'organize',
    inputType: ['.pdf'],
    outputType: '.pdf',
    classification: 'FULLY WORKING',
    verificationMethod: 'Target page count equals sum of input page counts',
  },
  'split-pdf': {
    id: 'split-pdf',
    name: 'Split PDF',
    category: 'organize',
    inputType: ['.pdf'],
    outputType: '.pdf / .zip',
    classification: 'FULLY WORKING',
    verificationMethod: 'All split chunks parse cleanly with expected page ranges',
  },
  'remove-pages': {
    id: 'remove-pages',
    name: 'Remove Pages',
    category: 'organize',
    inputType: ['.pdf'],
    outputType: '.pdf',
    classification: 'FULLY WORKING',
    verificationMethod: 'Output page count equals total minus removed count',
  },
  'extract-pages': {
    id: 'extract-pages',
    name: 'Extract Pages',
    category: 'organize',
    inputType: ['.pdf'],
    outputType: '.pdf',
    classification: 'FULLY WORKING',
    verificationMethod: 'Output page count equals selected page count',
  },
  'organize-pdf': {
    id: 'organize-pdf',
    name: 'Organize PDF',
    category: 'organize',
    inputType: ['.pdf'],
    outputType: '.pdf',
    classification: 'FULLY WORKING',
    verificationMethod: 'Thumbnail reorder, page rotation, and deletion verified',
  },
  'scan-to-pdf': {
    id: 'scan-to-pdf',
    name: 'Scan to PDF',
    category: 'organize',
    inputType: ['image/*', '.pdf'],
    outputType: '.pdf',
    classification: 'FULLY WORKING',
    verificationMethod: 'Camera canvas snapshot compiled to high-res PDF page',
  },

  // 2. Optimize PDF (3 tools)
  'compress-pdf': {
    id: 'compress-pdf',
    name: 'Compress PDF',
    category: 'optimize',
    inputType: ['.pdf'],
    outputType: '.pdf',
    classification: 'FULLY WORKING',
    limitations: 'Pre-compressed documents may not shrink further; actual delta reported without fabrication.',
    verificationMethod: 'Byte size comparison and parseable PDF output check',
  },
  'repair-pdf': {
    id: 'repair-pdf',
    name: 'Repair PDF',
    category: 'optimize',
    inputType: ['.pdf'],
    outputType: '.pdf',
    classification: 'LIMITED BY TECHNICAL CONSTRAINT',
    limitations: 'Severely corrupted documents missing internal page streams cannot be arbitrarily reconstructed.',
    verificationMethod: 'Diagnostic report across 4 states: Healthy, Repaired, Partially Recovered, Unrecoverable',
  },
  'ocr-pdf': {
    id: 'ocr-pdf',
    name: 'OCR PDF',
    category: 'optimize',
    inputType: ['.pdf', '.jpg', '.png'],
    outputType: '.pdf',
    classification: 'FULLY WORKING',
    limitations: 'WebAssembly OCR speed depends on client CPU and document resolution.',
    verificationMethod: 'Re-opens output with PDF.js and asserts extractable text characters exist',
  },

  // 3. Convert to PDF (5 tools)
  'jpg-to-pdf': {
    id: 'jpg-to-pdf',
    name: 'JPG to PDF',
    category: 'convert-to',
    inputType: ['.jpg', '.jpeg', '.png', '.webp', '.bmp'],
    outputType: '.pdf',
    classification: 'FULLY WORKING',
    verificationMethod: 'Verifies embedded JPEG dimensions and valid PDF stream',
  },
  'word-to-pdf': {
    id: 'word-to-pdf',
    name: 'Word to PDF',
    category: 'convert-to',
    inputType: ['.docx'],
    outputType: '.pdf',
    classification: 'LIMITED BY TECHNICAL CONSTRAINT',
    limitations: 'Content reconstruction from .docx. Exact Microsoft Word typography and layout may vary.',
    verificationMethod: 'Text extraction from docx and PDF layout pagination check',
  },
  'powerpoint-to-pdf': {
    id: 'powerpoint-to-pdf',
    name: 'PowerPoint to PDF',
    category: 'convert-to',
    inputType: ['.pptx'],
    outputType: '.pdf',
    classification: 'LIMITED BY TECHNICAL CONSTRAINT',
    limitations: 'Slide reconstruction from .pptx XML shapes. Complex animations or 3D elements not supported.',
    verificationMethod: 'Verifies slide count and generated landscape pages',
  },
  'excel-to-pdf': {
    id: 'excel-to-pdf',
    name: 'Excel to PDF',
    category: 'convert-to',
    inputType: ['.xlsx', '.xls', '.csv'],
    outputType: '.pdf',
    classification: 'LIMITED BY TECHNICAL CONSTRAINT',
    limitations: 'Grid reconstruction from spreadsheet data. Pivot tables and macros not executed.',
    verificationMethod: 'Spreadsheet cell reading and paginated table drawing check',
  },
  'html-to-pdf': {
    id: 'html-to-pdf',
    name: 'HTML to PDF',
    category: 'convert-to',
    inputType: ['.html', '.htm'],
    outputType: '.pdf',
    classification: 'LIMITED BY TECHNICAL CONSTRAINT',
    limitations: 'HTML markup text reconstruction. External CSS or JavaScript execution not guaranteed.',
    verificationMethod: 'HTML tag stripping and readable page pagination check',
  },

  // 4. Convert from PDF (5 tools)
  'pdf-to-jpg': {
    id: 'pdf-to-jpg',
    name: 'PDF to JPG',
    category: 'convert-from',
    inputType: ['.pdf'],
    outputType: '.jpg / .zip',
    classification: 'FULLY WORKING',
    verificationMethod: 'Canvas JPEG rasterization for each page verified',
  },
  'pdf-to-word': {
    id: 'pdf-to-word',
    name: 'PDF to Word',
    category: 'convert-from',
    inputType: ['.pdf'],
    outputType: '.docx',
    classification: 'PARTIALLY WORKING',
    limitations: 'Generates genuine Open XML (.docx) with headings and paragraphs. Exact visual styling may require manual adjustment.',
    verificationMethod: 'Verifies PK ZIP header and presence of word/document.xml in package',
  },
  'pdf-to-powerpoint': {
    id: 'pdf-to-powerpoint',
    name: 'PDF to PowerPoint',
    category: 'convert-from',
    inputType: ['.pdf'],
    outputType: '.pptx',
    classification: 'PARTIALLY WORKING',
    limitations: 'Prioritizes high-res slide visual fidelity; individual page elements may have limited text editability.',
    verificationMethod: 'Verifies PK ZIP header and presence of ppt/presentation.xml in package',
  },
  'pdf-to-excel': {
    id: 'pdf-to-excel',
    name: 'PDF to Excel',
    category: 'convert-from',
    inputType: ['.pdf'],
    outputType: '.xlsx',
    classification: 'PARTIALLY WORKING',
    limitations: 'Infers rows and columns from text coordinates. Merged or borderless complex tables may require manual adjustment.',
    verificationMethod: 'Re-reads workbook with SheetJS: asserts sheet count >= 1 and cell count > 0',
  },
  'pdf-to-pdfa': {
    id: 'pdf-to-pdfa',
    name: 'PDF to PDF/A',
    category: 'convert-from',
    inputType: ['.pdf'],
    outputType: '.pdf',
    classification: 'LIMITED BY TECHNICAL CONSTRAINT',
    limitations: 'PDF/A metadata preparation — experimental. Injects ISO 19005-1 (PDF/A-1b) metadata markers. Formal compliance certification requires specialized pre-press validation not guaranteed in the browser.',
    verificationMethod: 'Verifies XMP metadata packet and catalog registration',
  },

  // 5. Edit PDF (6 tools)
  'rotate-pdf': {
    id: 'rotate-pdf',
    name: 'Rotate PDF',
    category: 'edit',
    inputType: ['.pdf'],
    outputType: '.pdf',
    classification: 'FULLY WORKING',
    verificationMethod: 'Verifies page rotation angle metadata updated by specified degrees',
  },
  'add-page-numbers': {
    id: 'add-page-numbers',
    name: 'Add Page Numbers',
    category: 'edit',
    inputType: ['.pdf'],
    outputType: '.pdf',
    classification: 'FULLY WORKING',
    verificationMethod: 'Embeds pagination text at specified coordinates on each page',
  },
  'add-watermark': {
    id: 'add-watermark',
    name: 'Add Watermark',
    category: 'edit',
    inputType: ['.pdf'],
    outputType: '.pdf',
    classification: 'FULLY WORKING',
    verificationMethod: 'Embeds vector text stamp with specified opacity and rotation',
  },
  'crop-pdf': {
    id: 'crop-pdf',
    name: 'Crop PDF',
    category: 'edit',
    inputType: ['.pdf'],
    outputType: '.pdf',
    classification: 'FULLY WORKING',
    verificationMethod: 'Lossless page.setCropBox dimension validation',
  },
  'edit-pdf': {
    id: 'edit-pdf',
    name: 'Edit PDF',
    category: 'edit',
    inputType: ['.pdf'],
    outputType: '.pdf',
    classification: 'FULLY WORKING',
    verificationMethod: 'Canvas drawing, text annotations, and highlights embedded into PDF',
  },
  'pdf-forms': {
    id: 'pdf-forms',
    name: 'PDF Forms',
    category: 'edit',
    inputType: ['.pdf'],
    outputType: '.pdf',
    classification: 'FULLY WORKING',
    limitations: 'Requires interactive AcroForm fields. Static scanned documents cannot be converted into interactive forms automatically.',
    verificationMethod: 'pdf-lib getForm() detection and field update verification',
  },

  // 6. PDF Security (5 tools)
  'protect-pdf': {
    id: 'protect-pdf',
    name: 'Protect PDF',
    category: 'security',
    inputType: ['.pdf'],
    outputType: '.pdf',
    classification: 'FULLY WORKING',
    verificationMethod: 'AES-256 standard encryption; verified that unauthenticated loads strictly fail',
  },
  'unlock-pdf': {
    id: 'unlock-pdf',
    name: 'Unlock PDF',
    category: 'security',
    inputType: ['.pdf'],
    outputType: '.pdf',
    classification: 'FULLY WORKING',
    verificationMethod: 'AES-256 decryption; verifies decrypted file opens cleanly without password',
  },
  'sign-pdf': {
    id: 'sign-pdf',
    name: 'Sign PDF',
    category: 'security',
    inputType: ['.pdf'],
    outputType: '.pdf',
    classification: 'FULLY WORKING',
    verificationMethod: 'Signature canvas PNG embedded directly into PDF page',
  },
  'redact-pdf': {
    id: 'redact-pdf',
    name: 'Redact PDF',
    category: 'security',
    inputType: ['.pdf'],
    outputType: '.pdf',
    classification: 'LIMITED BY TECHNICAL CONSTRAINT',
    limitations: 'LIMITED / PARTIAL (Visual Blackout Only): Opaque vector rectangles are drawn over sensitive areas. Low-level binary stream text sanitization is not guaranteed in client-side canvas mode.',
    verificationMethod: 'Applies opaque blackout boxes over specified coordinates',
  },
  'compare-pdf': {
    id: 'compare-pdf',
    name: 'Compare PDF',
    category: 'security',
    inputType: ['.pdf'],
    outputType: 'report / .md',
    classification: 'FULLY WORKING',
    verificationMethod: 'Dual-PDF text and page count difference auditor',
  },

  // 7. PDF Intelligence (3 tools)
  'ai-summarizer': {
    id: 'ai-summarizer',
    name: 'Document Summarizer',
    category: 'intelligence',
    inputType: ['.pdf'],
    outputType: 'summary / .md',
    classification: 'PARTIALLY WORKING',
    limitations: 'Local Document Summarizer (Rule-Based & Heuristic Extraction). Does not connect to external AI API unless explicitly configured.',
    verificationMethod: 'Progressive 10-page chunking with live progress reporting',
  },
  'translate-pdf': {
    id: 'translate-pdf',
    name: 'Translate PDF',
    category: 'intelligence',
    inputType: ['.pdf'],
    outputType: 'text / .txt',
    classification: 'PARTIALLY WORKING',
    limitations: 'Basic Local Translation (Glossary & Phrase Transformation). Requires text-based PDF; scanned PDFs require OCR first.',
    verificationMethod: 'Extracts text pages, checks for scanned status, applies language transformation',
  },
  'pdf-to-markdown': {
    id: 'pdf-to-markdown',
    name: 'PDF to Markdown',
    category: 'intelligence',
    inputType: ['.pdf'],
    outputType: '.md',
    classification: 'FULLY WORKING',
    verificationMethod: 'Generates structured Markdown with headings, lists, and word count',
  },
};

export function getToolDefinition(id: string): ToolDefinition | undefined {
  return REGISTERED_TOOLS[id];
}

export function getTotalRegisteredToolsCount(): number {
  return Object.keys(REGISTERED_TOOLS).length;
}
