import { PDFDocument } from 'pdf-lib';
import { getPdfJs, getPdfJsDocumentParams } from '../pdfReader';

export interface CompressResult {
  filename: string;
  bytes: Uint8Array;
  originalBytes: Uint8Array;
  originalSize: number;
  newSize: number;
  deltaPercent: number; // positive = saved %, negative = grew %
  isLarger: boolean;
  summaryText: string;
  dualParserVerified?: boolean;
}

/**
 * Optimizes PDF streams and object dictionaries without fabricating compression statistics.
 * Accurately reports byte difference, warns if the re-serialized file is larger,
 * and performs dual-parser verification (pdf-lib + PDF.js) before reporting success.
 */
export async function performPdfCompression(
  pdfBuffer: ArrayBuffer,
  baseName: string,
  level: 'balanced' | 'strong' | 'low' = 'balanced',
  onProgress?: (percent: number, status: string) => void
): Promise<CompressResult> {
  onProgress?.(10, 'Loading original PDF bytes...');

  const originalBytes = new Uint8Array(pdfBuffer.slice(0));
  const originalSize = originalBytes.byteLength;

  // Use pdf-lib with stream reconstruction
  const doc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });

  onProgress?.(45, 'Compacting object streams and dictionary references...');

  // Stream compaction options
  const newBytes = await doc.save({
    useObjectStreams: level !== 'low',
  });
  const newSize = newBytes.byteLength;

  const byteDelta = originalSize - newSize;
  const isLarger = newSize > originalSize;
  const deltaPercent = Math.round(Math.abs((byteDelta / originalSize) * 100));

  let summaryText = '';
  if (isLarger) {
    summaryText = `Output is ${deltaPercent}% larger than the original (original document was already pre-compressed).`;
  } else if (deltaPercent === 0) {
    summaryText = 'Document is already optimal. No significant size reduction achievable.';
  } else {
    summaryText = `Saved ${deltaPercent}% (${Math.round(byteDelta / 1024)} KB reduction).`;
  }

  // STRICT DUAL-PARSER VERIFICATION:
  // Reopen with both pdf-lib and PDF.js before confirming success
  onProgress?.(80, 'Verifying compressed PDF structure with dual parsers...');
  try {
    // 1. pdf-lib verification
    const verifyDoc = await PDFDocument.load(newBytes, { ignoreEncryption: true });
    if (verifyDoc.getPageCount() === 0) {
      throw new Error('Compressed PDF contains 0 pages in pdf-lib.');
    }

    // 2. PDF.js verification
    const pdfjs = await getPdfJs();
    const loadingTask = pdfjs.getDocument(getPdfJsDocumentParams(newBytes));
    const pdfjsDoc = await loadingTask.promise;
    if (pdfjsDoc.numPages === 0) {
      throw new Error('Compressed PDF failed verification in PDF.js.');
    }
  } catch (err: any) {
    throw new Error(`Compression verification failed: Output file could not be parsed: ${err.message || err}`);
  }

  onProgress?.(100, 'Compression complete and verified!');

  return {
    filename: `${baseName} - (Compressed).pdf`,
    bytes: newBytes,
    originalBytes,
    originalSize,
    newSize,
    deltaPercent: isLarger ? -deltaPercent : deltaPercent,
    isLarger,
    summaryText,
    dualParserVerified: true,
  };
}
