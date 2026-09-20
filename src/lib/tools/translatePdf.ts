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
  matchedTermsCount?: number;
}

/**
 * Performs progressive text extraction and translation across document pages.
 * Honestly labeled as Basic Local Translation (Glossary & Phrase Transformation).
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

  let doc: any;
  try {
    doc = await loadingTask.promise;
  } catch (err: any) {
    loadingTask.destroy();
    throw new Error(`Failed to parse PDF document for translation: ${err.message || err}`);
  }

  const totalPages = doc.numPages;
  const extractedPages: Array<{ pageNumber: number; text: string }> = [];
  const maxPagesToTranslate = Math.min(totalPages, 25); // Practical limit for client-side processing

  try {
    for (let p = 1; p <= maxPagesToTranslate; p++) {
      const pct = Math.round(10 + (p / maxPagesToTranslate) * 60);
      onProgress?.(pct, `Extracting text from page ${p} of ${maxPagesToTranslate}...`);

      try {
        const page = await doc.getPage(p);
        const textContent = await page.getTextContent();
        const pageStr = (textContent.items || []).map((it: any) => it.str || '').join(' ').trim();
        if (pageStr) {
          extractedPages.push({ pageNumber: p, text: pageStr });
        }
      } catch {
        // Continue with remaining pages if single page extraction fails
      }
    }
  } finally {
    loadingTask.destroy();
  }

  const pagesWithText = extractedPages.length;
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
      isSupported: false,
      unsupportedMessage:
        'This document contains zero selectable text across all analyzed pages. Because it consists of scanned images, please run OCR PDF first to generate an extractable text layer.',
      progressMessage: '0 selectable text pages detected. OCR required.',
    };
  }

  onProgress?.(75, `Applying translation engine for ${targetLang}...`);

  const provider = getTranslationProvider();
  let fullTranslatedText = '';
  let isAnyPageSupported = false;
  let lastUnsupportedMessage = '';

  for (const pageItem of extractedPages) {
    const pagePayload = await provider.translateText(pageItem.text, 'English', targetLang);
    if (!pagePayload.isSupported) {
      lastUnsupportedMessage = pagePayload.unsupportedMessage || '';
    } else {
      isAnyPageSupported = true;
      fullTranslatedText += `\n--- Page ${pageItem.pageNumber} ---\n` + pagePayload.translatedText;
    }
  }

  onProgress?.(100, `Pages analyzed: ${pagesWithText} / ${totalPages}`);

  if (!isAnyPageSupported) {
    return {
      engineLabel: provider.providerName,
      sourceLang: 'English',
      targetLang,
      translatedText: '',
      totalPages,
      pagesTranslated: 0,
      isScannedWarning: false,
      isSupported: false,
      unsupportedMessage:
        lastUnsupportedMessage ||
        `Language '${targetLang}' has no matching local vocabulary or is not supported locally.`,
      progressMessage: 'Target language requires an external Translation Provider or has no matching glossary terms.',
    };
  }

  return {
    engineLabel: provider.providerName,
    sourceLang: 'English',
    targetLang,
    translatedText: fullTranslatedText.trim(),
    totalPages,
    pagesTranslated: pagesWithText,
    isScannedWarning: false,
    isSupported: true,
    progressMessage: `Pages translated: ${pagesWithText} / ${totalPages}`,
  };
}
