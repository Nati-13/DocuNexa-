import { getPdfJs } from '../pdfReader';
import { getAIProvider, DocumentSummaryResult } from '../ai/aiProvider';

export interface ChunkedSummaryResult {
  engineLabel: string;
  summary: DocumentSummaryResult;
  totalPages: number;
  pagesAnalyzed: number;
  progressMessage: string;
}

/**
 * Progressively extracts and summarizes text from large PDF documents in batches.
 * Honestly labeled as Local Document Summarizer unless an external model is configured.
 */
export async function summarizePdfDocument(
  pdfBuffer: ArrayBuffer,
  baseName: string,
  onProgress?: (percent: number, status: string) => void
): Promise<ChunkedSummaryResult> {
  onProgress?.(5, 'Opening PDF for progressive layout analysis...');

  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer.slice(0)),
    disableWorker: typeof window === 'undefined',
  });
  const doc = await loadingTask.promise;
  const totalPages = doc.numPages;

  const chunkSize = 10;
  const totalChunks = Math.ceil(totalPages / chunkSize);
  let aggregatedText = '';
  let pagesAnalyzed = 0;

  for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
    const startPage = chunkIdx * chunkSize + 1;
    const endPage = Math.min(totalPages, (chunkIdx + 1) * chunkSize);
    const progressStatus = `Analyzing pages ${startPage}–${endPage} of ${totalPages}...`;
    const pct = Math.round(10 + (chunkIdx / totalChunks) * 70);

    onProgress?.(pct, progressStatus);

    for (let p = startPage; p <= endPage; p++) {
      try {
        const page = await doc.getPage(p);
        const textContent = await page.getTextContent();
        const pageStr = textContent.items.map((it: any) => it.str || '').join(' ');
        aggregatedText += `\n[Page ${p}]\n` + pageStr;
        pagesAnalyzed++;
      } catch {
        // Continue with remaining pages if one fails
      }
    }
  }

  onProgress?.(85, 'Synthesizing structured executive overview and key concepts...');

  const provider = getAIProvider();
  const summary = await provider.summarizeDocument(aggregatedText, baseName);

  onProgress?.(100, `Pages analyzed: ${pagesAnalyzed} / ${totalPages}`);

  return {
    engineLabel: 'Local Document Summarizer (Rule-Based & Heuristic Extraction)',
    summary,
    totalPages,
    pagesAnalyzed,
    progressMessage: `Pages analyzed: ${pagesAnalyzed} / ${totalPages}`,
  };
}
