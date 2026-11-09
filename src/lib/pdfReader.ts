import { PageTextData } from '@/types';
import { DocumentSection } from '@/types/structure';
import { extractOutlineStructure } from './structureDetector';

let pdfjsLibInstance: any = null;

export async function getPdfJs(): Promise<any> {
  if (!pdfjsLibInstance) {
    if (typeof window !== 'undefined') {
      const pdfjs = await import('pdfjs-dist');
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      }
      pdfjsLibInstance = pdfjs;
    } else {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      pdfjsLibInstance = pdfjs;
    }
  }

  return pdfjsLibInstance;
}

/**
 * Shared standard font data URL configuration for PDF.js across browser and Node/SSR.
 * In browser: '/standard_fonts/' (statically served by Next.js from public/standard_fonts)
 * In Node / test runner: './public/standard_fonts/' (local relative path for fs.readFile)
 */
export function getStandardFontDataUrl(): string {
  if (typeof window !== 'undefined') {
    return '/standard_fonts/';
  }
  return './public/standard_fonts/';
}

/**
 * Shared CMap URL configuration for PDF.js across browser and Node/SSR.
 * In browser: '/cmaps/' (statically served by Next.js from public/cmaps)
 * In Node / test runner: './public/cmaps/' (local relative path for fs.readFile)
 * Avoids any external network requests (e.g. unpkg.com) ensuring full offline & CSP compliance.
 */
export function getCMapUrl(): string {
  if (typeof window !== 'undefined') {
    return '/cmaps/';
  }
  return './public/cmaps/';
}

/**
 * Normalizes PDF buffer bytes by stripping any leading UTF-8/UTF-16 BOM,
 * whitespace, or non-PDF preamble bytes up to the official '%PDF-' signature.
 * Prevents parser crashes on real-world PDFs with envelope headers or BOMs.
 */
export function normalizePdfBytes(data: ArrayBuffer | Uint8Array): Uint8Array {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const searchLimit = Math.min(bytes.length, 2048);
  for (let i = 0; i <= searchLimit - 5; i++) {
    if (
      bytes[i] === 0x25 && // %
      bytes[i + 1] === 0x50 && // P
      bytes[i + 2] === 0x44 && // D
      bytes[i + 3] === 0x46 && // F
      bytes[i + 4] === 0x2d // -
    ) {
      if (i > 0) {
        return bytes.subarray(i);
      }
      return bytes;
    }
  }
  return bytes;
}

/**
 * Shared parameter builder for pdfjs.getDocument().
 * Universally provides:
 * 1. Safe sliced Uint8Array preventing detachment of the caller's buffer.
 * 2. Valid standardFontDataUrl (resolves "Ensure that the `standardFontDataUrl` API parameter is provided").
 * 3. cMapUrl and cMapPacked configuration.
 * 4. disableWorker in Node.js / SSR environments.
 */
export function getPdfJsDocumentParams(
  data: Uint8Array | ArrayBuffer,
  extraOptions: Record<string, any> = {}
): Record<string, any> {
  const normalized = normalizePdfBytes(data);
  const safeData = new Uint8Array(
    normalized.buffer.slice(normalized.byteOffset, normalized.byteOffset + normalized.byteLength)
  );

  return {
    data: safeData,
    standardFontDataUrl: getStandardFontDataUrl(),
    cMapUrl: getCMapUrl(),
    cMapPacked: true,
    ...(typeof window === 'undefined' ? { disableWorker: true } : {}),
    ...extraOptions,
  };
}

/**
 * Safely inspects a PDF document to verify its format, encryption status,
 * and page count. Ensures PDF.js loading tasks and document instances are
 * completely destroyed to prevent memory leaks and orphaned worker processes.
 */
export async function inspectPdfDocument(
  data: ArrayBuffer | Uint8Array
): Promise<{ totalPages: number; isScanned?: boolean; sampleAvgChars?: number }> {
  if (!data || data.byteLength === 0) {
    throw new Error('The selected file is empty (0 bytes). Please upload a valid PDF document.');
  }

  const normalized = normalizePdfBytes(data);

  // Quick signature check: First 1024 bytes must contain %PDF-
  const sliceLen = Math.min(normalized.byteLength, 1024);
  const headBytes = normalized.subarray(0, sliceLen);
  let headString = '';
  for (let i = 0; i < headBytes.length; i++) {
    headString += String.fromCharCode(headBytes[i]);
  }
  if (!headString.includes('%PDF-')) {
    throw new Error(
      'The selected file does not appear to be a valid PDF document (missing %PDF- header signature).'
    );
  }

  const pdfjs = await getPdfJs();
  let loadingTask: any = null;
  let pdfDoc: any = null;

  try {
    loadingTask = pdfjs.getDocument(getPdfJsDocumentParams(data));
    pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages;

    if (typeof totalPages !== 'number' || totalPages < 1) {
      throw new Error('The PDF document contains no readable pages.');
    }

    return { totalPages };
  } catch (err: any) {
    const errorMsg = String(err?.message || err || '');
    const errorName = String(err?.name || '');

    if (
      errorName === 'PasswordException' ||
      /password/i.test(errorMsg) ||
      /encrypt/i.test(errorMsg)
    ) {
      throw new Error(
        'This PDF document is password-protected or encrypted. Please unlock the PDF or remove the password before uploading.'
      );
    }

    if (/invalid pdf/i.test(errorMsg) || /corrupt/i.test(errorMsg) || /format/i.test(errorMsg)) {
      throw new Error('The PDF document is corrupted, damaged, or cannot be parsed.');
    }

    // Default sanitized error message preventing internal stack trace exposure
    throw new Error(
      errorMsg.length > 0 && !errorMsg.includes('at ')
        ? errorMsg
        : 'Could not open PDF: The file format is unsupported or the file is damaged.'
    );
  } finally {
    if (pdfDoc && typeof pdfDoc.destroy === 'function') {
      try {
        await pdfDoc.destroy();
      } catch {}
    }
    if (loadingTask && typeof loadingTask.destroy === 'function') {
      try {
        await loadingTask.destroy();
      } catch {}
    }
  }
}

interface LayoutItem {
  x: number;
  y: number;
  width: number;
  str: string;
  dir?: string;
}

const isRtlChar = (ch: string) =>
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(ch);

/**
 * Reconstructs lines from raw PDF text items with column-awareness,
 * NFKC Unicode normalization, and RTL script ordering.
 * Resolves horizontal zig-zag interleaving in multi-column layouts.
 */
export function reconstructPageLines(rawItems: any[]): { lines: string[]; rawText: string } {
  const items: LayoutItem[] = [];

  for (const it of rawItems) {
    if (!('str' in it) || !it.str) continue;
    // Normalize Unicode compatibility characters (ligatures, fullwidth, decomposed forms)
    const normalized = String(it.str).normalize('NFKC');
    if (!normalized.trim()) continue;

    items.push({
      x: Number(it.transform?.[4]) || 0,
      y: Number(it.transform?.[5]) || 0,
      width: Number(it.width) || 0,
      str: normalized,
      dir: it.dir,
    });
  }

  if (items.length === 0) {
    return { lines: [], rawText: '' };
  }

  // Helper to format a cluster of items sorted top-to-bottom into lines
  const formatCluster = (clusterItems: LayoutItem[]): string[] => {
    if (clusterItems.length === 0) return [];

    const lineMap = new Map<number, LayoutItem[]>();
    for (const it of clusterItems) {
      const yKey = Math.round(it.y / 3.5) * 3.5;
      if (!lineMap.has(yKey)) lineMap.set(yKey, []);
      lineMap.get(yKey)!.push(it);
    }

    const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);
    const clusterLines: string[] = [];

    for (const yKey of sortedY) {
      const lineItems = lineMap.get(yKey)!;
      if (lineItems.length === 0) continue;

      // Check for RTL
      let rtlCount = 0;
      let nonSpaceCount = 0;
      for (const it of lineItems) {
        for (const ch of it.str) {
          if (!/\s/.test(ch)) {
            nonSpaceCount++;
            if (isRtlChar(ch)) rtlCount++;
          }
        }
      }
      const isRtl = nonSpaceCount > 0 && rtlCount / nonSpaceCount > 0.4;

      const sortedX = isRtl
        ? [...lineItems].sort((a, b) => b.x - a.x)
        : [...lineItems].sort((a, b) => a.x - b.x);

      let lineText = '';
      for (let i = 0; i < sortedX.length; i++) {
        const curr = sortedX[i];
        if (i === 0) {
          lineText = curr.str;
        } else {
          const prev = sortedX[i - 1];
          const gap = curr.x - (prev.x + prev.width);
          if (gap >= 2) {
            lineText += ' ' + curr.str;
          } else {
            lineText += curr.str;
          }
        }
      }

      const trimmed = lineText.trim();
      if (trimmed) clusterLines.push(trimmed);
    }

    return clusterLines;
  };

  // Check for multi-column layout
  const minX = Math.min(...items.map((i) => i.x));
  const maxX = Math.max(...items.map((i) => i.x + i.width));
  const contentWidth = maxX - minX;

  let isTwoColumn = false;
  let midX = minX + contentWidth / 2;
  let bannerSplitY = -Infinity;

  if (contentWidth > 280 && items.length >= 8) {
    const minY = Math.min(...items.map((i) => i.y));
    const maxY = Math.max(...items.map((i) => i.y));
    const height = maxY - minY;

    const candidateBodyItems = items.filter(
      (i) => i.y < maxY - height * 0.15 && i.y > minY + height * 0.08
    );

    if (candidateBodyItems.length >= 6) {
      const gutterWidth = 24;
      const gutterLeft = midX - gutterWidth / 2;
      const gutterRight = midX + gutterWidth / 2;

      let leftCount = 0;
      let rightCount = 0;
      let crossingCount = 0;

      for (const it of candidateBodyItems) {
        const itemRight = it.x + it.width;
        if (itemRight <= gutterLeft) {
          leftCount++;
        } else if (it.x >= gutterRight) {
          rightCount++;
        } else {
          crossingCount++;
        }
      }

      if (leftCount >= 3 && rightCount >= 3 && crossingCount <= Math.max(1, candidateBodyItems.length * 0.1)) {
        isTwoColumn = true;
        const colItems = items.filter((i) => i.x + i.width <= gutterLeft || i.x >= gutterRight);
        if (colItems.length > 0) {
          const highestColY = Math.max(...colItems.map((i) => i.y));
          bannerSplitY = highestColY + 8;
        }
      }
    }
  }

  let finalLines: string[] = [];

  if (isTwoColumn) {
    const bannerItems = items.filter((i) => i.y > bannerSplitY);
    const col1Items = items.filter((i) => i.y <= bannerSplitY && i.x < midX);
    const col2Items = items.filter((i) => i.y <= bannerSplitY && i.x >= midX);

    finalLines = [
      ...formatCluster(bannerItems),
      ...formatCluster(col1Items),
      ...formatCluster(col2Items),
    ];
  } else {
    finalLines = formatCluster(items);
  }

  return {
    lines: finalLines,
    rawText: finalLines.join('\n'),
  };
}

/**
 * Loads a PDF document and extracts text page by page, checking for scanned status
 */
export async function extractPdfTextPages(
  arrayBuffer: ArrayBuffer,
  onProgress?: (current: number, total: number) => void,
  shouldCancel?: () => boolean
): Promise<{
  pages: PageTextData[];
  totalPages: number;
  isScanned: boolean;
  avgCharsPerPage: number;
  outlines?: DocumentSection[] | null;
}> {
  const pdfjs = await getPdfJs();

  // Slice buffer and configure standardFontDataUrl & local cMapUrl
  const loadingTask = pdfjs.getDocument(getPdfJsDocumentParams(arrayBuffer));

  let pdfDoc: any = null;
  const pages: PageTextData[] = [];
  let totalChars = 0;
  let pagesWithNoText = 0;
  let totalPages = 0;
  let outlines: DocumentSection[] | null = null;

  try {
    pdfDoc = await loadingTask.promise;
    totalPages = pdfDoc.numPages;

    try {
      outlines = await extractOutlineStructure(pdfDoc, totalPages);
    } catch {
      // Outline not present or non-standard
    }

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      if (shouldCancel && shouldCancel()) {
        throw new Error('PDF extraction cancelled by user.');
      }

      if (onProgress) {
        onProgress(pageNum, totalPages);
      }

      const page = await pdfDoc.getPage(pageNum);
      try {
        let lines: string[] = [];
        let rawText = '';
        try {
          const textContent = await page.getTextContent();
          const reconstructed = reconstructPageLines(textContent.items as any[]);
          lines = reconstructed.lines;
          rawText = reconstructed.rawText;
        } catch {
          // Resilient single-page text recovery: if textContent throws on a complex page,
          // treat page as having no extractable text rather than failing whole document
          lines = [];
          rawText = '';
        }

        const charCount = rawText.replace(/\s/g, '').length;
        totalChars += charCount;

        if (charCount < 10) {
          pagesWithNoText++;
        }

        pages.push({
          pageNumber: pageNum,
          rawText,
          lines,
          hasSubstantialText: charCount >= 25,
        });
      } finally {
        // Immediate memory cleanup: release glyph and font cache for this page
        // Essential to prevent out-of-memory crashes on documents with > 700 to 1,500 pages
        if (typeof page.cleanup === 'function') {
          page.cleanup();
        }
      }

      // Yield every 5 pages to keep browser UI reactive
      if (pageNum % 5 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }
  } finally {
    // Release PDF.js worker resources
    if (pdfDoc && typeof pdfDoc.destroy === 'function') {
      try {
        await pdfDoc.destroy();
      } catch {
        // ignore cleanup error
      }
    }
    if (loadingTask && typeof loadingTask.destroy === 'function') {
      try {
        await loadingTask.destroy();
      } catch {
        // ignore cleanup error
      }
    }
  }

  const avgCharsPerPage = totalPages > 0 ? Math.round(totalChars / totalPages) : 0;
  // If > 70% of pages have practically no text or average is < 20 chars, mark as scanned
  const isScanned =
    totalPages > 0 &&
    (pagesWithNoText / totalPages > 0.7 || (totalPages > 3 && avgCharsPerPage < 25));

  return {
    pages,
    totalPages,
    isScanned,
    avgCharsPerPage,
    outlines,
  };
}

/**
 * Renders a specific single page to a canvas context
 */
export interface RenderPdfPageOptions {
  scale?: number;
  signal?: AbortSignal;
  pdfDoc?: any;
}

// Active canvas render registry to prevent concurrent renders on the same canvas
const activeCanvasRenderTasks = new WeakMap<
  HTMLCanvasElement,
  {
    renderTask: any;
    promise: Promise<void>;
    cancel: () => void;
  }
>();

/**
 * Safely cancels any active PDF.js render operation on a specific canvas element
 * and awaits completion so the canvas is clean for subsequent render calls.
 */
export async function cancelActiveCanvasRender(canvas: HTMLCanvasElement): Promise<void> {
  const active = activeCanvasRenderTasks.get(canvas);
  if (active) {
    try {
      active.cancel();
    } catch {
      // ignore immediate sync cancel error
    }
    try {
      await active.promise;
    } catch {
      // ignore RenderingCancelledException
    }
    activeCanvasRenderTasks.delete(canvas);
  }
}

/**
 * Safely renders a PDF page to a canvas element.
 * Guarantees:
 * 1. Mutual exclusion: any prior in-flight render on the canvas is cancelled and awaited.
 * 2. Signal abortion: immediately stops if AbortSignal is triggered.
 * 3. Document reuse: accepts existing pdfDoc instance or arrayBuffer.
 * 4. Proper cleanup: frees page resources and worker tasks.
 * 5. Transparent cancellation handling: RenderingCancelledException does not bubble as an error.
 */
export async function renderPdfPageToCanvas(
  source: ArrayBuffer | Uint8Array | any,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  optionsOrScale: number | RenderPdfPageOptions = 1.2
): Promise<void> {
  const options: RenderPdfPageOptions =
    typeof optionsOrScale === 'number' ? { scale: optionsOrScale } : optionsOrScale;
  const scale = options.scale ?? 1.2;
  const signal = options.signal;

  if (signal?.aborted) {
    return;
  }

  // 1. Cancel and await any prior render task on this canvas element
  await cancelActiveCanvasRender(canvas);

  if (signal?.aborted) {
    return;
  }

  const pdfjs = await getPdfJs();
  let pdfDoc: any = null;
  let shouldDestroyDoc = false;

  // Determine if source is already an open PDFDocumentProxy
  if (source && typeof source.getPage === 'function') {
    pdfDoc = source;
  } else if (options.pdfDoc && typeof options.pdfDoc.getPage === 'function') {
    pdfDoc = options.pdfDoc;
  } else {
    const loadingTask = pdfjs.getDocument(getPdfJsDocumentParams(source));
    pdfDoc = await loadingTask.promise;
    shouldDestroyDoc = true;
  }

  if (signal?.aborted) {
    if (shouldDestroyDoc && pdfDoc && typeof pdfDoc.destroy === 'function') {
      try {
        await pdfDoc.destroy();
      } catch {
        // ignore cleanup error
      }
    }
    return;
  }

  let page: any = null;
  let renderTask: any = null;

  try {
    page = await pdfDoc.getPage(pageNumber);
    if (signal?.aborted) return;

    const viewport = page.getViewport({ scale });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };

    renderTask = page.render(renderContext);

    let isCancelled = false;
    const taskPromise = (async () => {
      try {
        await renderTask.promise;
      } catch (err: any) {
        if (
          err?.name === 'RenderingCancelledException' ||
          err?.message?.includes('Rendering cancelled')
        ) {
          // Normal cancellation, suppress
          return;
        }
        throw err;
      } finally {
        if (activeCanvasRenderTasks.get(canvas)?.renderTask === renderTask) {
          activeCanvasRenderTasks.delete(canvas);
        }
      }
    })();

    const cancelFn = () => {
      if (!isCancelled) {
        isCancelled = true;
        try {
          renderTask.cancel();
        } catch {
          // ignore
        }
      }
    };

    activeCanvasRenderTasks.set(canvas, {
      renderTask,
      promise: taskPromise,
      cancel: cancelFn,
    });

    if (signal) {
      if (signal.aborted) {
        cancelFn();
      } else {
        signal.addEventListener('abort', cancelFn, { once: true });
      }
    }

    await taskPromise;
  } finally {
    if (page && typeof page.cleanup === 'function') {
      try {
        page.cleanup();
      } catch {
        // ignore cleanup error
      }
    }
    if (shouldDestroyDoc && pdfDoc && typeof pdfDoc.destroy === 'function') {
      try {
        await pdfDoc.destroy();
      } catch {
        // ignore cleanup error
      }
    }
  }
}
