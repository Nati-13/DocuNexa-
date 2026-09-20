/**
 * DocuNexa Shared PDF Input Normalizer
 *
 * Provides a unified, robust normalization pipeline for browser File, Blob,
 * ArrayBuffer, and Uint8Array inputs across all PDF processing tools.
 *
 * Guarantees:
 * 1. Pristine non-detached ArrayBuffers (immune to Web Worker transfers).
 * 2. Strict validation of non-zero file sizes and binary signatures.
 * 3. Automatic detection and safe alignment of '%PDF-' headers (e.g. stripping UTF-8 BOMs/whitespace).
 * 4. Transparent, honest error reporting when invalid binary input is supplied.
 */

export interface NormalizedPdf {
  arrayBuffer: ArrayBuffer;
  uint8Array: Uint8Array;
  size: number;
  pdfVersion?: string;
  hasPdfHeader: boolean;
  headerOffset: number;
}

export interface NormalizePdfOptions {
  /**
   * If true (default), asserts that '%PDF-' exists within the first 1024 bytes.
   * Set to false for tools that accept arbitrary image/office inputs (e.g. Scan to PDF, Office to PDF).
   */
  requirePdfHeader?: boolean;
  /**
   * Optional tool name for human-readable error descriptions.
   */
  toolName?: string;
}

/**
 * Normalizes any binary input (File, Blob, ArrayBuffer, Uint8Array) into a guaranteed
 * fresh, non-detached ArrayBuffer and Uint8Array aligned with PDF specifications.
 */
export async function normalizePdfInput(
  input: File | Blob | ArrayBuffer | Uint8Array | null | undefined,
  options: NormalizePdfOptions = {}
): Promise<NormalizedPdf> {
  const { requirePdfHeader = true, toolName } = options;
  const toolPrefix = toolName ? `[${toolName}] ` : '';

  if (!input) {
    throw new Error(`${toolPrefix}No document input was provided.`);
  }

  // Guard against accidental passing of string / URLs
  if (typeof input === 'string') {
    throw new Error(
      `${toolPrefix}Unexpected input type: received string URL/filename instead of document binary.`
    );
  }

  let rawBytes: Uint8Array;

  if (typeof File !== 'undefined' && input instanceof File) {
    if (input.size === 0) {
      throw new Error(`${toolPrefix}The selected file "${input.name}" is empty (0 bytes).`);
    }
    const ab = await input.arrayBuffer();
    rawBytes = new Uint8Array(ab);
  } else if (typeof Blob !== 'undefined' && input instanceof Blob) {
    if (input.size === 0) {
      throw new Error(`${toolPrefix}The provided document Blob is empty (0 bytes).`);
    }
    const ab = await input.arrayBuffer();
    rawBytes = new Uint8Array(ab);
  } else if (typeof (input as any)?.arrayBuffer === 'function') {
    if ((input as any).size === 0) {
      throw new Error(`${toolPrefix}The provided document is empty (0 bytes).`);
    }
    const ab = await (input as any).arrayBuffer();
    rawBytes = new Uint8Array(ab);
  } else if (input instanceof Uint8Array) {
    if (input.byteLength === 0) {
      throw new Error(`${toolPrefix}Document byte array is empty or detached (0 bytes).`);
    }
    // Deep clone to ensure memory is isolated from caller
    rawBytes = new Uint8Array(input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength));
  } else if (input instanceof ArrayBuffer) {
    if (input.byteLength === 0) {
      throw new Error(`${toolPrefix}Document ArrayBuffer is empty or detached (0 bytes).`);
    }
    rawBytes = new Uint8Array(input.slice(0));
  } else {
    throw new Error(`${toolPrefix}Unsupported input type. Expected File, Blob, ArrayBuffer, or Uint8Array.`);
  }

  if (rawBytes.byteLength === 0) {
    throw new Error(`${toolPrefix}Document binary size is 0 bytes.`);
  }

  // Scan for PDF Magic Header (%PDF-) within the first 1024 bytes
  let headerOffset = -1;
  const searchLimit = Math.min(rawBytes.byteLength - 4, 1024);

  for (let i = 0; i < searchLimit; i++) {
    if (
      rawBytes[i] === 0x25 && // %
      rawBytes[i + 1] === 0x50 && // P
      rawBytes[i + 2] === 0x44 && // D
      rawBytes[i + 3] === 0x46 && // F
      rawBytes[i + 4] === 0x2d    // -
    ) {
      headerOffset = i;
      break;
    }
  }

  const hasPdfHeader = headerOffset !== -1;

  if (requirePdfHeader && !hasPdfHeader) {
    // Detect common wrong file types to provide helpful error
    const first4 = String.fromCharCode(...rawBytes.slice(0, 4));
    let hint = '';
    if (first4.startsWith('PK')) {
      hint = ' (Detected ZIP or Office OpenXML document)';
    } else if (first4.startsWith('\x89PNG') || first4.startsWith('\xFF\xD8')) {
      hint = ' (Detected image file)';
    } else if (first4.startsWith('<!DO') || first4.startsWith('<htm')) {
      hint = ' (Detected HTML markup)';
    }

    throw new Error(
      `${toolPrefix}Invalid PDF document: File does not contain a valid PDF header (%PDF-)${hint}. Please upload a genuine PDF file.`
    );
  }

  // Extract PDF version if header was detected
  let pdfVersion: string | undefined;
  if (hasPdfHeader) {
    const versionBytes = rawBytes.slice(headerOffset, headerOffset + 8);
    const vStr = String.fromCharCode(...versionBytes);
    const match = vStr.match(/%PDF-(\d+\.\d+)/);
    if (match) {
      pdfVersion = match[1];
    }
  }

  // If there are leading BOM / preamble bytes before %PDF-, slice so the buffer starts directly at %PDF-
  let alignedBytes: Uint8Array;
  if (headerOffset > 0) {
    alignedBytes = rawBytes.slice(headerOffset);
  } else {
    alignedBytes = rawBytes;
  }

  const safeArrayBuffer = alignedBytes.buffer.slice(
    alignedBytes.byteOffset,
    alignedBytes.byteOffset + alignedBytes.byteLength
  ) as ArrayBuffer;

  return {
    arrayBuffer: safeArrayBuffer,
    uint8Array: alignedBytes,
    size: alignedBytes.byteLength,
    pdfVersion,
    hasPdfHeader,
    headerOffset: Math.max(0, headerOffset),
  };
}
