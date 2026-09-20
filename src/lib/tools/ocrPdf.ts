import { getPdfJs, getPdfJsDocumentParams } from '../pdfReader';
import { PDFDocument, rgb } from 'pdf-lib';
import { imagesToPdf } from '../pdfEngine';

export interface OcrResult {
  filename: string;
  bytes: Uint8Array | null;
  transcriptText: string;
  transcriptFilename: string;
  totalPages: number;
  recognizedCharCount: number;
  verifiedSearchable: boolean;
  hasEthiopicCharacters: boolean;
  success: boolean;
  hasReadableText: boolean;
  disclaimer: string;
  recommendation?: string;
}

/**
 * Lazy-loads Tesseract.js in a Web Worker, performs optical character recognition
 * on scanned/image PDF pages, injects a searchable text layer, and preserves the
 * complete OCR engine transcript as UTF-8 without silently removing Ethiopic/Amharic characters.
 *
 * If zero characters are recognized, honestly reports failure and scan recommendations
 * without throwing unhandled exceptions or generating fake OCR results.
 */
export async function performPdfOcr(
  inputBuffer: ArrayBuffer,
  baseName: string,
  lang: 'eng' | 'amh' = 'eng',
  onProgress?: (percent: number, status: string) => void
): Promise<OcrResult> {
  onProgress?.(5, 'Analyzing input document stream...');

  let pdfBuffer = inputBuffer;
  const rawBytes = new Uint8Array(inputBuffer);

  // If input is an image (JPG, PNG, WebP), compile into a PDF page first
  const isPng =
    rawBytes.length > 8 &&
    rawBytes[0] === 0x89 &&
    rawBytes[1] === 0x50 &&
    rawBytes[2] === 0x4e &&
    rawBytes[3] === 0x47;
  const isJpg =
    rawBytes.length > 3 &&
    rawBytes[0] === 0xff &&
    rawBytes[1] === 0xd8 &&
    rawBytes[2] === 0xff;
  const isWebp =
    rawBytes.length > 12 &&
    rawBytes[0] === 0x52 &&
    rawBytes[1] === 0x49 &&
    rawBytes[2] === 0x46 &&
    rawBytes[3] === 0x46 &&
    rawBytes[8] === 0x57 &&
    rawBytes[9] === 0x45 &&
    rawBytes[10] === 0x42 &&
    rawBytes[11] === 0x50;

  if (isPng || isJpg || isWebp) {
    onProgress?.(8, 'Framing image input into document canvas...');
    const compiledBytes = await imagesToPdf([
      { buffer: inputBuffer, name: `${baseName}.${isPng ? 'png' : isWebp ? 'webp' : 'jpg'}` },
    ]);
    pdfBuffer = compiledBytes.buffer.slice(
      compiledBytes.byteOffset,
      compiledBytes.byteOffset + compiledBytes.byteLength
    ) as ArrayBuffer;
  }

  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument(getPdfJsDocumentParams(pdfBuffer));

  let doc: any;
  try {
    doc = await loadingTask.promise;
  } catch (err: any) {
    loadingTask.destroy();
    throw new Error(`Failed to parse PDF document for OCR: ${err.message || err}`);
  }

  const totalPages = doc.numPages;

  // Lazy-load Tesseract.js in a Web Worker
  onProgress?.(15, `Initializing OCR WebAssembly engine (${lang === 'amh' ? 'Amharic' : 'English'})...`);
  const { createWorker } = await import('tesseract.js');

  const worker = await createWorker(lang, 1, {
    logger: () => {},
  });

  try {
    // Set explicit resolution parameter to match 2.0x canvas rendering scale (~150 DPI)
    await (worker as any).setParameters({
      user_defined_dpi: '150',
    });
  } catch {}

  const searchablePdfDoc = await PDFDocument.create();
  let totalCharsRecognized = 0;
  let fullTranscript = '';
  let hasEthiopicCharacters = false;

  try {
    for (let p = 1; p <= totalPages; p++) {
      const pagePct = Math.round(20 + (p / totalPages) * 60);
      onProgress?.(pagePct, `Running OCR on page ${p} of ${totalPages}...`);

      const pdfPage = await doc.getPage(p);
      const viewport = pdfPage.getViewport({ scale: 2.0 }); // 2x scale for crisp OCR recognition

      let canvas: HTMLCanvasElement | null = null;
      let ctx: CanvasRenderingContext2D | null = null;

      if (typeof document !== 'undefined') {
        canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        ctx = canvas.getContext('2d');
        if (ctx) {
          // Pre-fill solid white background to eliminate transparent-to-black canvas JPEG conversion
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }

      if (!canvas || !ctx) {
        throw new Error('Canvas rendering context is not available.');
      }

      await pdfPage.render({
        canvasContext: ctx,
        viewport,
        background: 'rgb(255, 255, 255)',
      }).promise;

      // Perform character recognition with word bounding boxes
      const ocrResult = await worker.recognize(canvas);
      const pageText = ocrResult.data.text || '';
      fullTranscript += `\n--- Page ${p} ---\n` + pageText;
      totalCharsRecognized += pageText.trim().length;

      if (/[\u1200-\u137F]/.test(pageText)) {
        hasEthiopicCharacters = true;
      }

      const words = (ocrResult.data as any).words || [];

      // Add page to searchable PDF with standard 1.0 visual size
      const standardViewport = pdfPage.getViewport({ scale: 1.0 });
      const newPage = searchablePdfDoc.addPage([standardViewport.width, standardViewport.height]);

      // Embed rendered image as page background
      const imageBytes = await new Promise<Uint8Array>((resolve, reject) => {
        canvas!.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Failed to render page image canvas'));
            blob
              .arrayBuffer()
              .then((buf) => resolve(new Uint8Array(buf)))
              .catch(reject);
          },
          'image/jpeg',
          0.85
        );
      });

      const embeddedImg = await searchablePdfDoc.embedJpg(imageBytes);
      newPage.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: standardViewport.width,
        height: standardViewport.height,
      });

      // Inject invisible text layer at exact word bounding box coordinates
      const scaleX = standardViewport.width / viewport.width;
      const scaleY = standardViewport.height / viewport.height;

      for (const word of words) {
        if (!word.text || !word.bbox) continue;
        const fontHeight = Math.max(8, (word.bbox.y1 - word.bbox.y0) * scaleY);
        const xPos = word.bbox.x0 * scaleX;
        const yPos = standardViewport.height - word.bbox.y1 * scaleY;

        // Sanitize ASCII/WinAnsi characters so drawText never throws on special glyphs
        const sanitizedWord = word.text.replace(/[^\x20-\x7E]/g, ' ').trim();
        if (sanitizedWord) {
          try {
            newPage.drawText(sanitizedWord, {
              x: Math.max(0, xPos),
              y: Math.max(0, yPos),
              size: fontHeight,
              opacity: 0.001, // Near-invisible searchable text layer
              color: rgb(0, 0, 0),
            });
          } catch {
            // Standard fonts cannot encode non-WinAnsi glyphs (Ethiopic).
            // The complete UTF-8 transcript is preserved in fullTranscript.
          }
        }
      }

      // Explicitly free canvas memory after each page
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    await worker.terminate();
    loadingTask.destroy();
  }

  // Check if zero characters were genuinely recognized
  if (totalCharsRecognized === 0) {
    return {
      filename: `${baseName} - (Unrecognized Scan).pdf`,
      bytes: null,
      transcriptText: '',
      transcriptFilename: `${baseName} - OCR Transcript.txt`,
      totalPages,
      recognizedCharCount: 0,
      verifiedSearchable: false,
      hasEthiopicCharacters: false,
      success: false,
      hasReadableText: false,
      disclaimer: 'Zero readable characters could be recognized from this document.',
      recommendation:
        'The OCR engine could not identify any readable characters. Please ensure the scan has sufficient resolution (150–300 DPI), clear contrast, upright orientation, and is not a blank sheet.',
    };
  }

  onProgress?.(85, 'Finalizing searchable PDF document and transcript...');
  const outputBytes = await searchablePdfDoc.save();

  // Independent verification of the injected searchable text layer
  onProgress?.(95, 'Verifying generated OCR output text layer...');
  let verifiedSearchable = false;
  let verifiedTextCount = 0;

  const verifyTask = pdfjs.getDocument(getPdfJsDocumentParams(outputBytes));
  try {
    const verifyDoc = await verifyTask.promise;
    for (let p = 1; p <= verifyDoc.numPages; p++) {
      const page = await verifyDoc.getPage(p);
      const text = await page.getTextContent();
      verifiedTextCount += text.items.map((i: any) => i.str || '').join('').length;
    }
    verifiedSearchable = verifiedTextCount > 0;
  } catch (err: any) {
    console.warn('OCR output verification warning:', err);
  } finally {
    verifyTask.destroy();
  }

  onProgress?.(100, 'Searchable PDF and UTF-8 transcript generated!');

  return {
    filename: `${baseName} - (Searchable OCR).pdf`,
    bytes: outputBytes,
    transcriptText: fullTranscript.trim(),
    transcriptFilename: `${baseName} - OCR Transcript.txt`,
    totalPages,
    recognizedCharCount: totalCharsRecognized,
    verifiedSearchable,
    hasEthiopicCharacters,
    success: true,
    hasReadableText: true,
    disclaimer: 'Preserve the complete OCR engine transcript as UTF-8 without silently removing Ethiopic/Amharic characters.',
  };
}
