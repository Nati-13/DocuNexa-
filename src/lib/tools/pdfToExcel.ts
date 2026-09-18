import { getPdfJs } from '../pdfReader';

export interface ExcelConversionResult {
  filename: string;
  bytes: Uint8Array;
  sheetCount: number;
  rowCount: number;
  isTableStructured: boolean;
}

/**
 * Converts PDF text and coordinate data into a genuine Microsoft Excel (.xlsx) workbook.
 * Groups text items by Y-coordinates into rows and X-coordinates into columns.
 */
export async function convertPdfToExcel(
  pdfBuffer: ArrayBuffer,
  baseName: string,
  onProgress?: (percent: number, status: string) => void
): Promise<ExcelConversionResult> {
  onProgress?.(10, 'Initializing PDF parser...');

  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer.slice(0)),
    disableWorker: typeof window === 'undefined',
  });
  const doc = await loadingTask.promise;
  const totalPages = doc.numPages;

  // Import SheetJS
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  let totalRowsAcrossSheets = 0;
  let detectedTablesCount = 0;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const pct = Math.round(15 + (pageNum / totalPages) * 60);
    onProgress?.(pct, `Extracting layout & cells from page ${pageNum} of ${totalPages}...`);

    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const items = content.items as any[];

    if (!items || items.length === 0) {
      // Empty page
      const ws = XLSX.utils.aoa_to_sheet([['[Blank Page]']]);
      XLSX.utils.book_append_sheet(workbook, ws, `Page ${pageNum}`);
      continue;
    }

    // 1. Group text items by Y-coordinate (within 6 points tolerance) into rows
    // PDF coordinates start from bottom-left (Y increases upwards)
    const rowBuckets: { y: number; items: { x: number; text: string; width: number }[] }[] = [];
    const yTolerance = 6;

    for (const it of items) {
      const text = (it.str || '').trim();
      if (!text) continue;
      const x = Math.round(it.transform[4] || 0);
      const y = Math.round(it.transform[5] || 0);
      const width = Math.round(it.width || 0);

      let bucket = rowBuckets.find((b) => Math.abs(b.y - y) <= yTolerance);
      if (!bucket) {
        bucket = { y, items: [] };
        rowBuckets.push(bucket);
      }
      bucket.items.push({ x, text, width });
    }

    // Sort rows top-to-bottom (higher Y to lower Y)
    rowBuckets.sort((a, b) => b.y - a.y);

    // 2. Discover column boundaries for this page
    const allXCoords: number[] = [];
    rowBuckets.forEach((r) => r.items.forEach((it) => allXCoords.push(it.x)));
    allXCoords.sort((a, b) => a - b);

    // Cluster X coordinates to identify column gridlines (within 20pt)
    const colClusters: number[] = [];
    for (const x of allXCoords) {
      const match = colClusters.find((c) => Math.abs(c - x) <= 20);
      if (!match) {
        colClusters.push(x);
      }
    }
    colClusters.sort((a, b) => a - b);

    const isMultiColumn = colClusters.length >= 2;
    if (isMultiColumn) detectedTablesCount++;

    // 3. Assemble 2D array of cells (AOA)
    const aoa: any[][] = [];
    for (const row of rowBuckets) {
      // Sort items in this row from left to right
      row.items.sort((a, b) => a.x - b.x);

      if (isMultiColumn && colClusters.length > 1) {
        // Table layout: place items into discrete column slots
        const rowCells: string[] = new Array(colClusters.length).fill('');
        for (const it of row.items) {
          // Find closest column index
          let closestColIdx = 0;
          let minDiff = Infinity;
          colClusters.forEach((c, idx) => {
            const diff = Math.abs(c - it.x);
            if (diff < minDiff) {
              minDiff = diff;
              closestColIdx = idx;
            }
          });
          rowCells[closestColIdx] = rowCells[closestColIdx]
            ? `${rowCells[closestColIdx]} ${it.text}`
            : it.text;
        }
        aoa.push(rowCells);
      } else {
        // Narrative / sequential text layout
        const lineText = row.items.map((i) => i.text).join(' ');
        aoa.push([lineText]);
      }
    }

    // Build worksheet
    const ws = XLSX.utils.aoa_to_sheet(aoa.length > 0 ? aoa : [['[Empty page]']]);
    
    // Set reasonable column widths
    const colWidths = colClusters.map(() => ({ wch: 22 }));
    if (colWidths.length > 0) {
      ws['!cols'] = colWidths;
    }

    XLSX.utils.book_append_sheet(workbook, ws, `Page ${pageNum}`.slice(0, 31));
    totalRowsAcrossSheets += aoa.length;
  }

  onProgress?.(85, 'Generating .xlsx Open XML workbook package...');
  const xlsxBytes = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  }) as ArrayBuffer;

  const outputBytes = new Uint8Array(xlsxBytes);

  // 4. STRICT OUTPUT VERIFICATION
  onProgress?.(95, 'Verifying Excel workbook integrity...');
  try {
    const verifyWb = XLSX.read(outputBytes, { type: 'array' });
    if (!verifyWb.SheetNames || verifyWb.SheetNames.length === 0) {
      throw new Error('Generated workbook contains no sheets.');
    }
    const firstSheet = verifyWb.Sheets[verifyWb.SheetNames[0]];
    if (!firstSheet || Object.keys(firstSheet).length === 0) {
      throw new Error('First worksheet in workbook is empty or invalid.');
    }
  } catch (err: any) {
    throw new Error(`Excel verification failed: ${err.message || err}`);
  }

  onProgress?.(100, 'Excel conversion complete!');

  return {
    filename: `${baseName}.xlsx`,
    bytes: outputBytes,
    sheetCount: totalPages,
    rowCount: totalRowsAcrossSheets,
    isTableStructured: detectedTablesCount > 0,
  };
}
