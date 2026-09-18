import { getPdfJs } from '../pdfReader';
import { getAIProvider } from '../ai/aiProvider';

export interface TranslationResult {
  engineLabel: string;
  sourceLang: string;
  targetLang: string;
  translatedText: string;
  totalPages: number;
  pagesTranslated: number;
  isScannedWarning: boolean;
  progressMessage: string;
}

/**
 * Performs progressive text extraction and translation across document pages.
 * Honestly labeled as Basic Local Translation.
 */
export async function translatePdfDocument(
  pdfBuffer: ArrayBuffer,
  targetLang: string,
  onProgress?: (percent: number, status: string) => void
): Promise<TranslationResult> {
  onProgress?.(5, 'Opening PDF for translation...');

  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer.slice(0)),
    disableWorker: typeof window === 'undefined',
  });
  const doc = await loadingTask.promise;
  const totalPages = doc.numPages;

  let extractedText = '';
  let pagesWithText = 0;
  const maxPagesToTranslate = Math.min(totalPages, 25); // Practical limit for local engine

  for (let p = 1; p <= maxPagesToTranslate; p++) {
    const pct = Math.round(10 + (p / maxPagesToTranslate) * 60);
    onProgress?.(pct, `Extracting page ${p} of ${maxPagesToTranslate}...`);

    try {
      const page = await doc.getPage(p);
      const textContent = await page.getTextContent();
      const pageStr = textContent.items.map((it: any) => it.str || '').join(' ').trim();
      if (pageStr) {
        extractedText += `\n--- Page ${p} ---\n` + pageStr;
        pagesWithText++;
      }
    } catch {
      // Ignore single page read error
    }
  }

  const isScannedWarning = pagesWithText === 0;

  if (isScannedWarning) {
    return {
      engineLabel: 'Basic Local Translation (Glossary & Phrase Transformation)',
      sourceLang: 'English',
      targetLang,
      translatedText: 'This PDF appears to be scanned or contains only images. No selectable text could be extracted. Please run OCR PDF first to generate a searchable text layer before translating.',
      totalPages,
      pagesTranslated: 0,
      isScannedWarning: true,
      progressMessage: '0 selectable text pages detected. OCR required.',
    };
  }

  onProgress?.(75, `Translating extracted text into ${targetLang}...`);

  const provider = getAIProvider();
  const translated = await provider.translateText(extractedText, 'English', targetLang);

  onProgress?.(100, `Pages translated: ${pagesWithText} / ${totalPages}`);

  return {
    engineLabel: 'Basic Local Translation (Glossary & Phrase Transformation)',
    sourceLang: 'English',
    targetLang,
    translatedText: translated,
    totalPages,
    pagesTranslated: pagesWithText,
    isScannedWarning: false,
    progressMessage: `Pages translated: ${pagesWithText} / ${totalPages}`,
  };
}
