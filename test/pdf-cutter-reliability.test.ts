import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { sanitizePageRange, validateParts } from '../src/lib/validator';
import {
  executeCutPlan,
  createZipBundle,
  isFileSystemAccessSupported,
  saveFilesToDirectory,
} from '../src/lib/cutter';
import { inspectPdfDocument } from '../src/lib/pdfReader';
import { DetectedPart, CutProgressState } from '../src/types';

describe('PDF Unit Cutter Reliability Improvements', () => {
  // Helper to create a minimal valid multi-page PDF
  async function createTestPdf(pageCount: number): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    for (let i = 0; i < pageCount; i++) {
      const page = doc.addPage([400, 600]);
      page.drawText(`Page ${i + 1}`);
    }
    return await doc.save();
  }

  // =========================================================================
  // 1. RELIABLE CANCELLATION
  // =========================================================================
  describe('1. Reliable Cancellation', () => {
    it('halts processing immediately when cancellation is requested on a multi-part document', async () => {
      const pdfBytes = await createTestPdf(10);
      const parts: DetectedPart[] = [
        { id: '1', title: 'Part 1', startPage: 1, endPage: 2, filename: 'Part 1.pdf', confidence: 'High', source: 'manual' },
        { id: '2', title: 'Part 2', startPage: 3, endPage: 5, filename: 'Part 2.pdf', confidence: 'High', source: 'manual' },
        { id: '3', title: 'Part 3', startPage: 6, endPage: 8, filename: 'Part 3.pdf', confidence: 'High', source: 'manual' },
        { id: '4', title: 'Part 4', startPage: 9, endPage: 10, filename: 'Part 4.pdf', confidence: 'High', source: 'manual' },
      ];

      let isCancelled = false;
      const progressUpdates: CutProgressState[] = [];

      const result = await executeCutPlan(
        pdfBytes,
        parts,
        (state) => {
          progressUpdates.push(JSON.parse(JSON.stringify(state)));
          // Simulate user clicking Cancel after Part 1 completes
          if (state.completedCount === 1) {
            isCancelled = true;
          }
        },
        () => isCancelled,
        { isUncertain: false, isConfirmed: true }
      );

      // Verify that cancellation was detected and execution halted
      assert.strictEqual(isCancelled, true, 'Cancellation flag should be set');
      const finalState = progressUpdates[progressUpdates.length - 1];
      assert.strictEqual(finalState.isCancelled, true, 'Final state must have isCancelled = true');
      assert.strictEqual(finalState.isCutting, false, 'Final state must have isCutting = false');

      // Verify completed count is exactly 1 (Part 1 completed, Parts 2-4 did not complete)
      assert.strictEqual(finalState.completedCount, 1, 'Only Part 1 should be completed');

      // Verify Part 1 has done status with bytes, and remaining parts are marked cancelled
      assert.strictEqual(result[0].status, 'done', 'Part 1 should be done');
      assert.ok(result[0].bytes && result[0].bytes.byteLength > 0, 'Part 1 must have valid PDF bytes');

      // Remaining items must not be marked as done
      for (let i = 1; i < result.length; i++) {
        assert.notStrictEqual(result[i].status, 'done', `Part ${i + 1} must not be marked done`);
        assert.strictEqual(result[i].status, 'error', `Part ${i + 1} must be marked as error/cancelled`);
        assert.ok(result[i].error?.includes('Cancelled'), `Part ${i + 1} error must specify cancellation`);
      }
    });

    it('handles cancellation before any part begins processing', async () => {
      const pdfBytes = await createTestPdf(6);
      const parts: DetectedPart[] = [
        { id: '1', title: 'Part 1', startPage: 1, endPage: 3, filename: 'Part 1.pdf', confidence: 'High', source: 'manual' },
        { id: '2', title: 'Part 2', startPage: 4, endPage: 6, filename: 'Part 2.pdf', confidence: 'High', source: 'manual' },
      ];

      const result = await executeCutPlan(
        pdfBytes,
        parts,
        () => {},
        () => true, // Already cancelled before start
        { isUncertain: false, isConfirmed: true }
      );

      assert.strictEqual(result[0].status, 'error');
      assert.strictEqual(result[1].status, 'error');
      assert.ok(result[0].error?.includes('Cancelled'));
    });
  });

  // =========================================================================
  // 2. PHYSICAL PAGE-RANGE HANDLING
  // =========================================================================
  describe('2. Physical Page-Range Handling (sanitizePageRange)', () => {
    const totalPages = 15;

    it('clamps page 0 to 1', () => {
      const range = sanitizePageRange(0, 5, totalPages);
      assert.strictEqual(range.startPage, 1);
      assert.strictEqual(range.endPage, 5);
    });

    it('clamps negative pages to 1', () => {
      const range = sanitizePageRange(-8, 6, totalPages);
      assert.strictEqual(range.startPage, 1);
      assert.strictEqual(range.endPage, 6);
    });

    it('corrects reversed ranges where start > end', () => {
      const range = sanitizePageRange(10, 4, totalPages);
      assert.strictEqual(range.startPage, 10);
      assert.strictEqual(range.endPage, 10, 'End page must be at least start page');
      assert.ok(range.startPage <= range.endPage);
    });

    it('clamps ranges that extend beyond total document pages', () => {
      const range = sanitizePageRange(12, 50, totalPages);
      assert.strictEqual(range.startPage, 12);
      assert.strictEqual(range.endPage, 15, 'End page must never exceed totalPages (15)');
    });

    it('clamps ranges where both start and end exceed total document pages', () => {
      const range = sanitizePageRange(30, 45, totalPages);
      assert.strictEqual(range.startPage, 15, 'Start page clamped to totalPages');
      assert.strictEqual(range.endPage, 15, 'End page clamped to totalPages');
    });

    it('truncates floating point / non-integer page numbers', () => {
      const range = sanitizePageRange(2.8, 7.3, totalPages);
      assert.strictEqual(range.startPage, 2);
      assert.strictEqual(range.endPage, 7);
    });

    it('safely handles non-numeric / NaN input', () => {
      const range = sanitizePageRange('invalid', 'bad', totalPages);
      assert.strictEqual(range.startPage, 1);
      assert.strictEqual(range.endPage, 1);
    });

    it('handles document with totalPages = 1', () => {
      const range = sanitizePageRange(0, 10, 1);
      assert.strictEqual(range.startPage, 1);
      assert.strictEqual(range.endPage, 1);
    });
  });

  // =========================================================================
  // 3. PREVENT ZIP FILENAME COLLISIONS
  // =========================================================================
  describe('3. Prevent ZIP Filename Collisions', () => {
    it('deduplicates filenames with identical names without dropping entries', async () => {
      const items = [
        { filename: 'Chapter.pdf', bytes: new Uint8Array([1, 2, 3]) },
        { filename: 'Chapter.pdf', bytes: new Uint8Array([4, 5, 6]) },
        { filename: 'Chapter.pdf', bytes: new Uint8Array([7, 8, 9]) },
      ];

      const zipBlob = await createZipBundle(items);
      const zipBuffer = await zipBlob.arrayBuffer();
      const zip = await JSZip.loadAsync(zipBuffer);

      const files = Object.keys(zip.files).filter((k) => !zip.files[k].dir);
      assert.strictEqual(files.length, 3, 'ZIP must contain exactly 3 files, none overwritten');
      assert.ok(files.includes('Chapter.pdf'), 'Must contain Chapter.pdf');
      assert.ok(files.includes('Chapter (1).pdf'), 'Must contain Chapter (1).pdf');
      assert.ok(files.includes('Chapter (2).pdf'), 'Must contain Chapter (2).pdf');
    });

    it('deduplicates filenames case-insensitively (e.g. Unit 1.pdf vs UNIT 1.PDF)', async () => {
      const items = [
        { filename: 'Unit 1.pdf', bytes: new Uint8Array([1, 2]) },
        { filename: 'UNIT 1.PDF', bytes: new Uint8Array([3, 4]) },
        { filename: 'unit 1.pdf', bytes: new Uint8Array([5, 6]) },
      ];

      const zipBlob = await createZipBundle(items);
      const zipBuffer = await zipBlob.arrayBuffer();
      const zip = await JSZip.loadAsync(zipBuffer);

      const files = Object.keys(zip.files).filter((k) => !zip.files[k].dir);
      assert.strictEqual(files.length, 3, 'ZIP must contain all 3 entries case-insensitively');
      const lowerFiles = files.map((f) => f.toLowerCase());
      assert.ok(lowerFiles.includes('unit 1.pdf'));
      assert.ok(lowerFiles.includes('unit 1 (1).pdf') || lowerFiles.includes('unit 1 (1).pdf'));
      assert.ok(lowerFiles.includes('unit 1 (2).pdf') || lowerFiles.includes('unit 1 (2).pdf'));
    });

    it('flags duplicate filenames case-insensitively in validateParts', () => {
      const parts: DetectedPart[] = [
        { id: '1', title: 'Part A', startPage: 1, endPage: 5, filename: 'Lesson.pdf', confidence: 'High', source: 'manual' },
        { id: '2', title: 'Part B', startPage: 6, endPage: 10, filename: 'LESSON.pdf', confidence: 'High', source: 'manual' },
      ];

      const result = validateParts(parts, 10);
      assert.strictEqual(result.duplicateFilenames.length, 1);
      assert.strictEqual(result.duplicateFilenames[0], 'lesson.pdf');
      assert.ok(result.warnings.some((w) => w.includes('Duplicate filename conflict')));
    });
  });

  // =========================================================================
  // 4. FIX FOLDER SELECTION & BROWSER FALLBACK
  // =========================================================================
  describe('4. Folder Selection & Browser Fallback', () => {
    it('isFileSystemAccessSupported returns boolean without throwing', () => {
      const supported = isFileSystemAccessSupported();
      assert.strictEqual(typeof supported, 'boolean');
    });

    it('saveFilesToDirectory throws clear error when File System Access is unsupported', async () => {
      // In Node.js environment, window.showDirectoryPicker is undefined
      await assert.rejects(
        async () => {
          await saveFilesToDirectory([{ filename: 'Test.pdf', bytes: new Uint8Array([1]) }]);
        },
        /File System Access API is not supported/i
      );
    });

    it('reuses existingDirHandle without re-prompting when directory handle is provided', async () => {
      const writtenFiles: { name: string; bytes: Uint8Array }[] = [];
      const mockDirHandle = {
        name: 'MyFolder',
        queryPermission: async () => 'granted',
        getFileHandle: async (name: string, opts?: { create?: boolean }) => {
          if (!opts?.create) {
            // File does not exist yet
            throw new Error('NotFound');
          }
          return {
            createWritable: async () => ({
              write: async (data: Uint8Array) => {
                writtenFiles.push({ name, bytes: data });
              },
              close: async () => {},
            }),
          };
        },
      };

      // Mock isFileSystemAccessSupported by creating global window if needed
      (globalThis as any).window = (globalThis as any).window || {};
      (globalThis as any).window.showDirectoryPicker = () => {
        throw new Error('showDirectoryPicker should NOT be called when existing handle is provided');
      };

      try {
        const items = [
          { filename: 'Unit 1.pdf', bytes: new Uint8Array([10, 20]) },
          { filename: 'Unit 2.pdf', bytes: new Uint8Array([30, 40]) },
        ];

        const result = await saveFilesToDirectory(items, undefined, mockDirHandle);
        assert.strictEqual(result.savedCount, 2, 'Should save both files');
        assert.strictEqual(result.errors.length, 0, 'Should have 0 errors');
        assert.strictEqual(writtenFiles.length, 2);
        assert.strictEqual(writtenFiles[0].name, 'Unit 1.pdf');
        assert.strictEqual(writtenFiles[1].name, 'Unit 2.pdf');
      } finally {
        delete (globalThis as any).window.showDirectoryPicker;
      }
    });

    it('reports individual save errors when a file write fails', async () => {
      const mockDirHandle = {
        name: 'MyFolder',
        queryPermission: async () => 'granted',
        getFileHandle: async (name: string, opts?: { create?: boolean }) => {
          if (name.includes('Fail')) {
            throw new Error('Disk write error: Permission denied');
          }
          return {
            createWritable: async () => ({
              write: async () => {},
              close: async () => {},
            }),
          };
        },
      };

      (globalThis as any).window = (globalThis as any).window || {};
      (globalThis as any).window.showDirectoryPicker = () => mockDirHandle;

      try {
        const items = [
          { filename: 'Success.pdf', bytes: new Uint8Array([1]) },
          { filename: 'Fail.pdf', bytes: new Uint8Array([2]) },
        ];

        const result = await saveFilesToDirectory(items, undefined, mockDirHandle);
        assert.strictEqual(result.savedCount, 1, '1 file should succeed');
        assert.strictEqual(result.errors.length, 1, '1 file should fail');
        assert.ok(result.errors[0].includes('Disk write error'), 'Error must report reason');
      } finally {
        delete (globalThis as any).window.showDirectoryPicker;
      }
    });
  });

  // =========================================================================
  // 5. IMPROVE PDF UPLOAD AND RESOURCE CLEANUP
  // =========================================================================
  describe('5. PDF Upload and Resource Cleanup (inspectPdfDocument)', () => {
    it('safely inspects a valid PDF and returns totalPages', async () => {
      const pdfBytes = await createTestPdf(7);
      const info = await inspectPdfDocument(pdfBytes);
      assert.strictEqual(info.totalPages, 7, 'Must report exact physical page count (7)');
    });

    it('rejects empty file (0 bytes) with a clear error message', async () => {
      const emptyBuffer = new Uint8Array(0);
      await assert.rejects(
        async () => {
          await inspectPdfDocument(emptyBuffer);
        },
        /The selected file is empty \(0 bytes\)/i
      );
    });

    it('rejects non-PDF files missing %PDF- header signature', async () => {
      const fakeText = Buffer.from('This is a plain text file, not a PDF document.');
      await assert.rejects(
        async () => {
          await inspectPdfDocument(fakeText);
        },
        /missing %PDF- header signature/i
      );
    });

    it('provides user-friendly error for password-protected or corrupted files without exposing stack traces', async () => {
      const corruptPdf = Buffer.from('%PDF-1.4\nCorrupt header and damaged xref table \x00\xFF\xAA');
      try {
        await inspectPdfDocument(corruptPdf);
        assert.fail('Should have thrown on corrupted PDF');
      } catch (err: any) {
        assert.ok(!err.message.includes('at '), 'Must not expose internal JavaScript stack trace');
        assert.ok(
          /corrupt|invalid|damaged|cannot be parsed/i.test(err.message),
          `Error message should be user-friendly: ${err.message}`
        );
      }
    });
  });
});
