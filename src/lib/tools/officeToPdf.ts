import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

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
  const XLSX = await import('xlsx');
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
 * Reconstructs Word document content (.docx) into a clean PDF document.
 */
export async function convertWordToPdf(
  docxBuffer: ArrayBuffer,
  baseName: string
): Promise<OfficeConversionResult> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ arrayBuffer: docxBuffer.slice(0) });
  const rawText = result.value || '';

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const linesPerPage = 38;
  const totalPages = Math.max(1, Math.ceil(lines.length / linesPerPage));

  for (let p = 0; p < totalPages; p++) {
    const page = doc.addPage([595, 842]); // Portrait A4
    const slice = lines.slice(p * linesPerPage, (p + 1) * linesPerPage);

    // Header
    page.drawText(`${baseName}`, {
      x: 50,
      y: 800,
      size: 11,
      font: boldFont,
      color: rgb(0.2, 0.3, 0.5),
    });

    let yPos = 765;
    for (const line of slice) {
      const isHeading = line.length < 60 && (/^(chapter|unit|section)\b/i.test(line) || (line === line.toUpperCase() && line.length > 4));
      page.drawText(line.slice(0, 85), {
        x: 50,
        y: yPos,
        size: isHeading ? 13 : 10,
        font: isHeading ? boldFont : font,
        color: isHeading ? rgb(0.1, 0.15, 0.3) : rgb(0.15, 0.15, 0.15),
      });
      yPos -= isHeading ? 22 : 18;
    }
  }

  const outputBytes = await doc.save();
  return {
    filename: `${baseName}.pdf`,
    bytes: outputBytes,
    pageCount: doc.getPageCount(),
    disclaimer: 'Content reconstructed from Word manuscript. Formatting may differ from original.',
  };
}

/**
 * Reconstructs PowerPoint presentation slides (.pptx) into a PDF slide deck.
 */
export async function convertPowerPointToPdf(
  pptxBuffer: ArrayBuffer,
  baseName: string
): Promise<OfficeConversionResult> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(pptxBuffer.slice(0));

  // Find slide XML files in ppt/slides/
  const slideFiles = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)![0], 10);
    const numB = parseInt(b.match(/\d+/)![0], 10);
    return numA - numB;
  });

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  if (slideFiles.length === 0) {
    const page = doc.addPage([960, 540]);
    page.drawText('Presentation slide data could not be parsed.', { x: 50, y: 300, size: 16, font });
  }

  for (let idx = 0; idx < slideFiles.length; idx++) {
    const slideXml = await zip.files[slideFiles[idx]].async('string');
    // Extract text elements from <a:t>...</a:t>
    const textMatches = slideXml.match(/<a:t>([^<]+)<\/a:t>/g) || [];
    const slideTexts = textMatches.map((m) => m.replace(/<\/?a:t>/g, '').trim()).filter((t) => t.length > 0);

    const page = doc.addPage([960, 540]); // 16:9 widescreen presentation

    // Slide background
    page.drawRectangle({
      x: 0,
      y: 0,
      width: 960,
      height: 540,
      color: rgb(0.98, 0.98, 0.99),
    });

    // Slide title
    const titleText = slideTexts[0] || `Slide ${idx + 1}`;
    page.drawText(titleText.slice(0, 60), {
      x: 60,
      y: 470,
      size: 24,
      font: boldFont,
      color: rgb(0.1, 0.2, 0.4),
    });

    // Slide body text
    let yPos = 410;
    for (let tIdx = 1; tIdx < Math.min(slideTexts.length, 8); tIdx++) {
      page.drawText(`• ${slideTexts[tIdx].slice(0, 90)}`, {
        x: 70,
        y: yPos,
        size: 14,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
      yPos -= 32;
    }

    // Slide footer
    page.drawText(`${baseName} — Slide ${idx + 1} of ${slideFiles.length}`, {
      x: 60,
      y: 35,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  const outputBytes = await doc.save();
  return {
    filename: `${baseName}.pdf`,
    bytes: outputBytes,
    pageCount: doc.getPageCount(),
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
