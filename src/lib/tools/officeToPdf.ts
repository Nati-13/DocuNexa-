import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import JSZip from 'jszip';

export interface OfficeConversionResult {
  filename: string;
  bytes: Uint8Array;
  pageCount: number;
  disclaimer: string;
}

/**
 * Reconstructs spreadsheet data (.xlsx, .csv) into paginated PDF tables.
 */
export async function convertExcelToPdf(
  excelBuffer: ArrayBuffer,
  baseName: string
): Promise<OfficeConversionResult> {
  const xlsxModule = await import('xlsx');
  const XLSX = (xlsxModule as any).default || xlsxModule;
  const wb = XLSX.read(excelBuffer, { type: 'array' });
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const sheetNames = wb.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('Spreadsheet contains no sheets.');
  }

  for (const name of sheetNames) {
    const ws = wb.Sheets[name];
    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

    if (!data || data.length === 0) continue;

    // Paginate table rows (approx 28 rows per page in landscape 842x595)
    const rowsPerPage = 26;
    const totalPages = Math.ceil(data.length / rowsPerPage);

    for (let p = 0; p < totalPages; p++) {
      const page = doc.addPage([842, 595]); // Landscape A4
      const slice = data.slice(p * rowsPerPage, (p + 1) * rowsPerPage);

      // Title
      page.drawText(`${baseName} — Sheet: ${name} (Page ${p + 1}/${totalPages})`, {
        x: 40,
        y: 560,
        size: 13,
        font: boldFont,
        color: rgb(0.1, 0.2, 0.4),
      });

      let yPos = 530;
      for (let rIdx = 0; rIdx < slice.length; rIdx++) {
        const row = slice[rIdx];
        const isHeader = p === 0 && rIdx === 0;

        // Draw light row background for header
        if (isHeader) {
          page.drawRectangle({
            x: 35,
            y: yPos - 5,
            width: 772,
            height: 20,
            color: rgb(0.92, 0.94, 0.98),
          });
        }

        // Draw up to 8 columns
        const colWidth = 95;
        for (let cIdx = 0; cIdx < Math.min(row.length, 8); cIdx++) {
          const cellVal = String(row[cIdx] !== undefined && row[cIdx] !== null ? row[cIdx] : '').slice(0, 18);
          page.drawText(cellVal, {
            x: 40 + cIdx * colWidth,
            y: yPos,
            size: isHeader ? 10 : 9,
            font: isHeader ? boldFont : font,
            color: isHeader ? rgb(0.1, 0.15, 0.3) : rgb(0.15, 0.15, 0.15),
          });
        }

        // Draw row separator line
        page.drawLine({
          start: { x: 35, y: yPos - 5 },
          end: { x: 807, y: yPos - 5 },
          thickness: 0.5,
          color: rgb(0.85, 0.85, 0.88),
        });

        yPos -= 19;
      }
    }
  }

  if (doc.getPageCount() === 0) {
    const page = doc.addPage([842, 595]);
    page.drawText('Spreadsheet document contains no readable data.', {
      x: 50,
      y: 500,
      size: 14,
      font,
    });
  }

  const outputBytes = await doc.save();
  return {
    filename: `${baseName}.pdf`,
    bytes: outputBytes,
    pageCount: doc.getPageCount(),
    disclaimer: 'Table layout reconstructed from spreadsheet data.',
  };
}

/**
/**
 * Sanitizes XML-escaped text and normalizes unicode characters to standard WinAnsi range.
 */
function sanitizeOfficeText(raw: string): string {
  if (!raw) return '';
  const unescaped = raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '•')
    .replace(/\u00A0/g, ' ');

  // Keep printable ASCII and Latin-1 supplement (0x20 - 0xFF)
  return unescaped.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Splits text into lines that do not exceed maxChars, breaking on words where possible.
 */
function wrapText(text: string, maxChars = 80): string[] {
  if (!text || text.length <= maxChars) return [text];
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const w of words) {
    if ((current + ' ' + w).trim().length <= maxChars) {
      current = (current + ' ' + w).trim();
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Reconstructs Word document content (.docx) into a clean, genuine PDF document.
 * Parses OpenXML word/document.xml directly with JSZip, extracting headings,
 * body paragraphs, and table rows without Node-only dependencies.
 */
export async function convertWordToPdf(
  docxBuffer: ArrayBuffer,
  baseName: string
): Promise<OfficeConversionResult> {
  if (!docxBuffer || docxBuffer.byteLength === 0) {
    throw new Error('Word document buffer is empty (0 bytes).');
  }

  const u8 = new Uint8Array(docxBuffer);
  if (u8.length >= 4 && u8[0] === 0xd0 && u8[1] === 0xcf && u8[2] === 0x11 && u8[3] === 0xe0) {
    throw new Error(
      'Legacy binary Word (.doc) format is not supported for client-side extraction. Please save or convert your document to modern OpenXML Word (.docx) format.'
    );
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(docxBuffer.slice(0));
  } catch (err: any) {
    throw new Error(`Invalid Word document: File is not a valid ZIP/DOCX package: ${err.message || err}`);
  }

  const docXmlFile = zip.files['word/document.xml'];
  if (!docXmlFile) {
    throw new Error('Invalid Word document: word/document.xml is missing from package.');
  }

  const docXml = await docXmlFile.async('string');

  // Extract structured paragraph blocks
  const pMatches = docXml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || [];
  const parsedItems: { text: string; isHeading: boolean; isBullet: boolean }[] = [];

  for (const pXml of pMatches) {
    const tMatches = pXml.match(/<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g) || [];
    const fullText = tMatches
      .map((t) => t.replace(/<[^>]+>/g, ''))
      .join('')
      .trim();

    const sanitized = sanitizeOfficeText(fullText);
    if (!sanitized) continue;

    const isHeading =
      /w:pStyle\s+w:val=\"Heading[1-4]\"/i.test(pXml) ||
      (sanitized.length < 70 && /^(unit|chapter|lesson|section|part|module)\b/i.test(sanitized)) ||
      (sanitized === sanitized.toUpperCase() && sanitized.length > 3 && sanitized.length < 50);

    const isBullet =
      /w:numPr/i.test(pXml) ||
      sanitized.startsWith('•') ||
      sanitized.startsWith('-') ||
      /^\d+[\.\)]\s/.test(sanitized);

    parsedItems.push({ text: sanitized, isHeading, isBullet });
  }

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  if (parsedItems.length === 0) {
    const emptyPage = doc.addPage([595, 842]);
    emptyPage.drawText('Word document contains no extractable text paragraphs.', {
      x: 50,
      y: 750,
      size: 14,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  } else {
    // Paginate items with word wrapping
    const linesPerPage = 38;
    const flattenedLines: { text: string; isHeading: boolean; isBullet: boolean }[] = [];

    for (const item of parsedItems) {
      const wrapped = wrapText(item.text, item.isHeading ? 65 : 82);
      wrapped.forEach((line, idx) => {
        flattenedLines.push({
          text: line,
          isHeading: item.isHeading && idx === 0,
          isBullet: item.isBullet && idx === 0,
        });
      });
    }

    const totalPages = Math.max(1, Math.ceil(flattenedLines.length / linesPerPage));

    for (let p = 0; p < totalPages; p++) {
      const page = doc.addPage([595, 842]); // Portrait A4
      const slice = flattenedLines.slice(p * linesPerPage, (p + 1) * linesPerPage);

      // Header rule & document title
      page.drawText(sanitizeOfficeText(baseName).slice(0, 60), {
        x: 50,
        y: 800,
        size: 10,
        font: boldFont,
        color: rgb(0.2, 0.3, 0.5),
      });
      page.drawLine({
        start: { x: 50, y: 792 },
        end: { x: 545, y: 792 },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.9),
      });

      let yPos = 765;
      for (const lineObj of slice) {
        if (lineObj.isHeading) {
          yPos -= 6;
          page.drawText(lineObj.text, {
            x: 50,
            y: yPos,
            size: 13,
            font: boldFont,
            color: rgb(0.1, 0.15, 0.35),
          });
          yPos -= 20;
        } else {
          const xOffset = lineObj.isBullet ? 62 : 50;
          if (lineObj.isBullet && !lineObj.text.startsWith('•') && !/^\d+[\.\)]/.test(lineObj.text)) {
            page.drawText('•', { x: 52, y: yPos, size: 10, font: boldFont, color: rgb(0.3, 0.3, 0.3) });
          }
          page.drawText(lineObj.text, {
            x: xOffset,
            y: yPos,
            size: 10,
            font,
            color: rgb(0.15, 0.15, 0.15),
          });
          yPos -= 16;
        }
      }

      // Page footer
      page.drawText(`Page ${p + 1} of ${totalPages}`, {
        x: 260,
        y: 35,
        size: 9,
        font,
        color: rgb(0.55, 0.55, 0.55),
      });
    }
  }

  const outputBytes = await doc.save();
  const verifyDoc = await PDFDocument.load(outputBytes);
  if (verifyDoc.getPageCount() === 0) {
    throw new Error('Word conversion verification failed: Output PDF contains 0 pages.');
  }

  return {
    filename: `${baseName}.pdf`,
    bytes: outputBytes,
    pageCount: verifyDoc.getPageCount(),
    disclaimer: 'Content faithfully reconstructed from Word OpenXML manuscript.',
  };
}

/**
 * Reconstructs PowerPoint presentation slides (.pptx) into a PDF slide deck.
 * Parses slide XML files and extracts slide titles and bullet points into
 * 16:9 widescreen presentation slides with clean formatting.
 */
export async function convertPowerPointToPdf(
  pptxBuffer: ArrayBuffer,
  baseName: string
): Promise<OfficeConversionResult> {
  if (!pptxBuffer || pptxBuffer.byteLength === 0) {
    throw new Error('PowerPoint presentation buffer is empty (0 bytes).');
  }

  const u8 = new Uint8Array(pptxBuffer);
  if (u8.length >= 4 && u8[0] === 0xd0 && u8[1] === 0xcf && u8[2] === 0x11 && u8[3] === 0xe0) {
    throw new Error(
      'Legacy binary PowerPoint (.ppt) format is not supported for client-side extraction. Please save or convert your presentation to modern OpenXML PowerPoint (.pptx) format.'
    );
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(pptxBuffer.slice(0));
  } catch (err: any) {
    throw new Error(`Invalid PowerPoint document: File is not a valid ZIP/PPTX package: ${err.message || err}`);
  }

  // Find slide XML files in ppt/slides/
  const slideFiles = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)![0], 10);
    const numB = parseInt(b.match(/\d+/)![0], 10);
    return numA - numB;
  });

  if (slideFiles.length === 0) {
    throw new Error('Invalid PowerPoint document: Presentation package contains 0 slide XML files.');
  }

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  for (let idx = 0; idx < slideFiles.length; idx++) {
    const slideXml = await zip.files[slideFiles[idx]].async('string');

    // Extract all paragraphs in this slide: <a:p>...</a:p>
    const pMatches = slideXml.match(/<a:p[\s>][\s\S]*?<\/a:p>/g) || [];
    const paragraphs: string[] = [];

    for (const pXml of pMatches) {
      const tMatches = pXml.match(/<a:t(?:\s+[^>]*)?>([\s\S]*?)<\/a:t>/g) || [];
      const text = tMatches.map((t) => t.replace(/<[^>]+>/g, '')).join('').trim();
      const sanitized = sanitizeOfficeText(text);
      if (sanitized.length > 0) {
        paragraphs.push(sanitized);
      }
    }

    let currentPage = doc.addPage([960, 540]); // 16:9 widescreen presentation

    // Elegant background with subtle top accent header
    currentPage.drawRectangle({
      x: 0,
      y: 0,
      width: 960,
      height: 540,
      color: rgb(0.98, 0.98, 0.99),
    });
    currentPage.drawRectangle({
      x: 0,
      y: 535,
      width: 960,
      height: 5,
      color: rgb(0.2, 0.45, 0.85),
    });

    // Slide title
    const titleText = paragraphs[0] || `Slide ${idx + 1}`;
    currentPage.drawText(titleText.slice(0, 65), {
      x: 60,
      y: 470,
      size: 22,
      font: boldFont,
      color: rgb(0.08, 0.16, 0.35),
    });
    currentPage.drawLine({
      start: { x: 60, y: 455 },
      end: { x: 900, y: 455 },
      thickness: 1,
      color: rgb(0.85, 0.88, 0.93),
    });

    // Slide body paragraphs / bullet points
    const bodyItems = paragraphs.slice(1);
    let yPos = 410;
    const fontSize = bodyItems.length > 8 ? 11 : 13;
    const lineSpacing = bodyItems.length > 8 ? 18 : 22;

    for (let bIdx = 0; bIdx < bodyItems.length; bIdx++) {
      const rawItem = bodyItems[bIdx];
      const wrapped = wrapText(rawItem, bodyItems.length > 8 ? 96 : 88);

      if (yPos - wrapped.length * lineSpacing < 55) {
        // Slide continuation
        currentPage = doc.addPage([960, 540]);
        currentPage.drawRectangle({
          x: 0,
          y: 0,
          width: 960,
          height: 540,
          color: rgb(0.98, 0.98, 0.99),
        });
        currentPage.drawRectangle({
          x: 0,
          y: 535,
          width: 960,
          height: 5,
          color: rgb(0.2, 0.45, 0.85),
        });
        currentPage.drawText(`${titleText.slice(0, 55)} (Cont.)`, {
          x: 60,
          y: 470,
          size: 20,
          font: boldFont,
          color: rgb(0.08, 0.16, 0.35),
        });
        currentPage.drawLine({
          start: { x: 60, y: 455 },
          end: { x: 900, y: 455 },
          thickness: 1,
          color: rgb(0.85, 0.88, 0.93),
        });
        yPos = 410;
      }

      for (let wIdx = 0; wIdx < wrapped.length; wIdx++) {
        const line = wrapped[wIdx];
        if (wIdx === 0) {
          currentPage.drawText('•', {
            x: 65,
            y: yPos,
            size: fontSize,
            font: boldFont,
            color: rgb(0.2, 0.45, 0.85),
          });
          currentPage.drawText(line, {
            x: 82,
            y: yPos,
            size: fontSize,
            font,
            color: rgb(0.18, 0.18, 0.18),
          });
        } else {
          currentPage.drawText(line, {
            x: 82,
            y: yPos,
            size: fontSize,
            font,
            color: rgb(0.18, 0.18, 0.18),
          });
        }
        yPos -= lineSpacing;
      }
      yPos -= 6;
    }

    // Slide footer
    currentPage.drawText(`${sanitizeOfficeText(baseName)} • Slide ${idx + 1} of ${slideFiles.length}`, {
      x: 60,
      y: 35,
      size: 10,
      font,
      color: rgb(0.5, 0.55, 0.6),
    });
  }

  const outputBytes = await doc.save();
  const verifyDoc = await PDFDocument.load(outputBytes);
  if (verifyDoc.getPageCount() === 0) {
    throw new Error('PowerPoint conversion verification failed: Resulting PDF contains 0 pages.');
  }

  return {
    filename: `${baseName}.pdf`,
    bytes: outputBytes,
    pageCount: verifyDoc.getPageCount(),
    disclaimer: 'Slide deck reconstructed from PowerPoint structure. Visual elements may vary.',
  };
}

/**
 * Reconstructs HTML markup into a clean PDF document.
 */
export async function convertHtmlToPdf(
  htmlInput: string | ArrayBuffer,
  baseName: string
): Promise<OfficeConversionResult> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const htmlText = typeof htmlInput === 'string' ? htmlInput : new TextDecoder().decode(htmlInput);

  // Strip HTML tags for readable text stream
  const cleanLines = htmlText
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?[^>]+(>|$)/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const linesPerPage = 38;
  const totalPages = Math.max(1, Math.ceil(cleanLines.length / linesPerPage));

  for (let p = 0; p < totalPages; p++) {
    const page = doc.addPage([595, 842]);
    const slice = cleanLines.slice(p * linesPerPage, (p + 1) * linesPerPage);

    page.drawText(`${baseName} (HTML Document)`, {
      x: 50,
      y: 800,
      size: 12,
      font: boldFont,
      color: rgb(0.2, 0.3, 0.5),
    });

    let yPos = 765;
    for (const line of slice) {
      page.drawText(line.slice(0, 85), {
        x: 50,
        y: yPos,
        size: 10,
        font,
        color: rgb(0.15, 0.15, 0.15),
      });
      yPos -= 18;
    }
  }

  const outputBytes = await doc.save();
  return {
    filename: `${baseName}.pdf`,
    bytes: outputBytes,
    pageCount: doc.getPageCount(),
    disclaimer: 'HTML document rendered into structured printable PDF.',
  };
}
