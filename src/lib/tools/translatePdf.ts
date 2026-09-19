import { getPdfJs, getPdfJsDocumentParams } from '../pdfReader';
import { getTranslationProvider } from './translationProvider';

export interface TranslationResult {
  engineLabel: string;
  sourceLang: string;
  targetLang: string;
  translatedText: string;
  totalPages: number;
  pagesTranslated: number;
  isScannedWarning: boolean;
  isSupported: boolean;
  unsupportedMessage?: string;
  progressMessage: string;
}

/**
 * Performs progressive text extraction and translation across document pages.
 * Honestly labeled as Basic Local Translation.
 * Strictly verifies language support; unsupported languages return clear status without fake translation.
 */
export async function translatePdfDocument(
  pdfBuffer: ArrayBuffer,
  targetLang: string,
  onProgress?: (percent: number, status: string) => void
): Promise<TranslationResult> {
  onProgress?.(5, 'Opening PDF for translation analysis...');

  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument(getPdfJsDocumentParams(pdfBuffer));
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
      const pageStr = (textContent.items || []).map((it: any) => it.str || '').join(' ').trim();
      if (pageStr) {
        extractedText += `\n--- Page ${p} ---\n` + pageStr;
        pagesWithText++;
      }
    } catch {
      // Continue with remaining pages if single page extraction fails
    }
  }

  const isScannedWarning = pagesWithText === 0;

  if (isScannedWarning) {
    return {
      engineLabel: 'Basic Local Translation (Glossary & Phrase Transformation)',
      sourceLang: 'English',
      targetLang,
      translatedText: '',
      totalPages,
      pagesTranslated: 0,
      isScannedWarning: true,
      isSupported: true,
      progressMessage: '0 selectable text pages detected. OCR required.',
    };
  }

  onProgress?.(75, `Applying translation engine for ${targetLang}...`);

  const provider = getTranslationProvider();
  const transPayload = await provider.translateText(extractedText, 'English', targetLang);

  onProgress?.(100, `Pages analyzed: ${pagesWithText} / ${totalPages}`);

  return {
    engineLabel: transPayload.engineLabel,
    sourceLang: 'English',
    targetLang,
    translatedText: transPayload.translatedText,
    totalPages,
    pagesTranslated: pagesWithText,
    isScannedWarning: false,
    isSupported: transPayload.isSupported,
    unsupportedMessage: transPayload.unsupportedMessage,
    progressMessage: transPayload.isSupported
      ? `Pages translated: ${pagesWithText} / ${totalPages}`
      : 'Target language requires an external Translation Provider.',
  };
}
