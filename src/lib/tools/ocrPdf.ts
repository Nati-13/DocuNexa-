import { getPdfJs } from '../pdfReader';
import { PDFDocument, rgb } from 'pdf-lib';

export interface OcrResult {
  filename: string;
  bytes: Uint8Array;
  totalPages: number;
  recognizedCharCount: number;
  verifiedSearchable: boolean;
}

/**
 * Lazy-loads Tesseract.js in a Web Worker, performs optical character recognition
 * on scanned/image PDF pages, injects a searchable text layer, and verifies that text is extractable.
 */
export async function performPdfOcr(
  pdfBuffer: ArrayBuffer,
  baseName: string,
  lang: 'eng' | 'amh' = 'eng',
  onProgress?: (percent: number, status: string) => void
): Promise<OcrResult> {
  onProgress?.(5, 'Checking existing text layer...');

  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer.slice(0)),
    disableWorker: typeof window === 'undefined',
  });
  const doc = await loadingTask.promise;
  const totalPages = doc.numPages;

  // 1. Check if document already has substantial text
  let existingChars = 0;
  for (let p = 1; p <= Math.min(totalPages, 3); p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    existingChars += content.items.map((i: any) => i.str || '').join('').length;
  }

  // 2. Lazy-load Tesseract.js
  onProgress?.(15, `Initializing OCR WebAssembly engine (${lang === 'amh' ? 'Amharic' : 'English'})...`);
  const { createWorker } = await import('tesseract.js');

  // Configure worker with CDN-agnostic safe defaults
  const worker = await createWorker(lang, 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && m.progress) {
        // sub-progress
      }
    },
  });

  const searchablePdfDoc = await PDFDocument.create();
  let totalCharsRecognized = 0;

  try {
    for (let p = 1; p <= totalPages; p++) {
      const pagePct = Math.round(20 + (p / totalPages) * 60);
      onProgress?.(pagePct, `Running OCR on page ${p} of ${totalPages}...`);

      const pdfPage = await doc.getPage(p);
      const viewport = pdfPage.getViewport({ scale: 2.0 }); // 2x scale for clear OCR

      let canvas: HTMLCanvasElement | null = null;
      let ctx: CanvasRenderingContext2D | null = null;

      if (typeof document !== 'undefined') {
        canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        ctx = canvas.getContext('2d');
      }

      if (!canvas || !ctx) {
        throw new Error('Canvas context not available for page rendering.');
      }

      await pdfPage.render({ canvasContext: ctx, viewport }).promise;

      // Recognize text with bounding boxes
      const ocrResult = await worker.recognize(canvas);
      const words = (ocrResult.data as any).words || [];
      totalCharsRecognized += ocrResult.data.text.length;

      // Add page to searchable PDF with original visual size
      const standardViewport = pdfPage.getViewport({ scale: 1.0 });
      const newPage = searchablePdfDoc.addPage([standardViewport.width, standardViewport.height]);

      // Embed rendered image as background
      const imageBytes = await new Promise<Uint8Array>((resolve, reject) => {
        canvas!.toBlob((blob) => {
          if (!blob) return reject(new Error('Failed to render page image'));
          blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
        }, 'image/jpeg', 0.85);
      });

      const embeddedImg = await searchablePdfDoc.embedJpg(imageBytes);
      newPage.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: standardViewport.width,
        height: standardViewport.height,
      });

      // Inject invisible text layer at exact coordinates for searchability
      const scaleX = standardViewport.width / viewport.width;
      const scaleY = standardViewport.height / viewport.height;

      for (const word of words) {
        if (!word.text || !word.bbox) continue;
        const fontHeight = Math.max(8, (word.bbox.y1 - word.bbox.y0) * scaleY);
        const xPos = word.bbox.x0 * scaleX;
        // Invert Y coordinate from top-left (canvas) to bottom-left (PDF)
        const yPos = standardViewport.height - (word.bbox.y1 * scaleY);

        try {
          newPage.drawText(word.text, {
            x: Math.max(0, xPos),
            y: Math.max(0, yPos),
            size: fontHeight,
            opacity: 0.001, // Near-invisible searchable text layer
            color: rgb(0, 0, 0),
          });
        } catch {
          // Ignore unsupported glyphs in standard font
        }
      }
    }
  } finally {
    await worker.terminate();
  }

  onProgress?.(85, 'Finalizing searchable PDF document...');
  const outputBytes = await searchablePdfDoc.save();

  // 3. STRICT VERIFICATION: Reopen with PDF.js to verify searchable text exists
  onProgress?.(95, 'Verifying searchable text layer in output document...');
  let verifiedSearchable = false;
  try {
    const verifyDoc = await pdfjs.getDocument({
      data: new Uint8Array(outputBytes.slice(0)),
      disableWorker: typeof window === 'undefined',
    }).promise;

    let verifiedTextCount = 0;
    for (let p = 1; p <= verifyDoc.numPages; p++) {
      const page = await verifyDoc.getPage(p);
      const text = await page.getTextContent();
      verifiedTextCount += text.items.map((i: any) => i.str || '').join('').length;
    }

    verifiedSearchable = verifiedTextCount > 0;
    if (!verifiedSearchable) {
      throw new Error('Searchable text verification failed: No text layer detected in output PDF.');
    }
  } catch (err: any) {
    throw new Error(`OCR output verification error: ${err.message || err}`);
  }

  onProgress?.(100, 'Searchable PDF created and verified!');

  return {
    filename: `${baseName} - (Searchable OCR).pdf`,
    bytes: outputBytes,
    totalPages,
    recognizedCharCount: totalCharsRecognized,
    verifiedSearchable: true,
  };
}
