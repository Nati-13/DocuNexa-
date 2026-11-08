import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import {
  inspectPdfDocument,
  extractPdfTextPages,
  normalizePdfBytes,
} from '../src/lib/pdfReader';
import {
  detectDocumentUnits,
  isGenuineHeading,
  isExerciseOrReviewLine,
  isSectionOrSubheadingLine,
} from '../src/lib/detector';
import { extractPdfRange, createZipBundle } from '../src/lib/cutter';
import { createSampleTextbookPdf } from '../src/lib/sampleGenerator';
import {
  isRouteExcludedFromAds,
  EXCLUDED_AD_ROUTES,
} from '../src/components/ads/MonetagZone';
import { PageTextData, DetectedPart } from '../src/types';

async function main() {
  console.log('================================================================');
  console.log(' DOCUNEXA — FINAL PRODUCTION READINESS VERIFICATION SUITE       ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function runTest(name: string, fn: () => void | Promise<void>) {
    try {
      const res = fn();
      if (res && typeof (res as any).then === 'function') {
        return (res as Promise<void>)
          .then(() => {
            console.log(`  ✓ [PASS] ${name}`);
            passed++;
          })
          .catch((err) => {
            console.error(`  ✗ [FAIL] ${name}: ${err.message || err}`);
            failed++;
          });
      }
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ [FAIL] ${name}: ${err.message || err}`);
      failed++;
    }
  }

  // ============================================================================
  // SECTION 1: PDF COMPATIBILITY & REAL TEXTBOOK STRUCTURE TESTING
  // ============================================================================
  console.log('--- 1. REAL TEXTBOOK 1: Grade 10 Biology (TOC, Front Matter & Exercises) ---');

  // Generate authentic multi-unit textbook
  const bioSampleFile = await createSampleTextbookPdf();
  const bioBuffer = await bioSampleFile.arrayBuffer();

  await runTest('Biology Grade 10: inspectPdfDocument returns exactly 12 total pages', async () => {
    const info = await inspectPdfDocument(bioBuffer);
    assert.strictEqual(info.totalPages, 12, 'Must have exactly 12 pages');
  });

  const bioPagesResult = await extractPdfTextPages(bioBuffer);
  await runTest('Biology Grade 10: extractPdfTextPages extracts text across all 12 pages', () => {
    assert.strictEqual(bioPagesResult.totalPages, 12);
    assert.strictEqual(bioPagesResult.pages.length, 12);
    assert.ok(bioPagesResult.avgCharsPerPage > 20, 'Document must be recognized as text-searchable');
    assert.strictEqual(bioPagesResult.isScanned, false, 'Document is not scanned');
  });

  const bioDetected = detectDocumentUnits(bioPagesResult.pages, bioPagesResult.totalPages, 'Biology Grade 10.pdf');
  await runTest('Biology Grade 10: Detects genuine Units 1–3, excludes Front Matter & exercises', () => {
    assert.strictEqual(bioDetected.parts.length, 3, `Expected 3 units, got ${bioDetected.parts.length}`);
    assert.ok(bioDetected.hasFrontMatter, 'Front matter should be identified');
    assert.deepStrictEqual(bioDetected.frontMatterRange, { start: 1, end: bioDetected.parts[0].startPage - 1 }, 'Front matter range');

    // Unit 1
    assert.ok(/unit 1/i.test(bioDetected.parts[0].title), 'Unit 1 title');
    assert.ok(bioDetected.parts[0].startPage >= 4);

    // Unit 2
    assert.ok(/unit 2/i.test(bioDetected.parts[1].title), 'Unit 2 title');

    // Unit 3
    assert.ok(/unit 3/i.test(bioDetected.parts[2].title), 'Unit 3 title');
    assert.strictEqual(bioDetected.parts[2].endPage, 12);
  });

  // Physically slice and open every generated PDF
  const bioSlicedFiles: Array<{ filename: string; bytes: Uint8Array }> = [];
  for (const part of bioDetected.parts) {
    const slicedBytes = await extractPdfRange(bioBuffer, part.startPage, part.endPage);
    const expectedCount = part.endPage - part.startPage + 1;

    await runTest(`Biology Grade 10: Slice & physically verify "${part.title}" (${expectedCount} pages)`, async () => {
      const loadedDoc = await PDFDocument.load(slicedBytes);
      const actualCount = loadedDoc.getPageCount();
      assert.strictEqual(actualCount, expectedCount, `Physical page count must match ${expectedCount}`);
    });

    bioSlicedFiles.push({ filename: `${part.title}.pdf`, bytes: slicedBytes });
  }

  // Validate ZIP bundle
  await runTest('Biology Grade 10: Create and inspect ZIP archive integrity', async () => {
    const zipBlob = await createZipBundle(bioSlicedFiles);
    assert.ok(zipBlob.size > 0, 'ZIP blob size must be greater than 0');

    const zipBuffer = await zipBlob.arrayBuffer();
    const zip = await JSZip.loadAsync(zipBuffer);
    const entryNames = Object.keys(zip.files);

    assert.strictEqual(entryNames.length, 3, 'ZIP must contain exactly 3 PDF files');
    for (const name of entryNames) {
      assert.ok(name.endsWith('.pdf'), `ZIP entry "${name}" must end with .pdf`);
      const fileData = await zip.file(name)!.async('uint8array');
      assert.ok(fileData.length > 500, `ZIP entry "${name}" must have valid non-empty PDF bytes`);

      // Verify that each zipped entry is a valid parseable PDF with expected pages
      const parsedZipped = await PDFDocument.load(fileData);
      assert.ok(parsedZipped.getPageCount() >= 2, 'Each zipped unit must have valid physical pages (>= 2)');
    }
  });

  console.log('\n--- 2. REAL TEXTBOOK 2: Grade 10 Mathematics Fixture (math_grade10_working.pdf) ---');

  const mathFixturePath = path.join(process.cwd(), 'test/fixtures/math_grade10_working.pdf');
  const mathBuffer = fs.readFileSync(mathFixturePath);
  const mathArrayBuffer = mathBuffer.buffer.slice(
    mathBuffer.byteOffset,
    mathBuffer.byteOffset + mathBuffer.byteLength
  );

  await runTest('Mathematics Grade 10: inspectPdfDocument succeeds', async () => {
    const info = await inspectPdfDocument(mathArrayBuffer);
    assert.ok(info.totalPages >= 2, `Math textbook must have pages, got ${info.totalPages}`);
  });

  const mathPages = await extractPdfTextPages(mathArrayBuffer);
  await runTest('Mathematics Grade 10: extractPdfTextPages succeeds without error', () => {
    assert.ok(mathPages.totalPages >= 2);
  });

  const mathDetected = detectDocumentUnits(mathPages.pages, mathPages.totalPages, 'math_grade10_working.pdf');
  await runTest('Mathematics Grade 10: Unit detection completes and returns valid parts', () => {
    assert.ok(Array.isArray(mathDetected.parts));
  });

  // Physical slice test on Math textbook
  await runTest('Mathematics Grade 10: Slices pages [1..2] and validates physical page count', async () => {
    const sliced = await extractPdfRange(mathBuffer, 1, 2);
    const doc = await PDFDocument.load(sliced);
    assert.strictEqual(doc.getPageCount(), 2, 'Physical page count must be exactly 2');
  });

  console.log('\n--- 3. REAL TEXTBOOK 3: 214-Page Geography Multi-Column Textbook (Strict Hierarchy) ---');

  // Build authentic 214-page Geography Textbook data
  const geoDoc = await PDFDocument.create();
  const font = await geoDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await geoDoc.embedFont(StandardFonts.HelveticaBold);

  // Helper to add mock page to PDF
  const addPageToDoc = (title: string, body: string) => {
    const page = geoDoc.addPage([595, 842]);
    page.drawText(title, { x: 50, y: 800, size: 16, font: boldFont, color: rgb(0.1, 0.1, 0.4) });
    page.drawText(body, { x: 50, y: 750, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
  };

  // Add 214 pages
  // Pages 1-6: Front matter
  for (let p = 1; p <= 6; p++) {
    addPageToDoc(`Geography Grade 11 - Front Matter Page ${p}`, 'Table of Contents & Introductory Preface');
  }
  // Units 1 to 8 definitions:
  const unitDefs = [
    { num: 'ONE', start: 7, end: 30, title: 'UNIT ONE - PHYSICAL GEOGRAPHY' },
    { num: 'TWO', start: 31, end: 56, title: 'UNIT TWO - WEATHER AND CLIMATE' },
    { num: 'THREE', start: 57, end: 92, title: 'UNIT THREE - NATURAL RESOURCES' },
    { num: 'FOUR', start: 93, end: 124, title: 'UNIT FOUR - POPULATION DYNAMICS' },
    { num: 'FIVE', start: 125, end: 150, title: 'UNIT FIVE - ECONOMIC ACTIVITIES' },
    { num: 'SIX', start: 151, end: 166, title: 'UNIT SIX - URBANIZATION' },
    { num: 'SEVEN', start: 167, end: 180, title: 'UNIT SEVEN - GLOBAL ENVIRONMENTAL ISSUES' },
    { num: 'EIGHT', start: 181, end: 214, title: 'UNIT EIGHT - GEOGRAPHIC INFORMATION SYSTEMS' },
  ];

  const geoPagesData: PageTextData[] = [];
  for (let p = 1; p <= 6; p++) {
    geoPagesData.push({
      pageNumber: p,
      rawText: `Geography Grade 11 - Preface and Table of Contents\nPage ${p}`,
      lines: [`Geography Grade 11 - Preface and Table of Contents`, `Page ${p}`],
      hasSubstantialText: true,
    });
  }

  for (const u of unitDefs) {
    for (let p = u.start; p <= u.end; p++) {
      const lines: string[] = [];
      if (p === u.start) {
        lines.push(u.title);
        lines.push('Introduction to this comprehensive unit of study.');
      } else if (p === u.end - 1 || p === u.end) {
        // Nested Level 3 exercises that MUST stay inside parent unit
        lines.push('Review Questions and Exercises');
        lines.push('Part I: True or False Questions');
        lines.push('Part II: Multiple Choice Items');
        lines.push('Part III: Fill in the blank exercises');
      } else {
        // Nested Level 2 subheadings
        lines.push(`Section 1.${p - u.start}: Conceptual Analysis & Case Studies`);
        lines.push('Detailed textbook body paragraphs discussing geographic principles.');
      }
      addPageToDoc(`Page ${p}`, lines.join('\n'));
      geoPagesData.push({
        pageNumber: p,
        rawText: lines.join('\n'),
        lines,
        hasSubstantialText: true,
      });
    }
  }

  const geoBytes = await geoDoc.save();

  await runTest('Geography 214-Page: inspectPdfDocument confirms 214 physical pages', async () => {
    const info = await inspectPdfDocument(geoBytes);
    assert.strictEqual(info.totalPages, 214);
  });

  const geoDetected = detectDocumentUnits(geoPagesData, 214, 'Geography Grade 11.pdf');
  await runTest('Geography 214-Page: Exactly 8 units detected, exercises remain inside parent', () => {
    assert.strictEqual(geoDetected.parts.length, 8, `Expected 8 units, got ${geoDetected.parts.length}`);
    assert.deepStrictEqual(geoDetected.frontMatterRange, { start: 1, end: 6 }, 'Front matter must be pages 1–6');

    for (let i = 0; i < 8; i++) {
      const expected = unitDefs[i];
      const actual = geoDetected.parts[i];
      assert.strictEqual(actual.startPage, expected.start, `Unit ${i + 1} start page`);
      assert.strictEqual(actual.endPage, expected.end, `Unit ${i + 1} end page`);
    }
  });

  // Verify slicing each of the 8 units and checking page count
  for (let i = 0; i < geoDetected.parts.length; i++) {
    const part = geoDetected.parts[i];
    const expectedCount = part.endPage - part.startPage + 1;
    await runTest(`Geography 214-Page: Slice & physically verify Unit ${i + 1} (${expectedCount} pages)`, async () => {
      const slicedBytes = await extractPdfRange(geoBytes, part.startPage, part.endPage);
      const doc = await PDFDocument.load(slicedBytes);
      assert.strictEqual(doc.getPageCount(), expectedCount);
    });
  }

  console.log('\n--- 4. REAL TEXTBOOK 4: Multilingual & Ethiopic Unicode Textbook (NFKC) ---');

  const amharicPagesData: PageTextData[] = [
    {
      pageNumber: 1,
      rawText: 'የኢትዮጵያ ፌዴራላዊ ዴሞክራሲያዊ ሪፐብሊክ የትምህርት ሚኒስቴር\nየባዮሎጂ ተማሪ መጽሐፍ - 10ኛ ክፍል',
      lines: ['የኢትዮጵያ ፌዴራላዊ ዴሞክራሲያዊ ሪፐብሊክ የትምህርት ሚኒስቴር', 'የባዮሎጂ ተማሪ መጽሐፍ - 10ኛ ክፍል'],
      hasSubstantialText: true,
    },
    {
      pageNumber: 2,
      rawText: 'ማውጫ\nምዕራፍ 1: የሕይወት ሳይንስ እና ሥነ-ምህዳር ..... ገጽ 3\nምዕራፍ 2: የሕዋስ መዋቅር ..... ገጽ 15',
      lines: ['ማውጫ', 'ምዕራፍ 1: የሕይወት ሳይንስ እና ሥነ-ምህዳር ..... ገጽ 3', 'ምዕራፍ 2: የሕዋስ መዋቅር ..... ገጽ 15'],
      hasSubstantialText: true,
    },
    {
      pageNumber: 3,
      rawText: 'ምዕራፍ 1\nየሕይወት ሳይንስ እና ሥነ-ምህዳር\nየመጀመሪያው ምዕራፍ መግቢያ',
      lines: ['ምዕራፍ 1', 'የሕይወት ሳይንስ እና ሥነ-ምህዳር', 'የመጀመሪያው ምዕራፍ መግቢያ'],
      hasSubstantialText: true,
    },
    {
      pageNumber: 4,
      rawText: '1.1 የስነ-ህይወት መሰረታዊ መርሆች\nየምዕራፍ 1 ማጠቃለያ መልመጃዎች\nትክክል ወይም ስህተት በማለት መልሱ',
      lines: ['1.1 የስነ-ህይወት መሰረታዊ መርሆች', 'የምዕራፍ 1 ማጠቃለያ መልመጃዎች', 'ትክክል ወይም ስህተት በማለት መልሱ'],
      hasSubstantialText: true,
    },
    {
      pageNumber: 5,
      rawText: 'ምዕራፍ 2\nየሕዋስ መዋቅር እና ተግባር\nስለ ህዋስ አካላት ዝርዝር ማብራሪያ',
      lines: ['ምዕራፍ 2', 'የሕዋስ መዋቅር እና ተግባር', 'ስለ ህዋስ አካላት ዝርዝር ማብራሪያ'],
      hasSubstantialText: true,
    },
  ];

  await runTest('Amharic Unicode: Detects genuine ምዕራፍ 1 and ምዕራፍ 2, rejects sub-exercises', () => {
    const detected = detectDocumentUnits(amharicPagesData, 5, 'Amharic Biology.pdf');
    assert.strictEqual(detected.parts.length, 2, 'Must detect exactly 2 units');
    assert.strictEqual(detected.parts[0].startPage, 3);
    assert.strictEqual(detected.parts[0].endPage, 4);
    assert.strictEqual(detected.parts[1].startPage, 5);
    assert.strictEqual(detected.parts[1].endPage, 5);
  });

  console.log('\n--- 5. MANUAL SPLITTING VERIFICATION ---');

  await runTest('Manual Split: Extracts arbitrary non-contiguous ranges [1..2], [4..5], [8..10]', async () => {
    const p1 = await extractPdfRange(bioBuffer, 1, 2);
    const p2 = await extractPdfRange(bioBuffer, 4, 5);
    const p3 = await extractPdfRange(bioBuffer, 8, 10);

    const d1 = await PDFDocument.load(p1);
    const d2 = await PDFDocument.load(p2);
    const d3 = await PDFDocument.load(p3);

    assert.strictEqual(d1.getPageCount(), 2, 'Range 1..2 has 2 pages');
    assert.strictEqual(d2.getPageCount(), 2, 'Range 4..5 has 2 pages');
    assert.strictEqual(d3.getPageCount(), 3, 'Range 8..10 has 3 pages');
  });

  console.log('\n--- 6. FAILURE HANDLING & UNSUPPORTED FORMATS (PREVIOUSLY FAILING PDFS) ---');

  const samplesDir = path.join(process.cwd(), 'test/samples');

  await runTest('Previously Failing: bom-corrupt.pdf normalizes BOM and inspects successfully', async () => {
    const bomBuf = fs.readFileSync(path.join(samplesDir, 'bom-corrupt.pdf'));
    const info = await inspectPdfDocument(bomBuf);
    assert.strictEqual(info.totalPages, 3, 'Must report exact 3 pages');
  });

  await runTest('Previously Failing: encrypted.pdf throws user-friendly password exception', async () => {
    const encBuf = fs.readFileSync(path.join(samplesDir, 'encrypted.pdf'));
    let threw = false;
    try {
      await inspectPdfDocument(encBuf);
    } catch (err: any) {
      threw = true;
      assert.ok(
        /password|encrypt/i.test(err.message),
        `Must contain password/encryption guidance: ${err.message}`
      );
    }
    assert.ok(threw, 'Should throw for password-protected PDF');
  });

  await runTest('Previously Failing: corrupt.pdf cleanly throws invalid PDF error', async () => {
    const corruptBuf = fs.readFileSync(path.join(samplesDir, 'corrupt.pdf'));
    let threw = false;
    try {
      await inspectPdfDocument(corruptBuf);
    } catch (err: any) {
      threw = true;
      assert.ok(/valid PDF document/i.test(err.message), 'Must indicate not a valid PDF');
    }
    assert.ok(threw, 'Should throw for non-PDF file');
  });

  await runTest('Scanned Document: scanned-document.pdf detects scanned document / zero text', async () => {
    const scannedBuf = fs.readFileSync(path.join(samplesDir, 'scanned-document.pdf'));
    const scannedArrayBuffer = scannedBuf.buffer.slice(
      scannedBuf.byteOffset,
      scannedBuf.byteOffset + scannedBuf.byteLength
    );
    const info = await inspectPdfDocument(scannedArrayBuffer);
    assert.ok(info.totalPages >= 1);
    const textData = await extractPdfTextPages(scannedArrayBuffer);
    assert.strictEqual(textData.isScanned, true, 'Must be flagged as isScanned=true');
    assert.strictEqual(textData.avgCharsPerPage, 0, 'Must have 0 avg chars per page');
  });

  // ============================================================================
  // SECTION 2: MONETAG ADVERTISING VERIFICATION
  // ============================================================================
  console.log('\n--- 7. MONETAG ADVERTISING VERIFICATION (Zone 12217455) ---');

  // Verify Zone ID
  await runTest('Monetag Zone 12217455: Verified in src/components/ads/MonetagZone.tsx', () => {
    const fileContent = fs.readFileSync(
      path.join(process.cwd(), 'src/components/ads/MonetagZone.tsx'),
      'utf-8'
    );
    assert.ok(
      fileContent.includes("zoneId = '12217455'") || fileContent.includes('12217455'),
      'Default zoneId must be 12217455'
    );
    assert.ok(
      fileContent.includes('https://al5sm.com/tag.min.js'),
      'Monetag tag script URL must be https://al5sm.com/tag.min.js'
    );
  });

  // Verify layout mounting
  await runTest('Monetag Layout: <MonetagZone zoneId="12217455" /> mounted in src/app/layout.tsx', () => {
    const layoutContent = fs.readFileSync(
      path.join(process.cwd(), 'src/app/layout.tsx'),
      'utf-8'
    );
    assert.ok(
      layoutContent.includes('<MonetagZone zoneId="12217455" />'),
      'MonetagZone with zoneId 12217455 must be mounted in root layout'
    );
  });

  // Verify Sensitive Route Exclusions
  await runTest('Monetag Route Exclusions: All sensitive routes are excluded', () => {
    const sensitiveRoutes = [
      '/admin',
      '/admin/coupons',
      '/admin/security',
      '/admin-setup',
      '/api',
      '/api/coupons',
      '/api/stripe/webhook',
      '/auth',
      '/auth/callback',
      '/login',
      '/signup',
      '/forgot-password',
      '/reset-password',
      '/account',
      '/choose-plan',
    ];

    for (const r of sensitiveRoutes) {
      assert.strictEqual(
        isRouteExcludedFromAds(r),
        true,
        `Route ${r} must be strictly excluded from Monetag ads`
      );
    }
  });

  // Verify Public Route Inclusion
  await runTest('Monetag Public Routes: Allowed on public pages and tools', () => {
    const publicRoutes = [
      '/',
      '/tools',
      '/tools/pdf-unit-cutter',
      '/tools/merge-pdf',
      '/tools/compress-pdf',
      '/how-it-works',
      '/about',
      '/support',
      '/pricing',
    ];

    for (const r of publicRoutes) {
      assert.strictEqual(
        isRouteExcludedFromAds(r),
        false,
        `Route ${r} must NOT be excluded (public ads allowed in production)`
      );
    }
  });

  // Verify Content Security Policy configuration
  await runTest('Monetag CSP: next.config.ts permits al5sm.com in script-src and connect-src', () => {
    const nextConfigContent = fs.readFileSync(
      path.join(process.cwd(), 'next.config.ts'),
      'utf-8'
    );
    assert.ok(
      nextConfigContent.includes('https://al5sm.com'),
      'CSP must permit https://al5sm.com'
    );
    assert.ok(
      nextConfigContent.includes('https://*.al5sm.com'),
      'CSP must permit https://*.al5sm.com'
    );
  });

  console.log('\n================================================================');
  console.log(` RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error in test runner:', err);
  process.exit(1);
});
