import { getPdfJs, getPdfJsDocumentParams } from '../pdfReader';
import JSZip from 'jszip';

export interface WordConversionResult {
  filename: string;
  bytes: Uint8Array;
  paragraphCount: number;
  headingsCount: number;
}

/**
 * Converts PDF document structure into an editable Microsoft Word (.docx) document.
 * Detects headings, lists, and body paragraphs.
 */
export async function convertPdfToWord(
  pdfBuffer: ArrayBuffer,
  baseName: string,
  onProgress?: (percent: number, status: string) => void
): Promise<WordConversionResult> {
  onProgress?.(10, 'Extracting text and structure from PDF...');

  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument(getPdfJsDocumentParams(pdfBuffer));
  const doc = await loadingTask.promise;
  const totalPages = doc.numPages;

  const { Document, Paragraph, TextRun, HeadingLevel, Packer } = await import('docx');

  const docxChildren: any[] = [];
  let totalParagraphs = 0;
  let totalHeadings = 0;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const pct = Math.round(15 + (pageNum / totalPages) * 60);
    onProgress?.(pct, `Reconstructing paragraphs for page ${pageNum} of ${totalPages}...`);

    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const items = content.items as any[];

    if (!items || items.length === 0) continue;

    // Group items by Y coordinate into lines
    interface LineItem {
      x: number;
      width: number;
      text: string;
    }
    const lineBuckets: { y: number; fontSize: number; items: LineItem[] }[] = [];
    const yTolerance = 5;

    for (const it of items) {
      const text = (it.str || '').trim();
      if (!text) continue;
      const x = Math.round(it.transform[4] || 0);
      const y = Math.round(it.transform[5] || 0);
      const width = Math.round(it.width || 0);
      const fontSize = Math.round(Math.hypot(it.transform[0] || 12, it.transform[1] || 0));

      const existing = lineBuckets.find((b) => Math.abs(b.y - y) <= yTolerance);
      if (existing) {
        existing.items.push({ x, width, text });
        if (fontSize > existing.fontSize) existing.fontSize = fontSize;
      } else {
        lineBuckets.push({ y, fontSize, items: [{ x, width, text }] });
      }
    }

    // Sort lines top to bottom
    lineBuckets.sort((a, b) => b.y - a.y);

    // Analyze lines and generate docx elements with left-to-right ordering
    for (const line of lineBuckets) {
      line.items.sort((a, b) => a.x - b.x);

      let lineText = '';
      for (let i = 0; i < line.items.length; i++) {
        const item = line.items[i];
        if (i === 0) {
          lineText = item.text;
        } else {
          const prev = line.items[i - 1];
          const gap = item.x - (prev.x + prev.width);
          lineText += (gap > 22 ? '    ' : ' ') + item.text;
        }
      }

      const text = lineText.trim();
      if (!text) continue;

      totalParagraphs++;

      // Detect Headings based on font size or casing
      if (line.fontSize >= 18 || (/^(unit|chapter|lesson|section|part|module)\b/i.test(text) && text.length < 80)) {
        totalHeadings++;
        docxChildren.push(
          new Paragraph({
            text,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
          })
        );
      } else if (line.fontSize >= 14 && text.length < 90) {
        totalHeadings++;
        docxChildren.push(
          new Paragraph({
            text,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 180, after: 80 },
          })
        );
      } else if (text.startsWith('•') || text.startsWith('-') || /^\d+\.\s/.test(text)) {
        // Bullet or numbered list item
        docxChildren.push(
          new Paragraph({
            children: [new TextRun({ text, size: 22 })],
            bullet: { level: 0 },
            spacing: { after: 60 },
          })
        );
      } else {
        // Standard body paragraph
        docxChildren.push(
          new Paragraph({
            children: [new TextRun({ text, size: 22 })],
            spacing: { after: 120, line: 276 },
          })
        );
      }
    }
  }

  if (docxChildren.length === 0) {
    docxChildren.push(
      new Paragraph({
        text: 'Document conversion completed. No extractable text detected in source document.',
      })
    );
  }

  onProgress?.(80, 'Compiling Open XML (.docx) package...');

  const docxDoc = new Document({
    creator: 'DocuNexa Free PDF Suite',
    description: 'Converted from PDF with paragraph & heading layout preservation',
    title: baseName,
    sections: [
      {
        properties: {},
        children: docxChildren,
      },
    ],
  });

  // Pack to arrayBuffer (browser-safe, does not require Node.js Buffer)
  const docxArrayBuffer = await Packer.toArrayBuffer(docxDoc);
  const outputBytes = new Uint8Array(docxArrayBuffer);

  // 4. STRICT VERIFICATION: Verify valid PK ZIP and word/document.xml
  onProgress?.(92, 'Verifying Word package structure...');
  if (outputBytes.length < 4 || outputBytes[0] !== 0x50 || outputBytes[1] !== 0x4b) {
    throw new Error('Word document generation failed: Missing PK ZIP header.');
  }

  try {
    const zip = await JSZip.loadAsync(outputBytes);
    if (!zip.file('word/document.xml')) {
      throw new Error('Word document verification failed: word/document.xml is missing from package.');
    }
  } catch (err: any) {
    throw new Error(`Word verification failed: ${err.message || err}`);
  }

  onProgress?.(100, 'Word conversion complete!');

  return {
    filename: `${baseName}.docx`,
    bytes: outputBytes,
    paragraphCount: totalParagraphs,
    headingsCount: totalHeadings,
  };
}
