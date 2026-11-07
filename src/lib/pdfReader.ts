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
 * Safely inspects a PDF document to verify its format, encryption status,
 * and page count. Ensures PDF.js loading tasks and document instances are
 * completely destroyed to prevent memory leaks and orphaned worker processes.
 */
export async function inspectPdfDocument(
  data: ArrayBuffer | Uint8Array
): Promise<{ totalPages: number }> {
  if (!data || data.byteLength === 0) {
    throw new Error('The selected file is empty (0 bytes). Please upload a valid PDF document.');
  }

  // Quick signature check: First 1024 bytes must contain %PDF-
  const sliceLen = Math.min(data.byteLength, 1024);
  const headBytes =
    data instanceof Uint8Array
      ? data.subarray(0, sliceLen)
      : new Uint8Array(data.slice(0, sliceLen));
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

  let pdfDoc: any = null;
  const pages: PageTextData[] = [];
  let totalChars = 0;
  let pagesWithNoText = 0;
  let totalPages = 0;

  try {
    pdfDoc = await loadingTask.promise;
    totalPages = pdfDoc.numPages;

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
        interface PositionedItem {
          x: number;
          str: string;
          width: number;
          dir?: string;
        }
        const lineMap = new Map<number, PositionedItem[]>();

        for (const item of rawItems) {
          if (!('str' in item) || !item.str) continue;

          // item.transform: [scaleX, skewY, skewX, scaleY, transX, transY]
          const yKey = Math.round(item.transform[5] / 4) * 4;
          const xPos = Number(item.transform[4]) || 0;
          const width = Number(item.width) || 0;
          if (!lineMap.has(yKey)) {
            lineMap.set(yKey, []);
          }
          lineMap.get(yKey)!.push({ x: xPos, str: item.str, width, dir: item.dir });
        }

        // Sort lines from top of page to bottom (higher transY is top in PDF coordinates)
        const sortedKeys = Array.from(lineMap.keys()).sort((a, b) => b - a);
        const lines: string[] = [];

        const isRtlChar = (ch: string) =>
          /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(ch);

        for (const key of sortedKeys) {
          const itemsOnLine = lineMap.get(key)!;
          if (itemsOnLine.length === 0) continue;

          // Check if line contains predominantly RTL (Arabic) characters
          let rtlCharCount = 0;
          let nonSpaceCharCount = 0;
          for (const it of itemsOnLine) {
            for (const ch of it.str) {
              if (!/\s/.test(ch)) {
                nonSpaceCharCount++;
                if (isRtlChar(ch)) rtlCharCount++;
              }
            }
          }
          const isPredominantlyRtl =
            nonSpaceCharCount > 0 && rtlCharCount / nonSpaceCharCount > 0.4;

          // Sort items from left to right to discover horizontal layout columns
          const ltrSorted = [...itemsOnLine].sort((a, b) => a.x - b.x);

          // Partition into column clusters when large horizontal gaps exist (> 60px)
          const columnClusters: PositionedItem[][] = [];
          let currentCluster: PositionedItem[] = [];

          for (const it of ltrSorted) {
            if (currentCluster.length === 0) {
              currentCluster.push(it);
            } else {
              const prev = currentCluster[currentCluster.length - 1];
              const prevRight = prev.x + prev.width;
              const gap = it.x - Math.max(prevRight, prev.x);
              // Multi-column threshold: gap > 60px and absolute delta > 80px
              if (gap > 60 && it.x - prev.x > 80) {
                columnClusters.push(currentCluster);
                currentCluster = [it];
              } else {
                currentCluster.push(it);
              }
            }
          }
          if (currentCluster.length > 0) {
            columnClusters.push(currentCluster);
          }

          // For each column cluster, join into a line adhering to reading direction
          for (const cluster of columnClusters) {
            let orderedItems = cluster;
            if (isPredominantlyRtl) {
              // Right-to-left: highest X coordinate first to preserve natural Arabic reading order
              orderedItems = [...cluster].sort((a, b) => b.x - a.x);
            }
            const lineText = orderedItems.map((it) => it.str).join(' ').trim();
            if (lineText) {
              lines.push(lineText);
            }
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
  let pdfDoc: any = null;

  try {
    pdfDoc = await loadingTask.promise;
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
}
