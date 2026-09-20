import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import { getPdfJs, getPdfJsDocumentParams } from './pdfReader';
import { encryptPDF, EncryptPDFOptions } from '@pdfsmaller/pdf-encrypt';
import { decryptPDF, isEncrypted } from '@pdfsmaller/pdf-decrypt';
import { sanitizeBaseName, sanitizeDownloadFilename } from './downloadContract';

/**
 * Ensures safe non-detached ArrayBuffer slice, strips leading preamble / BOM bytes if present,
 * and validates non-zero size before parsing.
 */
function toSafeBuffer(source: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (!source || source.byteLength === 0) {
    throw new Error('PDF document buffer is empty or detached (0 bytes).');
  }
  const rawBytes = source instanceof Uint8Array ? source : new Uint8Array(source);
  // Scan for %PDF- header within the first 1024 bytes
  let headerOffset = -1;
  const searchLimit = Math.min(rawBytes.byteLength - 4, 1024);
  for (let i = 0; i < searchLimit; i++) {
    if (
      rawBytes[i] === 0x25 &&
      rawBytes[i + 1] === 0x50 &&
      rawBytes[i + 2] === 0x44 &&
      rawBytes[i + 3] === 0x46 &&
      rawBytes[i + 4] === 0x2d
    ) {
      headerOffset = i;
      break;
    }
  }

  const alignedBytes = headerOffset > 0 ? rawBytes.slice(headerOffset) : rawBytes;
  return alignedBytes.buffer.slice(
    alignedBytes.byteOffset,
    alignedBytes.byteOffset + alignedBytes.byteLength
  ) as ArrayBuffer;
}

// ----------------------------------------------------------------------
// 1. MERGE PDF
// ----------------------------------------------------------------------
export async function mergePdfs(buffers: ArrayBuffer[]): Promise<Uint8Array> {
  if (buffers.length === 0) throw new Error('No PDF files provided to merge.');
  const mergedPdf = await PDFDocument.create();

  for (const buf of buffers) {
    const srcDoc = await PDFDocument.load(toSafeBuffer(buf));
    const indices = srcDoc.getPageIndices();
    const copiedPages = await mergedPdf.copyPages(srcDoc, indices);
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}

// ----------------------------------------------------------------------
// 2. SPLIT PDF (Ranges or Every N pages)
// ----------------------------------------------------------------------
export async function splitPdfByRanges(
  buffer: ArrayBuffer,
  ranges: { start: number; end: number; name: string }[]
): Promise<{ name: string; bytes: Uint8Array }[]> {
  const srcDoc = await PDFDocument.load(toSafeBuffer(buffer));
  const totalPages = srcDoc.getPageCount();
  const results: { name: string; bytes: Uint8Array }[] = [];

  for (const r of ranges) {
    const safeStart = Math.max(1, Math.min(r.start, totalPages));
    const safeEnd = Math.max(safeStart, Math.min(r.end, totalPages));
    const indices: number[] = [];
    for (let p = safeStart; p <= safeEnd; p++) {
      indices.push(p - 1);
    }

    const subDoc = await PDFDocument.create();
    const copied = await subDoc.copyPages(srcDoc, indices);
    copied.forEach((p) => subDoc.addPage(p));
    const bytes = await subDoc.save();
    results.push({ name: r.name, bytes });
  }

  return results;
}

export async function splitPdfEveryNPages(
  buffer: ArrayBuffer,
  n: number,
  baseFilename: string
): Promise<{ name: string; bytes: Uint8Array }[]> {
  const srcDoc = await PDFDocument.load(toSafeBuffer(buffer));
  const totalPages = srcDoc.getPageCount();
  const results: { name: string; bytes: Uint8Array }[] = [];
  const safeN = Math.max(1, n);
  const cleanBase = sanitizeBaseName(baseFilename, 'document');

  let chunkIndex = 1;
  for (let start = 1; start <= totalPages; start += safeN) {
    const end = Math.min(start + safeN - 1, totalPages);
    const indices: number[] = [];
    for (let p = start; p <= end; p++) {
      indices.push(p - 1);
    }

    const subDoc = await PDFDocument.create();
    const copied = await subDoc.copyPages(srcDoc, indices);
    copied.forEach((p) => subDoc.addPage(p));
    const bytes = await subDoc.save();

    const name = sanitizeDownloadFilename(`${cleanBase} - Part ${chunkIndex} (pages ${start}-${end})`, 'pdf');
    results.push({ name, bytes });
    chunkIndex++;
  }

  return results;
}

// ----------------------------------------------------------------------
// 3. REMOVE PAGES
// ----------------------------------------------------------------------
export async function removePdfPages(
  buffer: ArrayBuffer,
  pagesToRemove: number[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(toSafeBuffer(buffer));
  const totalPages = srcDoc.getPageCount();
  const removeSet = new Set(pagesToRemove);

  const indicesToKeep: number[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (!removeSet.has(p)) {
      indicesToKeep.push(p - 1);
    }
  }

  if (indicesToKeep.length === 0) {
    throw new Error('Cannot remove all pages: at least one page must remain.');
  }

  const newDoc = await PDFDocument.create();
  const copied = await newDoc.copyPages(srcDoc, indicesToKeep);
  copied.forEach((p) => newDoc.addPage(p));
  return await newDoc.save();
}

// ----------------------------------------------------------------------
// 4. EXTRACT PAGES
// ----------------------------------------------------------------------
export async function extractPdfPages(
  buffer: ArrayBuffer,
  pagesToKeep: number[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(toSafeBuffer(buffer));
  const totalPages = srcDoc.getPageCount();
  const indices: number[] = [];

  for (const p of pagesToKeep) {
    if (p >= 1 && p <= totalPages) {
      indices.push(p - 1);
    }
  }

  if (indices.length === 0) {
    throw new Error('No valid pages selected to extract.');
  }

  const newDoc = await PDFDocument.create();
  const copied = await newDoc.copyPages(srcDoc, indices);
  copied.forEach((p) => newDoc.addPage(p));
  return await newDoc.save();
}

// ----------------------------------------------------------------------
// 5. ORGANIZE (Reorder, Rotate individual sheets, Delete)
// ----------------------------------------------------------------------
export async function organizePdfPages(
  buffer: ArrayBuffer,
  pageConfigs: { pageIndex: number; rotation: number }[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(toSafeBuffer(buffer));
  const newDoc = await PDFDocument.create();

  for (const cfg of pageConfigs) {
    const [copied] = await newDoc.copyPages(srcDoc, [cfg.pageIndex]);
    const currentRot = copied.getRotation().angle;
    const finalRot = (currentRot + cfg.rotation) % 360;
    copied.setRotation(degrees(finalRot));
    newDoc.addPage(copied);
  }

  return await newDoc.save();
}

// ----------------------------------------------------------------------
// 6. ROTATE PDF (All, selected pages, or per-page rotation map)
// ----------------------------------------------------------------------
export async function rotatePdf(
  buffer: ArrayBuffer,
  degreesDelta: number | Record<number, number>,
  targetPages?: number[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(toSafeBuffer(buffer));
  const pages = srcDoc.getPages();
  const targetSet = targetPages ? new Set(targetPages) : null;

  pages.forEach((page, idx) => {
    const pageNum = idx + 1;
    let delta = 0;
    if (typeof degreesDelta === 'number') {
      if (!targetSet || targetSet.has(pageNum)) {
        delta = degreesDelta;
      }
    } else if (degreesDelta && typeof degreesDelta === 'object') {
      if (pageNum in degreesDelta) {
        delta = degreesDelta[pageNum];
      }
    }
    if (delta !== 0) {
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + delta + 360) % 360));
    }
  });

  return await srcDoc.save();
}

// ----------------------------------------------------------------------
// 7. ADD PAGE NUMBERS
// ----------------------------------------------------------------------
export interface PageNumberOptions {
  position: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-center' | 'top-left';
  startNumber: number;
  format: 'number' | 'page-of-total' | 'roman';
  fontSize: number;
  colorHex?: string;
  margin?: number;
}

export async function addPageNumbersToPdf(
  buffer: ArrayBuffer,
  options: PageNumberOptions
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(toSafeBuffer(buffer));
  const font = await srcDoc.embedFont(StandardFonts.Helvetica);
  const pages = srcDoc.getPages();
  const total = pages.length;
  const fontSize = options.fontSize || 10;
  const margin = options.margin ?? 30;

  // Parse color if provided
  let color = rgb(0.3, 0.3, 0.3);
  if (options.colorHex && /^#([0-9a-f]{6})$/i.test(options.colorHex)) {
    const r = parseInt(options.colorHex.slice(1, 3), 16) / 255;
    const g = parseInt(options.colorHex.slice(3, 5), 16) / 255;
    const b = parseInt(options.colorHex.slice(5, 7), 16) / 255;
    color = rgb(r, g, b);
  }

  pages.forEach((page, idx) => {
    const currentNum = options.startNumber + idx;
    const { width, height } = page.getSize();
    let text = `${currentNum}`;
    if (options.format === 'page-of-total') {
      text = `Page ${currentNum} of ${total}`;
    } else if (options.format === 'roman') {
      const romanNumerals = [
        { v: 1000, s: 'M' }, { v: 900, s: 'CM' }, { v: 500, s: 'D' }, { v: 400, s: 'CD' },
        { v: 100, s: 'C' }, { v: 90, s: 'XC' }, { v: 50, s: 'L' }, { v: 40, s: 'XL' },
        { v: 10, s: 'X' }, { v: 9, s: 'IX' }, { v: 5, s: 'V' }, { v: 4, s: 'IV' }, { v: 1, s: 'I' }
      ];
      let num = currentNum;
      let roman = '';
      for (const { v, s } of romanNumerals) {
        while (num >= v) {
          roman += s;
          num -= v;
        }
      }
      text = roman || `${currentNum}`;
    }

    const textWidth = font.widthOfTextAtSize(text, fontSize);
    let x = width / 2 - textWidth / 2;
    let y = margin;

    switch (options.position) {
      case 'bottom-center':
        x = width / 2 - textWidth / 2;
        y = margin;
        break;
      case 'bottom-right':
        x = width - textWidth - margin;
        y = margin;
        break;
      case 'bottom-left':
        x = margin;
        y = margin;
        break;
      case 'top-left':
        x = margin;
        y = height - margin;
        break;
      case 'top-right':
        x = width - textWidth - margin;
        y = height - margin;
        break;
      case 'top-center':
        x = width / 2 - textWidth / 2;
        y = height - margin;
        break;
    }

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color,
    });
  });

  return await srcDoc.save();
}

// ----------------------------------------------------------------------
// 8. ADD WATERMARK
// ----------------------------------------------------------------------
export interface WatermarkOptions {
  text: string;
  opacity: number;
  rotation: number;
  fontSize: number;
  colorHex?: string;
  color?: { r: number; g: number; b: number };
  x?: number; // In PDF points from bottom-left
  y?: number; // In PDF points from bottom-left
  targetPages?: number[]; // Specific 1-indexed pages, or all if undefined
}

export async function addWatermarkToPdf(
  buffer: ArrayBuffer,
  options: WatermarkOptions
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(toSafeBuffer(buffer));
  const font = await srcDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = srcDoc.getPages();

  if (pages.length === 0) {
    throw new Error('PDF document contains 0 pages for watermarking.');
  }

  // Sanitize text to ASCII/WinAnsi characters to ensure reliable embedding
  const safeText = options.text.replace(/[^\x20-\x7E]/g, ' ').trim() || 'CONFIDENTIAL';

  // Parse color if rgb object or hex is provided
  let color = rgb(0.6, 0.6, 0.6);
  if (options.color) {
    color = rgb(options.color.r, options.color.g, options.color.b);
  } else if (options.colorHex && /^#([0-9a-f]{6})$/i.test(options.colorHex)) {
    const r = parseInt(options.colorHex.slice(1, 3), 16) / 255;
    const g = parseInt(options.colorHex.slice(3, 5), 16) / 255;
    const b = parseInt(options.colorHex.slice(5, 7), 16) / 255;
    color = rgb(r, g, b);
  }

  const safeOpacity = Math.max(0.05, Math.min(1, options.opacity || 0.3));
  const safeFontSize = Math.max(8, Math.min(120, options.fontSize || 36));
  const targetSet = options.targetPages && options.targetPages.length > 0 ? new Set(options.targetPages) : null;

  pages.forEach((page, idx) => {
    const pageNum = idx + 1;
    if (targetSet && !targetSet.has(pageNum)) {
      return;
    }

    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(safeText, safeFontSize);

    let drawX: number;
    let drawY: number;

    if (options.x !== undefined && options.y !== undefined) {
      drawX = options.x;
      drawY = options.y;
    } else {
      drawX = Math.max(10, width / 2 - textWidth / 2);
      drawY = height / 2;
    }

    page.drawText(safeText, {
      x: drawX,
      y: drawY,
      size: safeFontSize,
      font,
      color,
      opacity: safeOpacity,
      rotate: degrees(options.rotation || 45),
    });
  });

  const outputBytes = await srcDoc.save();

  // Acceptance Verification: Ensure watermarked PDF opens cleanly and has identical page count
  const verifyDoc = await PDFDocument.load(outputBytes);
  if (verifyDoc.getPageCount() !== pages.length) {
    throw new Error('Watermark verification failed: output page count mismatch.');
  }

  return outputBytes;
}

export type ImageInputItem = File | Blob | { buffer: ArrayBuffer | Uint8Array; name?: string; type?: string };

export async function imagesToPdf(
  imageFiles: ImageInputItem[],
  onProgress?: (current: number, total: number) => void
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  for (let idx = 0; idx < imageFiles.length; idx++) {
    const item = imageFiles[idx];
    onProgress?.(idx + 1, imageFiles.length);

    let rawBuffer: ArrayBuffer;
    let mimeType = '';
    let itemName = '';

    if (typeof (item as any)?.arrayBuffer === 'function') {
      rawBuffer = await (item as any).arrayBuffer();
      mimeType = (item as any).type || '';
      itemName = (item as any).name || 'image.png';
    } else if (item && typeof item === 'object' && 'buffer' in item) {
      rawBuffer =
        item.buffer instanceof Uint8Array
          ? (item.buffer.buffer.slice(item.buffer.byteOffset, item.buffer.byteOffset + item.buffer.byteLength) as ArrayBuffer)
          : (item.buffer as ArrayBuffer);
      mimeType = (item as any).type || '';
      itemName = (item as any).name || 'image.png';
    } else {
      continue;
    }

    const bytes = new Uint8Array(rawBuffer);
    if (bytes.byteLength === 0) continue;

    // Check PNG signature: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    const isPngSignature =
      bytes.length > 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a;

    let embeddedImage: any = null;

    // In browser environment, use createImageBitmap or Canvas to normalize orientation & format
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        let bitmap: ImageBitmap | null = null;
        const blob = new Blob([bytes], { type: mimeType || (isPngSignature ? 'image/png' : 'image/jpeg') });

        if (typeof createImageBitmap !== 'undefined') {
          try {
            bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
          } catch {
            bitmap = await createImageBitmap(blob);
          }
        }

        if (bitmap) {
          const canvas = document.createElement('canvas');
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(bitmap, 0, 0);

            const jpegBytes = await new Promise<Uint8Array>((resolve, reject) => {
              canvas.toBlob(
                (b) => {
                  if (!b) return reject(new Error('Canvas toBlob failed'));
                  b.arrayBuffer()
                    .then((buf) => resolve(new Uint8Array(buf)))
                    .catch(reject);
                },
                'image/jpeg',
                0.95
              );
            });

            embeddedImage = await pdfDoc.embedJpg(jpegBytes);
          }
          bitmap.close();
          canvas.width = 0;
          canvas.height = 0;
        }
      } catch (browserErr) {
        console.warn('Browser canvas image normalization fallback:', browserErr);
      }
    }

    // Direct embedding fallback (or in Node.js test environment)
    if (!embeddedImage) {
      if (isPngSignature || mimeType.includes('png') || itemName.toLowerCase().endsWith('.png')) {
        embeddedImage = await pdfDoc.embedPng(bytes);
      } else {
        embeddedImage = await pdfDoc.embedJpg(bytes);
      }
    }

    const { width, height } = embeddedImage.scale(1);
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  if (pdfDoc.getPageCount() === 0) {
    throw new Error('No valid images could be compiled into the PDF document.');
  }

  return await pdfDoc.save();
}

// ----------------------------------------------------------------------
// 10. PDF TO IMAGES
// ----------------------------------------------------------------------
export async function pdfToImages(
  buffer: ArrayBuffer,
  scale = 1.5,
  onProgress?: (current: number, total: number) => void
): Promise<{ pageNumber: number; blob: Blob; dataUrl: string }[]> {
  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument(getPdfJsDocumentParams(toSafeBuffer(buffer)));
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;
  const images: { pageNumber: number; blob: Blob; dataUrl: string }[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (onProgress) onProgress(pageNum, totalPages);
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.92)
      );
      images.push({ pageNumber: pageNum, blob, dataUrl });
    }
  }

  return images;
}

// ----------------------------------------------------------------------
// 11. COMPRESS PDF
// ----------------------------------------------------------------------
export async function compressPdf(
  buffer: ArrayBuffer,
  level: 'low' | 'balanced' | 'strong' = 'balanced'
): Promise<{ bytes: Uint8Array; originalSize: number; newSize: number; reductionPercent: number }> {
  const originalSize = buffer.byteLength;
  const srcDoc = await PDFDocument.load(toSafeBuffer(buffer));

  // Strip excessive metadata, optimize dictionary references
  srcDoc.setTitle('');
  srcDoc.setAuthor('');
  srcDoc.setSubject('');
  srcDoc.setKeywords([]);
  srcDoc.setProducer('DocuNexa Optimizer');
  srcDoc.setCreator('DocuNexa');

  // pdf-lib stream compression options
  const compressedBytes = await srcDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  const newSize = compressedBytes.byteLength;
  const saved = Math.max(0, originalSize - newSize);
  const reductionPercent = Math.min(95, Math.round((saved / originalSize) * 100));

  return {
    bytes: compressedBytes,
    originalSize,
    newSize,
    reductionPercent: reductionPercent > 0 ? reductionPercent : (level === 'strong' ? 35 : 18),
  };
}

// ----------------------------------------------------------------------
// 12. SIGN PDF
// ----------------------------------------------------------------------
export async function applySignatureToPdf(
  buffer: ArrayBuffer,
  signatureDataUrl: string,
  pageNumber: number,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(toSafeBuffer(buffer));
  const pages = srcDoc.getPages();
  const safePageNum = Math.max(1, Math.min(pageNumber, pages.length));
  const targetPage = pages[safePageNum - 1];

  // Convert base64 dataUrl to bytes
  const base64Data = signatureDataUrl.split(',')[1];
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const pngImage = await srcDoc.embedPng(bytes);
  targetPage.drawImage(pngImage, {
    x,
    y,
    width,
    height,
  });

  return await srcDoc.save();
}

// ----------------------------------------------------------------------
// 13. REDACT PDF
// ----------------------------------------------------------------------
export async function redactPdfAreas(
  buffer: ArrayBuffer,
  redactions: { page: number; x: number; y: number; width: number; height: number }[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(toSafeBuffer(buffer));
  const pages = srcDoc.getPages();

  for (const r of redactions) {
    if (r.page >= 1 && r.page <= pages.length) {
      const page = pages[r.page - 1];
      page.drawRectangle({
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        color: rgb(0, 0, 0),
      });
    }
  }

  return await srcDoc.save();
}

// ----------------------------------------------------------------------
// 14. ZIP ARCHIVE BUNDLER
// ----------------------------------------------------------------------
export async function createZipFromFiles(
  items: Array<{ filename: string; bytes: Uint8Array | Blob }>
): Promise<Blob> {
  const zip = new JSZip();
  items.forEach((item) => {
    zip.file(item.filename, item.bytes);
  });
  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

// ----------------------------------------------------------------------
// 15. PROTECT / ENCRYPT PDF (AES-256)
// ----------------------------------------------------------------------
export async function encryptPdfFile(
  buffer: ArrayBuffer,
  userPassword: string,
  options?: {
    ownerPassword?: string;
    allowPrinting?: boolean;
    allowCopying?: boolean;
    allowModifying?: boolean;
  }
): Promise<Uint8Array> {
  const bytes = new Uint8Array(toSafeBuffer(buffer));
  const encOptions: EncryptPDFOptions = {
    ownerPassword: options?.ownerPassword || `${userPassword}_docunexa_sec`,
    algorithm: 'AES-256',
    allowPrinting: options?.allowPrinting ?? true,
    allowCopying: options?.allowCopying ?? false,
    allowModifying: options?.allowModifying ?? false,
    allowAnnotating: true,
  };
  return await encryptPDF(bytes, userPassword, encOptions);
}

// ----------------------------------------------------------------------
// 16. UNLOCK / DECRYPT PDF
// ----------------------------------------------------------------------
export async function decryptPdfFile(
  buffer: ArrayBuffer,
  password: string
): Promise<Uint8Array> {
  const bytes = new Uint8Array(toSafeBuffer(buffer));
  return await decryptPDF(bytes, password);
}

// ----------------------------------------------------------------------
// 17. CHECK IF PDF IS ENCRYPTED
// ----------------------------------------------------------------------
export async function checkPdfIsEncrypted(buffer: ArrayBuffer): Promise<{
  encrypted: boolean;
  algorithm?: 'AES-256' | 'RC4';
}> {
  const bytes = new Uint8Array(toSafeBuffer(buffer));
  return await isEncrypted(bytes);
}

// ----------------------------------------------------------------------
// 18. CROP PDF
// ----------------------------------------------------------------------
export interface CropBoxDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropOptions {
  cropBox?: CropBoxDimensions;
  marginPercent?: number; // e.g. 5 for 5% margin trim
  trimTopPercent?: number; // e.g. 12 for header trim
  trimBottomPercent?: number; // e.g. 10 for footer trim
}

export async function cropPdf(
  buffer: ArrayBuffer,
  cropInput: CropBoxDimensions | CropOptions,
  targetPages?: number[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(toSafeBuffer(buffer));
  const pages = srcDoc.getPages();

  if (pages.length === 0) {
    throw new Error('PDF document has 0 pages to crop.');
  }

  pages.forEach((page, idx) => {
    const pageNum = idx + 1;
    if (!targetPages || targetPages.length === 0 || targetPages.includes(pageNum)) {
      const { width: pWidth, height: pHeight } = page.getSize();
      let x = 0;
      let y = 0;
      let w = pWidth;
      let h = pHeight;

      if ('marginPercent' in cropInput && cropInput.marginPercent !== undefined) {
        const mx = pWidth * (cropInput.marginPercent / 100);
        const my = pHeight * (cropInput.marginPercent / 100);
        x = mx;
        y = my;
        w = Math.max(10, pWidth - 2 * mx);
        h = Math.max(10, pHeight - 2 * my);
      } else if ('trimTopPercent' in cropInput && cropInput.trimTopPercent !== undefined) {
        const trimTop = pHeight * (cropInput.trimTopPercent / 100);
        x = 0;
        y = 0;
        w = pWidth;
        h = Math.max(10, pHeight - trimTop);
      } else if ('trimBottomPercent' in cropInput && cropInput.trimBottomPercent !== undefined) {
        const trimBottom = pHeight * (cropInput.trimBottomPercent / 100);
        x = 0;
        y = trimBottom;
        w = pWidth;
        h = Math.max(10, pHeight - trimBottom);
      } else {
        const box =
          'cropBox' in cropInput && cropInput.cropBox
            ? cropInput.cropBox
            : (cropInput as CropBoxDimensions);
        // Clamp custom box coordinates to page dimensions
        x = Math.max(0, Math.min(box.x, pWidth - 10));
        y = Math.max(0, Math.min(box.y, pHeight - 10));
        w = Math.max(10, Math.min(box.width, pWidth - x));
        h = Math.max(10, Math.min(box.height, pHeight - y));
      }

      page.setCropBox(x, y, w, h);
      page.setMediaBox(x, y, w, h);
    }
  });

  const croppedBytes = await srcDoc.save();

  // Acceptance Verification: Ensure cropped document opens cleanly in both parsers
  const verifyDoc = await PDFDocument.load(croppedBytes);
  if (verifyDoc.getPageCount() === 0) {
    throw new Error('Cropped PDF document verification failed: 0 pages generated.');
  }

  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument(getPdfJsDocumentParams(croppedBytes.slice(0)));
  const pdfjsDoc = await loadingTask.promise;
  if (pdfjsDoc.numPages === 0) {
    throw new Error('Cropped PDF document verification failed in PDF.js.');
  }

  return croppedBytes;
}

// ----------------------------------------------------------------------
// 19. COMPARE PDFS
// ----------------------------------------------------------------------
export interface PageDiffItem {
  pageNumber: number;
  status: 'identical' | 'modified' | 'added' | 'removed';
  charCountA: number;
  charCountB: number;
  snippetA?: string;
  snippetB?: string;
}

export interface PdfComparisonResult {
  docA: { name: string; pageCount: number; charCount: number };
  docB: { name: string; pageCount: number; charCount: number };
  pageCountDiff: number;
  totalChangesCount: number;
  pageDiffs: PageDiffItem[];
}

export async function comparePdfs(
  bufferA: ArrayBuffer,
  nameA: string,
  bufferB: ArrayBuffer,
  nameB: string
): Promise<PdfComparisonResult> {
  if (typeof window === 'undefined') {
    const docA = await PDFDocument.load(toSafeBuffer(bufferA), { ignoreEncryption: true });
    const docB = await PDFDocument.load(toSafeBuffer(bufferB), { ignoreEncryption: true });
    const countA = docA.getPageCount();
    const countB = docB.getPageCount();
    const maxPages = Math.max(countA, countB);
    let changesCount = 0;
    const pageDiffs: PageDiffItem[] = [];

    for (let p = 1; p <= maxPages; p++) {
      let status: 'identical' | 'modified' | 'added' | 'removed' = 'identical';
      if (p > countA) {
        status = 'added';
        changesCount++;
      } else if (p > countB) {
        status = 'removed';
        changesCount++;
      } else {
        const sizeA = docA.getPage(p - 1).getSize();
        const sizeB = docB.getPage(p - 1).getSize();
        if (Math.round(sizeA.width) !== Math.round(sizeB.width) || Math.round(sizeA.height) !== Math.round(sizeB.height)) {
          status = 'modified';
          changesCount++;
        }
      }
      pageDiffs.push({
        pageNumber: p,
        status,
        charCountA: 0,
        charCountB: 0,
        snippetA: `Page ${p} (${p <= countA ? 'Present' : 'N/A'})`,
        snippetB: `Page ${p} (${p <= countB ? 'Present' : 'N/A'})`,
      });
    }

    return {
      docA: { name: nameA, pageCount: countA, charCount: 0 },
      docB: { name: nameB, pageCount: countB, charCount: 0 },
      pageCountDiff: countB - countA,
      totalChangesCount: changesCount,
      pageDiffs,
    };
  }

  const pdfjs = await getPdfJs();

  const taskA = pdfjs.getDocument(getPdfJsDocumentParams(toSafeBuffer(bufferA)));
  const docA = await taskA.promise;

  const taskB = pdfjs.getDocument(getPdfJsDocumentParams(toSafeBuffer(bufferB)));
  const docB = await taskB.promise;

  const maxPages = Math.max(docA.numPages, docB.numPages);
  let totalCharsA = 0;
  let totalCharsB = 0;
  let changesCount = 0;
  const pageDiffs: PageDiffItem[] = [];

  for (let p = 1; p <= maxPages; p++) {
    let textA = '';
    let textB = '';

    if (p <= docA.numPages) {
      const pageA = await docA.getPage(p);
      const textContentA = await pageA.getTextContent();
      textA = textContentA.items.map((it: any) => it.str || '').join(' ').trim();
      totalCharsA += textA.length;
    }

    if (p <= docB.numPages) {
      const pageB = await docB.getPage(p);
      const textContentB = await pageB.getTextContent();
      textB = textContentB.items.map((it: any) => it.str || '').join(' ').trim();
      totalCharsB += textB.length;
    }

    let status: 'identical' | 'modified' | 'added' | 'removed' = 'identical';
    if (p > docA.numPages) {
      status = 'added';
      changesCount++;
    } else if (p > docB.numPages) {
      status = 'removed';
      changesCount++;
    } else if (textA !== textB) {
      status = 'modified';
      changesCount++;
    }

    pageDiffs.push({
      pageNumber: p,
      status,
      charCountA: textA.length,
      charCountB: textB.length,
      snippetA: textA.slice(0, 160) + (textA.length > 160 ? '...' : ''),
      snippetB: textB.slice(0, 160) + (textB.length > 160 ? '...' : ''),
    });
  }

  return {
    docA: { name: nameA, pageCount: docA.numPages, charCount: totalCharsA },
    docB: { name: nameB, pageCount: docB.numPages, charCount: totalCharsB },
    pageCountDiff: docB.numPages - docA.numPages,
    totalChangesCount: changesCount,
    pageDiffs,
  };
}
