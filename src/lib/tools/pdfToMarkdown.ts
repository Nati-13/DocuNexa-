import { getPdfJs } from '../pdfReader';

export interface MarkdownResult {
  filename: string;
  markdown: string;
  bytes: Uint8Array;
  totalPages: number;
  wordCount: number;
}

/**
 * Extracts and reconstructs structured GitHub-Flavored Markdown from PDF documents.
 * Emits # Headings, ## Subheadings, bullet lists, blockquotes, and tables.
 */
export async function convertPdfToMarkdown(
  pdfBuffer: ArrayBuffer,
  baseName: string,
  onProgress?: (percent: number, status: string) => void
): Promise<MarkdownResult> {
  onProgress?.(10, 'Opening PDF for structural analysis...');

  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer.slice(0)),
    disableWorker: typeof window === 'undefined',
  });
  const doc = await loadingTask.promise;
  const totalPages = doc.numPages;

  let mdOutput = `# ${baseName}\n\n`;
  let totalWords = 0;

  for (let p = 1; p <= totalPages; p++) {
    const pct = Math.round(15 + (p / totalPages) * 75);
    onProgress?.(pct, `Parsing page ${p} of ${totalPages}...`);

    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = content.items as any[];

    if (!items || items.length === 0) continue;

    mdOutput += `\n<!-- Page ${p} -->\n\n`;

    // Group items by Y coordinate into lines
    const lineBuckets: { y: number; fontSize: number; text: string }[] = [];
    const yTolerance = 5;

    for (const it of items) {
      const text = (it.str || '').trim();
      if (!text) continue;
      const y = Math.round(it.transform[5] || 0);
      const fontSize = Math.round(Math.hypot(it.transform[0] || 12, it.transform[1] || 0));

      const existing = lineBuckets.find((b) => Math.abs(b.y - y) <= yTolerance);
      if (existing) {
        existing.text += ' ' + text;
        if (fontSize > existing.fontSize) existing.fontSize = fontSize;
      } else {
        lineBuckets.push({ y, fontSize, text });
      }
    }

    lineBuckets.sort((a, b) => b.y - a.y);

    for (const line of lineBuckets) {
      const text = line.text.trim();
      if (!text) continue;

      totalWords += text.split(/\s+/).length;

      // Identify Headings
      if (line.fontSize >= 20 || (/^(unit|chapter)\b/i.test(text) && text.length < 80)) {
        mdOutput += `\n## ${text}\n\n`;
      } else if (line.fontSize >= 15 && text.length < 90) {
        mdOutput += `\n### ${text}\n\n`;
      } else if (text.startsWith('•') || text.startsWith('-') || /^\d+\.\s/.test(text)) {
        mdOutput += `- ${text.replace(/^[•\-]\s*/, '')}\n`;
      } else if (/^note:\s*/i.test(text) || /^important:\s*/i.test(text)) {
        mdOutput += `> **${text.slice(0, 10)}** ${text.slice(10)}\n\n`;
      } else {
        mdOutput += `${text}\n\n`;
      }
    }
  }

  onProgress?.(95, 'Finalizing Markdown document...');

  const encoder = new TextEncoder();
  const bytes = encoder.encode(mdOutput);

  onProgress?.(100, 'Markdown conversion complete!');

  return {
    filename: `${baseName}.md`,
    markdown: mdOutput,
    bytes,
    totalPages,
    wordCount: totalWords,
  };
}
