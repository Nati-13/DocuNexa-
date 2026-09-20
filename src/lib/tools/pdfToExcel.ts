import { getPdfJs, getPdfJsDocumentParams } from '../pdfReader';
import { sanitizeDownloadFilename } from '../downloadContract';

export interface ExcelConversionResult {
  success: boolean;
  filename: string;
  bytes: Uint8Array | null;
  pagesProcessed: number;
  sheetCount: number; // Actual number of generated worksheets with extracted data
  rowCount: number;
  colCount: number;
  confidence: number; // 0 to 100 based on structural evidence
  isTableStructured: boolean;
  isScannedOnly: boolean;
  canDownload: boolean;
  previewRows: string[][]; // First 10 rows for in-browser preview table
  warnings: string[];
  message?: string;
  recommendedTool?: string;
}

/**
 * Converts PDF text and coordinate data into a genuine Microsoft Excel (.xlsx) workbook.
 * Employs repeated row/column alignment heuristics across consecutive rows to detect
 * authentic table grids and prevent false positives on narrative text.
 *
 * For entirely scanned/image-only documents:
 * - Does NOT generate a blank XLSX workbook.
 * - Returns success = false, bytes = null, canDownload = false, isScannedOnly = true.
 * - Emits explicit scanned warning and recommends OCR PDF first.
 *
 * For mixed documents:
 * - Exports extractable text pages into worksheets.
 * - Preserves warnings for scanned pages.
 * - Exposes XLSX download when useful extracted content exists.
 */
export async function convertPdfToExcel(
  pdfBuffer: ArrayBuffer,
  baseName: string,
  onProgress?: (percent: number, status: string) => void
): Promise<ExcelConversionResult> {
  onProgress?.(10, 'Initializing PDF parser for layout analysis...');

  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument(getPdfJsDocumentParams(pdfBuffer));
  const doc = await loadingTask.promise;
  const totalPages = doc.numPages;

  // Dynamically import SheetJS (XLSX)
  const xlsxModule = await import('xlsx');
  const XLSX = (xlsxModule as any).default || xlsxModule;
  const workbook = XLSX.utils.book_new();

  let totalRowsAcrossSheets = 0;
  let maxColsAcrossSheets = 1;
  let structuredPagesCount = 0;
  let pagesWithExtractedContent = 0;
  let totalConfidenceSum = 0;
  const allPreviewRows: string[][] = [];
  const warnings: string[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const pct = Math.round(15 + (pageNum / totalPages) * 60);
    onProgress?.(pct, `Analyzing layout and grid structure on page ${pageNum} of ${totalPages}...`);

    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const items = (content.items || []) as any[];

    // Filter valid text items that have coordinates
    const validItems: { text: string; x: number; y: number; width: number }[] = [];
    for (const it of items) {
      if (!it || typeof it.str !== 'string' || !it.transform || it.transform.length < 6) {
        continue;
      }
      const text = it.str.trim();
      if (!text) continue;
      const x = Math.round(it.transform[4] || 0);
      const y = Math.round(it.transform[5] || 0);
      const width = Math.round(it.width || 0);
      validItems.push({ text, x, y, width });
    }

    if (validItems.length === 0) {
      // Empty or scanned page: preserve specific warning without creating empty dummy sheets
      warnings.push(`Page ${pageNum}: No selectable text detected (may be scanned image or blank).`);
      continue;
    }

    pagesWithExtractedContent++;

    // 1. Group text items by Y-coordinate into horizontal row bands (tolerance: 6pt)
    const rowBuckets: { y: number; items: { x: number; text: string; width: number }[] }[] = [];
    const yTolerance = 6;

    for (const item of validItems) {
      let bucket = rowBuckets.find((b) => Math.abs(b.y - item.y) <= yTolerance);
      if (!bucket) {
        bucket = { y: item.y, items: [] };
        rowBuckets.push(bucket);
      }
      bucket.items.push(item);
    }

    // Sort rows top-to-bottom (higher Y to lower Y in PDF coordinate space)
    rowBuckets.sort((a, b) => b.y - a.y);

    // 2. Compute Column Grid & Structural Evidence
    const allXCoords: number[] = [];
    rowBuckets.forEach((r) => r.items.forEach((it) => allXCoords.push(it.x)));
    allXCoords.sort((a, b) => a - b);

    // Cluster X coordinates to find candidate column positions (tolerance: 15pt)
    const colClusters: number[] = [];
    for (const x of allXCoords) {
      const match = colClusters.find((c) => Math.abs(c - x) <= 15);
      if (!match) {
        colClusters.push(x);
      }
    }
    colClusters.sort((a, b) => a - b);

    // STRENGTHENED TABLE EVIDENCE:
    let multiItemRowsCount = 0;
    for (const row of rowBuckets) {
      if (row.items.length >= 2) {
        multiItemRowsCount++;
      }
    }

    const hasRepeatedColumnAlignment = colClusters.length >= 2 && multiItemRowsCount >= 3;
    let pageConfidence = 0;

    if (hasRepeatedColumnAlignment && rowBuckets.length > 0) {
      const alignmentRatio = multiItemRowsCount / rowBuckets.length;
      pageConfidence = Math.min(
        100,
        Math.round(alignmentRatio * 65 + Math.min(35, colClusters.length * 9))
      );
      structuredPagesCount++;
    } else {
      // Narrative text or unstructured layout
      pageConfidence = colClusters.length > 1 ? 25 : 10;
    }
    totalConfidenceSum += pageConfidence;

    // 3. Assemble 2D Cell Matrix (AOA)
    const aoa: string[][] = [];

    if (hasRepeatedColumnAlignment && colClusters.length > 1) {
      maxColsAcrossSheets = Math.max(maxColsAcrossSheets, colClusters.length);

      for (const row of rowBuckets) {
        row.items.sort((a, b) => a.x - b.x);
        const rowCells: string[] = new Array(colClusters.length).fill('');

        for (const it of row.items) {
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
      }
    } else {
      // Narrative layout: output as single-column lines
      for (const row of rowBuckets) {
        row.items.sort((a, b) => a.x - b.x);
        const lineText = row.items.map((i) => i.text).join(' ');
        if (lineText.trim()) {
          aoa.push([lineText]);
        }
      }
    }

    if (aoa.length > 0) {
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      if (hasRepeatedColumnAlignment && colClusters.length > 0) {
        ws['!cols'] = colClusters.map(() => ({ wch: 22 }));
      } else {
        ws['!cols'] = [{ wch: 85 }];
      }

      XLSX.utils.book_append_sheet(workbook, ws, `Page ${pageNum}`.slice(0, 31));
      totalRowsAcrossSheets += aoa.length;

      // Capture first 10 rows for live in-browser preview
      if (allPreviewRows.length < 10) {
        for (const r of aoa) {
          if (allPreviewRows.length < 10) {
            allPreviewRows.push(r);
          }
        }
      }
    }
  }

  // Entirely scanned/image-only document handling
  if (pagesWithExtractedContent === 0 || totalRowsAcrossSheets === 0) {
    warnings.push(
      'Document contains zero selectable text across all pages. Please run OCR PDF first to recognize tables and text before converting to Excel.'
    );

    return {
      success: false,
      filename: sanitizeDownloadFilename(baseName, 'xlsx'),
      bytes: null,
      pagesProcessed: totalPages,
      sheetCount: 0,
      rowCount: 0,
      colCount: 0,
      confidence: 0,
      isTableStructured: false,
      isScannedOnly: true,
      canDownload: false,
      previewRows: [],
      warnings,
      message:
        'This document contains zero selectable text across all pages. It appears to be an image-only or scanned PDF. A blank spreadsheet was not generated. Please run OCR PDF first to recognize text and tables.',
      recommendedTool: 'ocr-pdf',
    };
  }

  // Global confidence calculation
  const overallConfidence = totalPages > 0 ? Math.round(totalConfidenceSum / totalPages) : 0;
  const isTableStructured = structuredPagesCount > 0;

  if (!isTableStructured) {
    warnings.push('No regular multi-column table grid detected; content converted as text rows.');
  }

  onProgress?.(85, 'Compiling Open XML (.xlsx) workbook package...');
  const xlsxBytes = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  }) as ArrayBuffer;

  const outputBytes = new Uint8Array(xlsxBytes);

  // 4. STRICT VERIFICATION: Verify workbook with XLSX.read()
  onProgress?.(95, 'Verifying Excel workbook structure and worksheets...');
  try {
    const verifyWb = XLSX.read(outputBytes, { type: 'array' });
    if (!verifyWb.SheetNames || verifyWb.SheetNames.length === 0) {
      throw new Error('Generated workbook contains no worksheets.');
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
    success: true,
    filename: sanitizeDownloadFilename(baseName, 'xlsx'),
    bytes: outputBytes,
    pagesProcessed: totalPages,
    sheetCount: workbook.SheetNames.length, // Exactly equals number of worksheets generated with content
    rowCount: totalRowsAcrossSheets,
    colCount: maxColsAcrossSheets,
    confidence: overallConfidence,
    isTableStructured,
    isScannedOnly: false,
    canDownload: true,
    previewRows: allPreviewRows,
    warnings,
  };
}
