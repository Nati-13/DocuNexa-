import { PDFDocument } from 'pdf-lib';

export interface CompressResult {
  filename: string;
  bytes: Uint8Array;
  originalBytes: Uint8Array;
  originalSize: number;
  newSize: number;
  deltaPercent: number; // positive = saved %, negative = grew %
  isLarger: boolean;
  summaryText: string;
}

/**
 * Optimizes PDF streams and object dictionaries without fabricating compression statistics.
 * Accurately reports byte difference and warns if the re-serialized file is larger.
 */
export async function performPdfCompression(
  pdfBuffer: ArrayBuffer,
  baseName: string,
  level: 'balanced' | 'strong' | 'low' = 'balanced'
): Promise<CompressResult> {
  const originalBytes = new Uint8Array(pdfBuffer.slice(0));
  const originalSize = originalBytes.byteLength;

  // Use pdf-lib with stream reconstruction
  const doc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });

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

  return {
    filename: `${baseName} - (Compressed).pdf`,
    bytes: newBytes,
    originalBytes,
    originalSize,
    newSize,
    deltaPercent: isLarger ? -deltaPercent : deltaPercent,
    isLarger,
    summaryText,
  };
}
