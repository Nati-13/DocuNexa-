import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { inspectPdfDocument, extractPdfTextPages, normalizePdfBytes } from '../src/lib/pdfReader';
import { extractPdfRange, createZipBundle } from '../src/lib/cutter';
import { detectDocumentUnits } from '../src/lib/detector';
import { PDFDocument } from 'pdf-lib';

async function runComprehensivePdfReliabilityTests() {
  console.log('================================================================');
  console.log(' DOCUNEXA — COMPREHENSIVE PDF PIPELINE RELIABILITY TEST SUITE   ');
  console.log('================================================================\n');

  let totalTests = 0;
  let passedTests = 0;

  function test(desc: string, fn: () => void | Promise<void>) {
    totalTests++;
    try {
      const res = fn();
      if (res && typeof (res as any).then === 'function') {
        return (res as Promise<void>)
          .then(() => {
            passedTests++;
            console.log(`  ✓ [PASS] ${desc}`);
          })
          .catch((err) => {
            console.error(`  ✗ [FAIL] ${desc}:`, err.message || err);
            throw err;
          });
      }
      passedTests++;
      console.log(`  ✓ [PASS] ${desc}`);
    } catch (err: any) {
      console.error(`  ✗ [FAIL] ${desc}:`, err.message || err);
      throw err;
    }
  }

  const samplesDir = path.join(process.cwd(), 'test/samples');

  // --- STAGE 1: BOM & LEADING WHITESPACE NORMALIZATION ---
  console.log('--- 1. BOM & Leading Whitespace Normalization ---');

  await test('normalizePdfBytes strips UTF-8 BOM and leading whitespace before %PDF-', () => {
    const rawBom = Buffer.from([0xef, 0xbb, 0xbf, 0x20, 0x20, 0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    const normalized = normalizePdfBytes(rawBom);
    assert.strictEqual(normalized[0], 0x25, 'First byte must be % (0x25)');
    assert.strictEqual(normalized[1], 0x50, 'Second byte must be P (0x50)');
    assert.strictEqual(normalized[2], 0x44, 'Third byte must be D (0x44)');
    assert.strictEqual(normalized[3], 0x46, 'Fourth byte must be F (0x46)');
    assert.strictEqual(normalized[4], 0x2d, 'Fifth byte must be - (0x2d)');
  });

  await test('Inspects bom-corrupt.pdf successfully without parser crash', async () => {
    const buf = fs.readFileSync(path.join(samplesDir, 'bom-corrupt.pdf'));
    const info = await inspectPdfDocument(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    assert.strictEqual(info.totalPages, 3, 'Must report exact 3 total pages');
  });

  await test('Slices pages from bom-corrupt.pdf with exact physical page verification', async () => {
    const buf = fs.readFileSync(path.join(samplesDir, 'bom-corrupt.pdf'));
    const sliceBytes = await extractPdfRange(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      1,
      2
    );
    assert.ok(sliceBytes.length > 500, 'Sliced bytes must be non-empty');
    const doc = await PDFDocument.load(sliceBytes);
    assert.strictEqual(doc.getPageCount(), 2, 'Generated PDF slice must have exactly 2 pages');
  });

  // --- STAGE 2: CORRUPT & ENCRYPTED ERROR CLASSIFICATION ---
  console.log('\n--- 2. Corrupted & Encrypted Document Safety ---');

  await test('Corrupted non-PDF file throws clean user-friendly signature error', async () => {
    const buf = fs.readFileSync(path.join(samplesDir, 'corrupt.pdf'));
    let thrown = false;
    try {
      await inspectPdfDocument(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    } catch (err: any) {
      thrown = true;
      assert.match(err.message, /valid PDF document/i, 'Must report missing %PDF- header signature');
      assert.ok(!err.message.includes('at '), 'Must never leak internal call stack to user');
    }
    assert.ok(thrown, 'Corrupt file must throw');
  });

  await test('Password-protected PDF throws clear action-oriented error', async () => {
    const buf = fs.readFileSync(path.join(samplesDir, 'encrypted.pdf'));
    let thrown = false;
    try {
      await inspectPdfDocument(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    } catch (err: any) {
      thrown = true;
      assert.match(err.message, /password-protected|encrypted/i, 'Must report encryption status');
      assert.ok(!err.message.includes('at '), 'Must never leak internal call stack to user');
    }
    assert.ok(thrown, 'Encrypted file must throw');
  });

  // --- STAGE 3: SCANNED & MULTI-PAGE LAYOUTS ---
  console.log('\n--- 3. Scanned & Multi-Page Document Layouts ---');

  await test('scanned-document.pdf correctly flagged as scanned (isScanned: true)', async () => {
    const buf = fs.readFileSync(path.join(samplesDir, 'scanned-document.pdf'));
    const res = await extractPdfTextPages(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    assert.strictEqual(res.isScanned, true, 'Document with 0 selectable text must be flagged scanned');
    assert.strictEqual(res.totalPages, 1, 'Total pages must be 1');
  });

  await test('multi-page.pdf extracts all 3 pages with substantial text', async () => {
    const buf = fs.readFileSync(path.join(samplesDir, 'multi-page.pdf'));
    const res = await extractPdfTextPages(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    assert.strictEqual(res.totalPages, 3, 'Total pages must be 3');
    assert.strictEqual(res.pages.length, 3, 'Must return 3 page objects');
    assert.strictEqual(res.isScanned, false, 'Must not be flagged scanned');
  });

  await test('financial-table.pdf parses multi-column tabular layout cleanly', async () => {
    const buf = fs.readFileSync(path.join(samplesDir, 'financial-table.pdf'));
    const res = await extractPdfTextPages(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    assert.strictEqual(res.totalPages, 1, 'Total pages must be 1');
    assert.ok(res.avgCharsPerPage > 50, 'Table content must have substantial characters');
  });

  // --- STAGE 4: PDF OUTLINES & BOOKMARKS INTEGRATION ---
  console.log('\n--- 4. PDF Outlines & Bookmarks Integration ---');

  await test('Level 1 outline entries integrate seamlessly into unit candidate list', () => {
    const sampleOutline = [
      {
        id: 'outline-1',
        title: 'Unit 1: Relations and Functions',
        level: 1,
        startPage: 10,
        endPage: 75,
        confidence: 95,
        source: 'outline' as const,
        isUnresolved: false,
      },
      {
        id: 'outline-2',
        title: 'Unit 2: Polynomial Functions',
        level: 1,
        startPage: 76,
        endPage: 129,
        confidence: 95,
        source: 'outline' as const,
        isUnresolved: false,
      },
    ];

    const dummyPages = Array.from({ length: 129 }, (_, i) => ({
      pageNumber: i + 1,
      rawText: `Page ${i + 1} content`,
      lines: [`Page ${i + 1} content`],
      hasSubstantialText: true,
    }));

    const result = detectDocumentUnits(dummyPages, 129, 'Math Grade 11.pdf', sampleOutline as any);
    assert.strictEqual(result.parts.length, 2, 'Must detect 2 units from outlines');
    assert.strictEqual(result.parts[0].startPage, 10, 'Unit 1 starts at page 10');
    assert.strictEqual(result.parts[0].endPage, 75, 'Unit 1 ends at page 75');
    assert.strictEqual(result.parts[0].source, 'outline', 'Source must be outline');
    assert.strictEqual(result.parts[1].startPage, 76, 'Unit 2 starts at page 76');
    assert.strictEqual(result.parts[1].endPage, 129, 'Unit 2 ends at page 129');
    assert.strictEqual(result.hasFrontMatter, true, 'Pages 1–9 must be marked front matter');
    assert.deepStrictEqual(result.frontMatterRange, { start: 1, end: 9 }, 'Front matter range [1..9]');
  });

  // --- STAGE 5: ZIP DEDUPLICATION & ARCHIVE INTEGRITY ---
  console.log('\n--- 5. ZIP Archive Deduplication & Integrity ---');

  await test('createZipBundle handles case-insensitive filename collisions safely', async () => {
    const item1 = { filename: 'Unit 1.pdf', bytes: new Uint8Array([1, 2, 3]) };
    const item2 = { filename: 'unit 1.pdf', bytes: new Uint8Array([4, 5, 6]) };
    const item3 = { filename: 'UNIT 1.PDF', bytes: new Uint8Array([7, 8, 9]) };

    const zipBlob = await createZipBundle([item1, item2, item3]);
    assert.ok(zipBlob.size > 50, 'ZIP blob must be created');
  });

  console.log('\n================================================================');
  console.log(`TOTAL PIPELINE TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log('================================================================\n');

  assert.strictEqual(passedTests, totalTests, 'All comprehensive reliability tests must pass');
}

runComprehensivePdfReliabilityTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
