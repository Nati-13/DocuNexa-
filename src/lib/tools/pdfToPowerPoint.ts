import { getPdfJs, getPdfJsDocumentParams } from '../pdfReader';
import JSZip from 'jszip';

export interface PowerPointConversionResult {
  filename: string;
  bytes: Uint8Array;
  slideCount: number;
}

/**
 * Converts PDF pages into a Microsoft PowerPoint (.pptx) presentation.
 * Prioritizes visual fidelity by rendering page layouts directly onto slides.
 */
export async function convertPdfToPowerPoint(
  pdfBuffer: ArrayBuffer,
  baseName: string,
  onProgress?: (percent: number, status: string) => void
): Promise<PowerPointConversionResult> {
  onProgress?.(10, 'Initializing PDF slide renderer...');

  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument(getPdfJsDocumentParams(pdfBuffer));
  const doc = await loadingTask.promise;
  const totalPages = doc.numPages;

  // Import pptxgenjs dynamically
  const pptxModule = await import('pptxgenjs');
  const PptxGen = (pptxModule as any).default || pptxModule;
  const pptx = new PptxGen();

  pptx.layout = 'LAYOUT_16x9';
  pptx.title = baseName;
  pptx.author = 'DocuNexa Free PDF Suite';

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const pct = Math.round(15 + (pageNum / totalPages) * 65);
    onProgress?.(pct, `Rendering slide ${pageNum} of ${totalPages}...`);

    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });

    let dataUrl = '';
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
        dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      }
    }

    const slide = pptx.addSlide();

    if (dataUrl) {
      // Embed high-res page render preserving full visual fidelity
      slide.addImage({
        data: dataUrl,
        x: '5%',
        y: '5%',
        w: '90%',
        h: '90%',
        sizing: { type: 'contain', w: 9.0, h: 5.0 },
      });
    }

    // Extract text and add as slide notes / accessible description
    const textContent = await page.getTextContent();
    const pageText = (textContent.items as any[]).map((i) => i.str || '').join(' ').trim();
    if (pageText) {
      slide.addNotes(pageText.slice(0, 1000));
    }
  }

  onProgress?.(85, 'Packaging .pptx presentation...');
  const pptxOutput = await pptx.write({ outputType: 'uint8array' });
  const outputBytes = new Uint8Array(pptxOutput as Uint8Array);

  // STRICT VERIFICATION: Verify valid PK ZIP and ppt/presentation.xml
  onProgress?.(95, 'Verifying PowerPoint package...');
  if (outputBytes.length < 4 || outputBytes[0] !== 0x50 || outputBytes[1] !== 0x4b) {
    throw new Error('PowerPoint presentation generation failed: Invalid PK ZIP structure.');
  }

  try {
    const zip = await JSZip.loadAsync(outputBytes);
    if (!zip.file('ppt/presentation.xml')) {
      throw new Error('PowerPoint verification failed: ppt/presentation.xml missing.');
    }
  } catch (err: any) {
    throw new Error(`PowerPoint verification failed: ${err.message || err}`);
  }

  onProgress?.(100, 'PowerPoint conversion complete!');

  return {
    filename: `${baseName}.pptx`,
    bytes: outputBytes,
    slideCount: totalPages,
  };
}
