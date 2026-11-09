/**
 * DocuNexa — Sequential Batch Review Processor for PDF Unit Cutter
 * Evaluates real textbook PDFs sequentially entirely on the client-side.
 * Extracts structure, detects units, generates physical unit PDFs, creates ZIP bundles,
 * and physically validates all generated PDF files using PDFDocument.load().
 */

import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { extractPdfTextPages } from './pdfReader';
import { detectDocumentUnits, UnitDetectionResult } from './detector';
import { extractPdfRange, createZipBundle } from './cutter';
import { computePdfFingerprint, FeedbackRecord, DETECTOR_VERSION } from './feedbackDb';
import { DetectedPart } from '@/types';

export interface UnitSliceVerification {
  filename: string;
  bytes: Uint8Array;
  requestedStart: number;
  requestedEnd: number;
  expectedCount: number;
  physicalCount: number;
  isValid: boolean;
  error?: string;
}

export interface BatchItemResult {
  id: string;
  filename: string;
  fileSize: number;
  fingerprint: string;
  pageCount: number;
  language: string;
  detection: UnitDetectionResult;
  evidence: string[];
  parts: DetectedPart[];
  unitSlices: UnitSliceVerification[];
  zipBlob: Blob | null;
  zipValid: boolean;
  zipEntryCount: number;
  status: 'pending_review' | 'correct' | 'incorrect' | 'error';
  errorMessage?: string;
  feedbackRecord?: FeedbackRecord;
}

/**
 * Detects predominant language from page text samples
 */
export function detectLanguageFromPages(pages: Array<{ lines: string[] }>): string {
  let sampleText = '';
  for (const p of pages.slice(0, 15)) {
    sampleText += p.lines.join(' ') + ' ';
    if (sampleText.length > 3000) break;
  }

  // Ethiopic
  if (/[\u1200-\u137F]/.test(sampleText)) return 'am';
  // Arabic
  if (/[\u0600-\u06FF]/.test(sampleText)) return 'ar';
  // Devanagari (Hindi)
  if (/[\u0900-\u097F]/.test(sampleText)) return 'hi';
  // Chinese
  if (/[\u4E00-\u9FFF]/.test(sampleText)) return 'zh';
  // French keywords
  if (/\b(chapitre|unité|leçon|sommaire|exercices)\b/i.test(sampleText)) return 'fr';
  // Spanish keywords
  if (/\b(capítulo|unidad|índice|ejercicios)\b/i.test(sampleText)) return 'es';

  return 'en';
}

/**
 * Validates a ZIP bundle by reading its entries and opening each PDF with PDFDocument.load()
 */
export async function validateZipBundle(zipBlob: Blob): Promise<{ isValid: boolean; entryCount: number; error?: string }> {
  try {
    const arrayBuffer = await zipBlob.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const entries = Object.keys(zip.files).filter((name) => !zip.files[name].dir);

    if (entries.length === 0) {
      return { isValid: false, entryCount: 0, error: 'ZIP archive contains zero files' };
    }

    for (const entryName of entries) {
      const file = zip.files[entryName];
      const bytes = await file.async('uint8array');
      if (!bytes || bytes.length === 0) {
        return { isValid: false, entryCount: entries.length, error: `ZIP entry "${entryName}" is empty` };
      }

      // Strict physical validation: verify the PDF inside the zip parses and has at least 1 page
      const loadedDoc = await PDFDocument.load(bytes);
      if (loadedDoc.getPageCount() < 1) {
        return { isValid: false, entryCount: entries.length, error: `ZIP entry "${entryName}" contains 0 pages` };
      }
    }

    return { isValid: true, entryCount: entries.length };
  } catch (err: any) {
    return { isValid: false, entryCount: 0, error: `ZIP validation failed: ${err.message}` };
  }
}

/**
 * Processes a single PDF file sequentially for review mode.
 * Completely client-side, zero server network traffic.
 */
export async function processPdfForReview(
  file: File | { name: string; size: number; arrayBuffer: () => Promise<ArrayBuffer | ArrayBufferLike> },
  onStep?: (msg: string) => void
): Promise<BatchItemResult> {
  const filename = file.name;
  const fileSize = file.size;

  onStep?.(`Reading "${filename}"...`);
  const rawBuffer = await file.arrayBuffer();
  const buffer: ArrayBuffer =
    rawBuffer instanceof ArrayBuffer
      ? rawBuffer
      : (new Uint8Array(rawBuffer).buffer as unknown as ArrayBuffer);

  onStep?.(`Extracting text & table of contents...`);
  const { pages, totalPages, outlines } = await extractPdfTextPages(buffer);

  const fingerprint = await computePdfFingerprint(buffer, filename, totalPages);
  const language = detectLanguageFromPages(pages);

  onStep?.(`Detecting units & chapters...`);
  const detection = detectDocumentUnits(pages, totalPages, filename, outlines);

  // Collect evidence
  const evidence: string[] = [];
  if (outlines && outlines.length > 0) {
    evidence.push(`PDF Bookmarks: ${outlines.length} outline sections found`);
  }
  for (const part of detection.parts) {
    evidence.push(`Detected: "${part.title}" -> physical pages ${part.startPage}–${part.endPage}`);
  }
  if (detection.hasFrontMatter && detection.frontMatterRange) {
    evidence.push(`Front matter detected: pages ${detection.frontMatterRange.start}–${detection.frontMatterRange.end}`);
  }

  // Generate and physically verify each unit PDF slice
  onStep?.(`Slicing and verifying ${detection.parts.length} unit PDFs...`);
  const unitSlices: UnitSliceVerification[] = [];
  const zipItems: Array<{ filename: string; bytes: Uint8Array }> = [];

  for (const part of detection.parts) {
    try {
      const bytes = await extractPdfRange(buffer, part.startPage, part.endPage);
      const expectedCount = part.endPage - part.startPage + 1;

      // Physical verification with PDFDocument.load()
      const reopenedDoc = await PDFDocument.load(bytes);
      const physicalCount = reopenedDoc.getPageCount();

      const isValid = physicalCount === expectedCount;
      unitSlices.push({
        filename: part.filename,
        bytes,
        requestedStart: part.startPage,
        requestedEnd: part.endPage,
        expectedCount,
        physicalCount,
        isValid,
        error: isValid ? undefined : `Physical count mismatch: got ${physicalCount}, expected ${expectedCount}`,
      });

      zipItems.push({ filename: part.filename, bytes });
    } catch (sliceErr: any) {
      unitSlices.push({
        filename: part.filename,
        bytes: new Uint8Array(),
        requestedStart: part.startPage,
        requestedEnd: part.endPage,
        expectedCount: part.endPage - part.startPage + 1,
        physicalCount: 0,
        isValid: false,
        error: sliceErr.message,
      });
    }
  }

  // Create and validate ZIP archive
  onStep?.(`Creating and validating ZIP bundle...`);
  let zipBlob: Blob | null = null;
  let zipValid = false;
  let zipEntryCount = 0;

  if (zipItems.length > 0) {
    zipBlob = await createZipBundle(zipItems);
    const zipCheck = await validateZipBundle(zipBlob);
    zipValid = zipCheck.isValid;
    zipEntryCount = zipCheck.entryCount;
  }

  return {
    id: fingerprint,
    filename,
    fileSize,
    fingerprint,
    pageCount: totalPages,
    language,
    detection,
    evidence,
    parts: detection.parts,
    unitSlices,
    zipBlob,
    zipValid,
    zipEntryCount,
    status: 'pending_review',
  };
}
