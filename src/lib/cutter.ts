import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { DetectedPart, CutProgressItem, CutProgressState } from '@/types';
import { sanitizeFilename } from './validator';

/**
 * Extracts a specific range of pages (1-indexed, inclusive) into a new PDFDocument bytes
 */
export async function extractPdfRange(
  sourceBytes: ArrayBuffer,
  startPage: number,
  endPage: number
): Promise<Uint8Array> {
  if (!sourceBytes || sourceBytes.byteLength === 0) {
    throw new Error('Cannot extract pages: PDF buffer is empty or detached.');
  }
  const safeBytes = sourceBytes.slice(0);
  const srcDoc = await PDFDocument.load(safeBytes);
  const subDoc = await PDFDocument.create();

  const totalPages = srcDoc.getPageCount();
  const safeStart = Math.max(1, Math.min(startPage, totalPages));
  const safeEnd = Math.max(safeStart, Math.min(endPage, totalPages));

  // Convert 1-indexed range to 0-indexed indices array
  const pageIndices: number[] = [];
  for (let p = safeStart; p <= safeEnd; p++) {
    pageIndices.push(p - 1);
  }

  const copiedPages = await subDoc.copyPages(srcDoc, pageIndices);
  copiedPages.forEach((page) => subDoc.addPage(page));

  return await subDoc.save();
}

/**
 * Triggers a native browser file download for a Uint8Array or Blob
 */
export function downloadFile(bytes: Uint8Array | Blob, filename: string): void {
  let mimeType = 'application/octet-stream';
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) mimeType = 'application/pdf';
  else if (lower.endsWith('.xlsx')) mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  else if (lower.endsWith('.docx')) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  else if (lower.endsWith('.pptx')) mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  else if (lower.endsWith('.zip')) mimeType = 'application/zip';
  else if (lower.endsWith('.md')) mimeType = 'text/markdown;charset=utf-8';
  else if (lower.endsWith('.txt')) mimeType = 'text/plain;charset=utf-8';
  else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mimeType = 'image/jpeg';
  else if (lower.endsWith('.png')) mimeType = 'image/png';

  const blob = bytes instanceof Blob ? bytes : new Blob([bytes as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = sanitizeFilename(filename);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generates a ZIP archive containing all generated PDF files
 */
export async function createZipBundle(
  items: Array<{ filename: string; bytes: Uint8Array }>
): Promise<Blob> {
  const zip = new JSZip();

  items.forEach((item) => {
    zip.file(sanitizeFilename(item.filename), item.bytes);
  });

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

/**
 * Checks whether the browser supports the File System Access API
 */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Saves generated files directly to a folder chosen by the user via File System Access API
 */
export async function saveFilesToDirectory(
  items: Array<{ filename: string; bytes: Uint8Array }>,
  promptConflictAction: (filename: string) => Promise<'replace' | 'rename' | 'cancel'>
): Promise<{ savedCount: number; errors: string[] }> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API is not supported in this browser.');
  }

  const dirHandle = await (window as any).showDirectoryPicker({
    mode: 'readwrite',
  });

  let savedCount = 0;
  const errors: string[] = [];

  for (const item of items) {
    let targetName = sanitizeFilename(item.filename);

    // Check if file already exists
    let fileExists = false;
    try {
      await dirHandle.getFileHandle(targetName);
      fileExists = true;
    } catch {
      fileExists = false;
    }

    if (fileExists) {
      const action = await promptConflictAction(targetName);
      if (action === 'cancel') {
        continue; // Skip this file
      } else if (action === 'rename') {
        // Find an unused name e.g. "Unit 1 (1).pdf"
        let counter = 1;
        const nameWithoutExt = targetName.replace(/\.pdf$/i, '');
        while (fileExists && counter < 50) {
          targetName = `${nameWithoutExt} (${counter}).pdf`;
          try {
            await dirHandle.getFileHandle(targetName);
            counter++;
          } catch {
            fileExists = false;
          }
        }
      }
      // If 'replace', we proceed to overwrite with create: true
    }

    try {
      const fileHandle = await dirHandle.getFileHandle(targetName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(item.bytes);
      await writable.close();
      savedCount++;
    } catch (err: any) {
      errors.push(`Failed to save ${targetName}: ${err.message || err}`);
    }
  }

  return { savedCount, errors };
}

/**
 * Slices all parts with responsive asynchronous progress updates
 */
export async function executeCutPlan(
  sourceBytes: ArrayBuffer,
  parts: DetectedPart[],
  onProgress: (state: CutProgressState) => void,
  shouldCancel: () => boolean = () => false
): Promise<CutProgressItem[]> {
  const items: CutProgressItem[] = parts.map((part) => ({
    id: part.id,
    title: part.title,
    filename: part.filename,
    status: 'waiting',
    progress: 0,
  }));

  const state: CutProgressState = {
    isCutting: true,
    currentIndex: 0,
    total: items.length,
    items,
    completedCount: 0,
    isCancelled: false,
  };

  onProgress({ ...state });

  // Load the source PDF once to avoid re-parsing on every part
  if (!sourceBytes || sourceBytes.byteLength === 0) {
    throw new Error('Cannot execute cut: PDF buffer is empty or detached.');
  }
  const safeBytes = sourceBytes.slice(0);
  const srcDoc = await PDFDocument.load(safeBytes);
  const totalPages = srcDoc.getPageCount();

  for (let i = 0; i < parts.length; i++) {
    if (shouldCancel()) {
      state.isCancelled = true;
      state.isCutting = false;
      onProgress({ ...state });
      break;
    }

    state.currentIndex = i;
    items[i].status = 'processing';
    items[i].progress = 25;
    onProgress({ ...state, items: [...items] });

    // Yield control to UI thread
    await new Promise((r) => setTimeout(r, 15));

    try {
      const part = parts[i];
      const safeStart = Math.max(1, Math.min(part.startPage, totalPages));
      const safeEnd = Math.max(safeStart, Math.min(part.endPage, totalPages));

      const pageIndices: number[] = [];
      for (let p = safeStart; p <= safeEnd; p++) {
        pageIndices.push(p - 1);
      }

      items[i].progress = 50;
      onProgress({ ...state, items: [...items] });
      await new Promise((r) => setTimeout(r, 10));

      const subDoc = await PDFDocument.create();
      const copiedPages = await subDoc.copyPages(srcDoc, pageIndices);
      copiedPages.forEach((page) => subDoc.addPage(page));

      items[i].progress = 85;
      onProgress({ ...state, items: [...items] });
      await new Promise((r) => setTimeout(r, 10));

      const pdfBytes = await subDoc.save();

      items[i].bytes = pdfBytes;
      items[i].status = 'done';
      items[i].progress = 100;
      state.completedCount++;
      onProgress({ ...state, items: [...items] });
    } catch (err: any) {
      items[i].status = 'error';
      items[i].error = err.message || 'Error creating PDF slice';
      onProgress({ ...state, items: [...items] });
    }

    // Yield to allow UI rendering
    await new Promise((r) => setTimeout(r, 15));
  }

  state.isCutting = false;
  onProgress({ ...state, items: [...items] });

  return items;
}
