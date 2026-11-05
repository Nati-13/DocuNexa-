import { PageTextData } from '@/types';

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
  const safeData =
    data instanceof Uint8Array
      ? new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength))
      : new Uint8Array(data.slice(0));

  return {
    data: safeData,
    standardFontDataUrl: getStandardFontDataUrl(),
    cMapPacked: true,
    ...(typeof window === 'undefined' ? { disableWorker: true } : {}),
    ...extraOptions,
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
}> {
  const pdfjs = await getPdfJs();

  // Slice buffer and configure standardFontDataUrl & cMapUrl
  const loadingTask = pdfjs.getDocument(
    getPdfJsDocumentParams(arrayBuffer, {
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
      cMapPacked: true,
    })
  );

  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  const pages: PageTextData[] = [];
  let totalChars = 0;
  let pagesWithNoText = 0;

  try {
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      if (shouldCancel && shouldCancel()) {
        throw new Error('PDF extraction cancelled by user.');
      }

      if (onProgress) {
        onProgress(pageNum, totalPages);
      }

      const page = await pdfDoc.getPage(pageNum);
      try {
        const textContent = await page.getTextContent();

        // Group text items by roughly their vertical Y coordinate to form lines
        const rawItems = textContent.items as any[];
        const lineMap = new Map<number, Array<{ x: number; str: string }>>();

        for (const item of rawItems) {
          if (!('str' in item) || !item.str) continue;

          // item.transform: [scaleX, skewY, skewX, scaleY, transX, transY]
          const yKey = Math.round(item.transform[5] / 4) * 4;
          const xPos = Number(item.transform[4]) || 0;
          if (!lineMap.has(yKey)) {
            lineMap.set(yKey, []);
          }
          lineMap.get(yKey)!.push({ x: xPos, str: item.str });
        }

        // Sort lines from top of page to bottom (higher transY is top in PDF coordinates)
        const sortedKeys = Array.from(lineMap.keys()).sort((a, b) => b - a);
        const lines: string[] = [];

        for (const key of sortedKeys) {
          // Sort text fragments horizontally left-to-right to preserve reading order in multi-column layouts
          const sortedItems = lineMap.get(key)!.sort((a, b) => a.x - b.x);
          const lineText = sortedItems.map((it) => it.str).join(' ').trim();
          if (lineText) {
            lines.push(lineText);
          }
        }

        const rawText = lines.join('\n');
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
    if (typeof pdfDoc.destroy === 'function') {
      try {
        await pdfDoc.destroy();
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
  };
}

/**
 * Renders a specific single page to a canvas context
 */
export async function renderPdfPageToCanvas(
  arrayBuffer: ArrayBuffer,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale = 1.2
): Promise<void> {
  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument(getPdfJsDocumentParams(arrayBuffer));

  const pdfDoc = await loadingTask.promise;
  try {
    const page = await pdfDoc.getPage(pageNumber);
    try {
      const viewport = page.getViewport({ scale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    } finally {
      if (typeof page.cleanup === 'function') {
        page.cleanup();
      }
    }
  } finally {
    if (typeof pdfDoc.destroy === 'function') {
      try {
        await pdfDoc.destroy();
      } catch {
        // ignore cleanup error
      }
    }
  }
}
