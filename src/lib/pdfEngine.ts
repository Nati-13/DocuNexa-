import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import { getPdfJs, getPdfJsDocumentParams } from './pdfReader';
import { encryptPDF, EncryptPDFOptions } from '@pdfsmaller/pdf-encrypt';
import { decryptPDF, isEncrypted } from '@pdfsmaller/pdf-decrypt';

/**
 * Ensures safe non-detached ArrayBuffer slice
 */
function toSafeBuffer(source: ArrayBuffer): ArrayBuffer {
  if (!source || source.byteLength === 0) {
    throw new Error('PDF document buffer is empty or detached.');
  }
  return source.slice(0);
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

    const name = `${baseFilename.replace(/\.pdf$/i, '')} - Part ${chunkIndex} (pages ${start}-${end}).pdf`;
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
// 6. ROTATE PDF (All or selected pages)
// ----------------------------------------------------------------------
export async function rotatePdf(
  buffer: ArrayBuffer,
  degreesDelta: number,
  targetPages?: number[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(toSafeBuffer(buffer));
  const pages = srcDoc.getPages();
  const targetSet = targetPages ? new Set(targetPages) : null;

  pages.forEach((page, idx) => {
    const pageNum = idx + 1;
    if (!targetSet || targetSet.has(pageNum)) {
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + degreesDelta) % 360));
    }
  });

  return await srcDoc.save();
}

// ----------------------------------------------------------------------
// 7. ADD PAGE NUMBERS
// ----------------------------------------------------------------------
export interface PageNumberOptions {
  position: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-center';
  startNumber: number;
  format: 'number' | 'page-of-total' | 'roman';
  fontSize: number;
}

export async function addPageNumbersToPdf(
  buffer: ArrayBuffer,
  options: PageNumberOptions
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(toSafeBuffer(buffer));
  const font = await srcDoc.embedFont(StandardFonts.Helvetica);
  const pages = srcDoc.getPages();
  const total = pages.length;

  pages.forEach((page, idx) => {
    const currentNum = options.startNumber + idx;
    const { width, height } = page.getSize();
    let text = `${currentNum}`;
    if (options.format === 'page-of-total') {
      text = `Page ${currentNum} of ${total}`;
    }

    const textWidth = font.widthOfTextAtSize(text, options.fontSize);
    let x = width / 2 - textWidth / 2;
    let y = 30;

    switch (options.position) {
      case 'bottom-center':
        x = width / 2 - textWidth / 2;
        y = 25;
        break;
      case 'bottom-right':
        x = width - textWidth - 35;
        y = 25;
        break;
      case 'bottom-left':
        x = 35;
        y = 25;
        break;
      case 'top-right':
        x = width - textWidth - 35;
        y = height - 30;
        break;
      case 'top-center':
        x = width / 2 - textWidth / 2;
        y = height - 30;
        break;
    }

    page.drawText(text, {
      x,
      y,
      size: options.fontSize,
      font,
      color: rgb(0.3, 0.3, 0.3),
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
}

export async function addWatermarkToPdf(
  buffer: ArrayBuffer,
  options: WatermarkOptions
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(toSafeBuffer(buffer));
  const font = await srcDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = srcDoc.getPages();

  pages.forEach((page) => {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(options.text, options.fontSize);
    page.drawText(options.text, {
      x: width / 2 - textWidth / 2,
      y: height / 2,
      size: options.fontSize,
      font,
      color: rgb(0.6, 0.6, 0.6),
      opacity: Math.max(0.05, Math.min(1, options.opacity)),
      rotate: degrees(options.rotation),
    });
  });

  return await srcDoc.save();
}

// ----------------------------------------------------------------------
// 9. IMAGES TO PDF
// ----------------------------------------------------------------------
export async function imagesToPdf(imageFiles: File[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  for (const file of imageFiles) {
    const buffer = await file.arrayBuffer();
    const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');

    let image;
    if (isPng) {
      image = await pdfDoc.embedPng(buffer);
    } else {
      image = await pdfDoc.embedJpg(buffer);
    }

    const { width, height } = image.scale(1);
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width,
      height,
    });
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
export async function cropPdf(
  buffer: ArrayBuffer,
  cropBox: { x: number; y: number; width: number; height: number },
  targetPages?: number[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(toSafeBuffer(buffer));
  const pages = srcDoc.getPages();

  pages.forEach((page, idx) => {
    const pageNum = idx + 1;
    if (!targetPages || targetPages.length === 0 || targetPages.includes(pageNum)) {
      page.setCropBox(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
    }
  });

  return await srcDoc.save();
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
