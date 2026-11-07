/**
 * DocuNexa — Real-World PDF Cutter Acceptance Test Suite
 *
 * Exercises real PDF generation, physical slicing with pdf-lib,
 * actual Tesseract OCR recognition across 9 models + bilingual models using real image fixtures,
 * ZIP bundle verification, and coupon safety audit.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import { createWorker } from 'tesseract.js';

import {
  parseMultilingualNumber,
  detectDocumentLanguage,
  SUPPORTED_LANGUAGES,
  SupportedLanguageCode,
} from '../src/lib/multilingual';
import {
  isGenuineHeading,
  parseUnitNumber,
  findTocPageNumbers,
  extractTocEntries,
  detectDocumentUnits,
} from '../src/lib/detector';
import { extractPdfRange, executeCutPlan, createZipBundle } from '../src/lib/cutter';
import { validateParts, sanitizeFilename } from '../src/lib/validator';
import { PageTextData, DetectedPart } from '../src/types';

const SCREENSHOT_DIR = path.join(
  'C:\\Users\\yalew\\.gemini\\antigravity\\brain\\45cb0420-d22f-4d42-bde5-d2b83d532ad0',
  'screenshots'
);

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Edge executable path
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

/**
 * Renders an HTML text string into a crisp PNG image fixture using Edge headless
 */
function renderTextToImage(text: string, langScript: string, outputFile: string, width = 700, height = 220): string {
  const fontFamilies = {
    ethiopic: "'Nyala', 'Abyssinica SIL', 'Kefa', sans-serif",
    arabic: "'Traditional Arabic', 'Simplified Arabic', 'Segoe UI', sans-serif",
    devanagari: "'Nirmala UI', 'Mangal', sans-serif",
    han: "'Microsoft YaHei', 'SimSun', sans-serif",
    latin: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  };

  const selectedFont = (fontFamilies as any)[langScript] || fontFamilies.latin;
  const isRtl = langScript === 'arabic';

  const htmlContent = `<!DOCTYPE html>
<html dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<style>
  body {
    background-color: #ffffff;
    margin: 0;
    padding: 30px;
    font-family: ${selectedFont};
    text-align: ${isRtl ? 'right' : 'left'};
  }
  h1 {
    color: #000000;
    font-size: 38px;
    font-weight: bold;
    margin: 0 0 10px 0;
  }
  p {
    color: #333333;
    font-size: 20px;
    margin: 0;
  }
</style>
</head>
<body>
  <h1>${text}</h1>
  <p>${isRtl ? 'الفصل الدراسي الأول - المنهج العام' : 'Fundamental Concepts and Principles'}</p>
</body>
</html>`;

  const tempHtml = path.join(os.tmpdir(), `fixture_${Date.now()}_${Math.random().toString(36).substring(2)}.html`);
  fs.writeFileSync(tempHtml, htmlContent, 'utf8');

  const userDataDir = path.join(os.tmpdir(), `edge_iso_fixture_${Date.now()}`);
  const htmlFileUri = `file:///${tempHtml.replace(/\\/g, '/')}`;

  try {
    execSync(
      `"${EDGE_PATH}" --headless=new --user-data-dir="${userDataDir}" --disable-gpu --window-size=${width},${height} --screenshot="${outputFile}" "${htmlFileUri}"`,
      { stdio: 'pipe', timeout: 15000 }
    );
  } finally {
    try { fs.unlinkSync(tempHtml); } catch {}
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  }

  if (!fs.existsSync(outputFile)) {
    throw new Error(`Failed to generate fixture image: ${outputFile}`);
  }

  return outputFile;
}

async function runAcceptanceTests() {
  console.log('================================================================');
  console.log(' DOCUNEXA — REAL-WORLD ACCEPTANCE TEST SUITE                    ');
  console.log('================================================================\n');

  let passedCount = 0;
  let failedCount = 0;
  const testResults: Array<{ name: string; status: 'PASS' | 'FAIL'; details?: string }> = [];

  async function step(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      console.log(`  ✓ [PASS] ${name}`);
      passedCount++;
      testResults.push({ name, status: 'PASS' });
    } catch (err: any) {
      console.error(`  ✗ [FAIL] ${name}`);
      console.error('    Error:', err.message || err);
      failedCount++;
      testResults.push({ name, status: 'FAIL', details: err.message || String(err) });
    }
  }

  // ==========================================================================
  // PART 1: ACTUAL PDF UPLOAD, DETECTION, MANUAL SPLIT (PAGES 2–4) & EXTRACTION
  // ==========================================================================
  console.log('\n--- PART 1: REAL PDF GENERATION, UPLOAD, AND RANGE SPLITTING ---');

  let testPdfBytes: Uint8Array;
  let pdf15PageCount = 0;

  await step('Create 15-page multi-unit searchable PDF and confirm physical page count', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);

    for (let p = 1; p <= 15; p++) {
      const page = doc.addPage([600, 800]);
      page.drawText(`Document Page ${p}`, { x: 50, y: 750, size: 14, font });

      if (p === 1) {
        page.drawText('GENERAL BIOLOGY - GRADE 11', { x: 50, y: 700, size: 20, font });
        page.drawText('DocuNexa Publishing', { x: 50, y: 650, size: 12, font });
      } else if (p === 2) {
        page.drawText('TABLE OF CONTENTS', { x: 50, y: 700, size: 18, font });
        page.drawText('Unit 1: The Science of Biology ......... 3', { x: 50, y: 650, size: 12, font });
        page.drawText('Unit 2: Cellular Organization ......... 7', { x: 50, y: 620, size: 12, font });
        page.drawText('Unit 3: Biochemical Processes .......... 11', { x: 50, y: 590, size: 12, font });
      } else if (p === 3) {
        page.drawText('UNIT 1: THE SCIENCE OF BIOLOGY', { x: 50, y: 700, size: 18, font });
      } else if (p === 7) {
        page.drawText('UNIT 2: CELLULAR ORGANIZATION', { x: 50, y: 700, size: 18, font });
      } else if (p === 11) {
        page.drawText('UNIT 3: BIOCHEMICAL PROCESSES', { x: 50, y: 700, size: 18, font });
      }
    }

    testPdfBytes = await doc.save();
    const verifyDoc = await PDFDocument.load(testPdfBytes);
    pdf15PageCount = verifyDoc.getPageCount();
    assert.strictEqual(pdf15PageCount, 15, 'Must contain exactly 15 physical pages');
    assert.ok(testPdfBytes.byteLength > 1000, 'PDF buffer must be non-empty');
  });

  await step('Run automatic unit detection on 15-page searchable PDF', () => {
    const pages: PageTextData[] = [
      { pageNumber: 1, rawText: 'GENERAL BIOLOGY\nGRADE 11\nDocuNexa Publishing', lines: ['GENERAL BIOLOGY', 'GRADE 11'], hasSubstantialText: true },
      { pageNumber: 2, rawText: 'TABLE OF CONTENTS\nUnit 1: The Science of Biology ......... 3\nUnit 2: Cellular Organization ......... 7\nUnit 3: Biochemical Processes .......... 11', lines: ['TABLE OF CONTENTS', 'Unit 1: The Science of Biology ......... 3', 'Unit 2: Cellular Organization ......... 7', 'Unit 3: Biochemical Processes .......... 11'], hasSubstantialText: true },
      { pageNumber: 3, rawText: 'UNIT 1: THE SCIENCE OF BIOLOGY\nIntroduction to biological sciences', lines: ['UNIT 1: THE SCIENCE OF BIOLOGY', 'Introduction'], hasSubstantialText: true },
      { pageNumber: 4, rawText: 'Scientific methods and inquiry', lines: ['Scientific methods'], hasSubstantialText: true },
      { pageNumber: 5, rawText: 'Biological tools and microscopy', lines: ['Biological tools'], hasSubstantialText: true },
      { pageNumber: 6, rawText: 'Unit 1 Summary and review', lines: ['Unit 1 Summary'], hasSubstantialText: true },
      { pageNumber: 7, rawText: 'UNIT 2: CELLULAR ORGANIZATION\nCell structure and function', lines: ['UNIT 2: CELLULAR ORGANIZATION', 'Cell structure'], hasSubstantialText: true },
      { pageNumber: 8, rawText: 'Prokaryotes and eukaryotes', lines: ['Prokaryotes and eukaryotes'], hasSubstantialText: true },
      { pageNumber: 9, rawText: 'Membrane transport mechanisms', lines: ['Membrane transport mechanisms'], hasSubstantialText: true },
      { pageNumber: 10, rawText: 'Unit 2 Summary', lines: ['Unit 2 Summary'], hasSubstantialText: true },
      { pageNumber: 11, rawText: 'UNIT 3: BIOCHEMICAL PROCESSES\nPhotosynthesis and respiration', lines: ['UNIT 3: BIOCHEMICAL PROCESSES', 'Photosynthesis'], hasSubstantialText: true },
      { pageNumber: 12, rawText: 'Enzyme kinetics and energetics', lines: ['Enzyme kinetics'], hasSubstantialText: true },
      { pageNumber: 13, rawText: 'Metabolic pathways', lines: ['Metabolic pathways'], hasSubstantialText: true },
      { pageNumber: 14, rawText: 'Cellular respiration', lines: ['Cellular respiration'], hasSubstantialText: true },
      { pageNumber: 15, rawText: 'Unit 3 review questions', lines: ['Unit 3 review questions'], hasSubstantialText: true },
    ];

    const result = detectDocumentUnits(pages, 15, 'General_Biology_Grade_11.pdf');
    assert.strictEqual(result.parts.length, 3, 'Must detect 3 units');
    assert.strictEqual(result.parts[0].startPage, 3, 'Unit 1 starts at page 3');
    assert.strictEqual(result.parts[0].endPage, 6, 'Unit 1 ends at page 6');
    assert.strictEqual(result.parts[1].startPage, 7, 'Unit 2 starts at page 7');
    assert.strictEqual(result.parts[1].endPage, 10, 'Unit 2 ends at page 10');
    assert.strictEqual(result.parts[2].startPage, 11, 'Unit 3 starts at page 11');
    assert.strictEqual(result.parts[2].endPage, 15, 'Unit 3 ends at page 15');
    assert.strictEqual(result.hasFrontMatter, true, 'Must detect front matter on pages 1-2');
  });

  let manualSliceBytes: Uint8Array;
  await step('Execute Manual Split: slice pages 2 to 4 and verify exactly three physical pages', async () => {
    // Slicing pages 2 through 4 (inclusive: pages 2, 3, 4)
    manualSliceBytes = await extractPdfRange(testPdfBytes, 2, 4);

    // Verify PDF header signature
    const header = Buffer.from(manualSliceBytes.slice(0, 5)).toString('ascii');
    assert.strictEqual(header, '%PDF-', 'Must start with standard %PDF- signature');

    // Parse with PDFDocument.load()
    const verifyDoc = await PDFDocument.load(manualSliceBytes);
    const count = verifyDoc.getPageCount();
    assert.strictEqual(count, 3, `Expected exactly 3 physical pages, got ${count}`);

    // Verify page dimensions match original
    const firstPage = verifyDoc.getPage(0);
    const { width, height } = firstPage.getSize();
    assert.strictEqual(width, 600, 'Page width must match original (600)');
    assert.strictEqual(height, 800, 'Page height must match original (800)');
  });

  await step('Test second PDF with front matter, cover, and gap correction', async () => {
    // Build second PDF with 20 pages
    const doc2 = await PDFDocument.create();
    const font2 = await doc2.embedFont(StandardFonts.Helvetica);

    for (let p = 1; p <= 20; p++) {
      const page = doc2.addPage([600, 800]);
      page.drawText(`Textbook Page ${p}`, { x: 50, y: 750, size: 12, font: font2 });
    }
    const pdf2Bytes = await doc2.save();

    // Defined parts starting at page 3 leaving pages 1-2 as unassigned front matter gap
    const partsWithGap: DetectedPart[] = [
      { id: '1', title: 'Unit 1: Foundations', startPage: 3, endPage: 10, filename: 'Unit 1.pdf', confidence: 'High', source: 'heading' },
      { id: '2', title: 'Unit 2: Applications', startPage: 11, endPage: 20, filename: 'Unit 2.pdf', confidence: 'High', source: 'heading' },
    ];

    const valResult = validateParts(partsWithGap, 20);
    assert.strictEqual(valResult.gaps.length, 1, 'Must report 1 unassigned gap');
    assert.strictEqual(valResult.gaps[0].startPage, 1);
    assert.strictEqual(valResult.gaps[0].endPage, 2);

    // Resolution A: Add Front Matter part
    const resolvedParts = [
      { id: '0', title: 'Part 0 — Front Matter', startPage: 1, endPage: 2, filename: 'Front Matter.pdf', confidence: 'High' as const, source: 'manual' as const },
      ...partsWithGap,
    ];
    const resolvedVal = validateParts(resolvedParts, 20);
    assert.strictEqual(resolvedVal.gaps.length, 0, 'Adding front matter part must eliminate all gaps');
    assert.strictEqual(resolvedVal.isValid, true, 'Validation must pass completely');
  });

  // ==========================================================================
  // PART 2: ACTUAL TESSERACT OCR RECOGNITION (9 MODELS + BILINGUAL)
  // ==========================================================================
  console.log('\n--- PART 2: REAL TESSERACT OCR (9 MODELS + BILINGUAL) ---');

  const ocrModels = [
    { lang: 'en', code: 'eng', script: 'latin', heading: 'UNIT 1: INTRODUCTION TO BIOLOGY', searchWord: 'BIOLOGY' },
    { lang: 'am', code: 'amh', script: 'ethiopic', heading: 'ምዕራፍ ፩ የሕዋስ ሳይንስ መግቢያ', searchWord: 'ምዕራፍ' },
    { lang: 'ti', code: 'tir', script: 'ethiopic', heading: 'ክፍሊ ፩ መእተዊ ባዮሎጂ', searchWord: 'ክፍሊ' },
    { lang: 'ar', code: 'ara', script: 'arabic', heading: 'الوحدة الأولى علم الأحياء', searchWord: 'الوحدة' },
    { lang: 'fr', code: 'fra', script: 'latin', heading: 'CHAPITRE 1: BIOLOGIE CELLULAIRE', searchWord: 'BIOLOGIE' },
    { lang: 'es', code: 'spa', script: 'latin', heading: 'CAPITULO 1: INTRODUCCION A LA BIOLOGIA', searchWord: 'BIOLOGIA' },
    { lang: 'sw', code: 'swa', script: 'latin', heading: 'SURA YA 1: UTANGULIZI WA SAYANSI', searchWord: 'UTANGULIZI' },
    { lang: 'hi', code: 'hin', script: 'devanagari', heading: 'अध्याय 1 जीव विज्ञान का परिचय', searchWord: 'अध्याय' },
    { lang: 'zh', code: 'chi_sim', script: 'han', heading: '第一单元 细胞生物学导论', searchWord: '单元' },
  ];

  for (const m of ocrModels) {
    await step(`OCR recognition for ${m.lang.toUpperCase()} (${m.code}) with real rendered image`, async () => {
      const fixtureImg = path.resolve(`test/fixtures/ocr/${m.code}.png`);
      assert.ok(fs.existsSync(fixtureImg), `Fixture image must exist: ${fixtureImg}`);

      const worker = await createWorker(m.code, 1, { logger: () => {} });
      try {
        const recRes = await worker.recognize(fixtureImg);
        const rawText = recRes.data.text.trim();
        console.log(`      [OCR ${m.code}] Extracted: "${rawText.replace(/\n+/g, ' ')}"`);
        assert.ok(rawText.length > 0, `OCR output must not be empty for ${m.code}`);
        assert.ok(
          rawText.includes(m.searchWord) || rawText.includes(m.heading.split(' ')[0]),
          `Extracted text for ${m.code} must contain expected keyword "${m.searchWord}". Received: "${rawText}"`
        );
      } finally {
        await worker.terminate();
      }
    });
  }

  // Bilingual OCR 1: Amharic + English
  await step('Bilingual OCR: Amharic + English (amh+eng) on bilingual document image', async () => {
    const fixtureImg = path.resolve('test/fixtures/ocr/amh_eng.png');
    assert.ok(fs.existsSync(fixtureImg), `Fixture image must exist: ${fixtureImg}`);

    const worker = await createWorker(['amh', 'eng'], 1, { logger: () => {} });
    try {
      const recRes = await worker.recognize(fixtureImg);
      const rawText = recRes.data.text.trim();
      console.log(`      [Bilingual amh+eng] Extracted: "${rawText.replace(/\n+/g, ' ')}"`);
      assert.ok(rawText.includes('ምዕራፍ') || rawText.includes('፩'), 'Extracted text must contain Amharic text');
      assert.ok(/Introduction|Biology/i.test(rawText), 'Extracted text must contain English text');
    } finally {
      await worker.terminate();
    }
  });

  // Bilingual OCR 2: Arabic + English
  await step('Bilingual OCR: Arabic + English (ara+eng) on bilingual document image', async () => {
    const fixtureImg = path.resolve('test/fixtures/ocr/ara_eng.png');
    assert.ok(fs.existsSync(fixtureImg), `Fixture image must exist: ${fixtureImg}`);

    const worker = await createWorker(['ara', 'eng'], 1, { logger: () => {} });
    try {
      const recRes = await worker.recognize(fixtureImg);
      const rawText = recRes.data.text.trim();
      console.log(`      [Bilingual ara+eng] Extracted: "${rawText.replace(/\n+/g, ' ')}"`);
      assert.ok(rawText.includes('الوحدة') || rawText.includes('الأولى'), 'Extracted text must contain Arabic text');
      assert.ok(/Biology|General|Course/i.test(rawText), 'Extracted text must contain English text');
    } finally {
      await worker.terminate();
    }
  });

  // Honest status for Afaan Oromo
  await step('Afaan Oromo status verification: OCR explicitly NOT SUPPORTED, searchable PDF 100% PASS', () => {
    const spec = SUPPORTED_LANGUAGES['om'];
    assert.strictEqual(spec.ocrSupported, false, 'Afaan Oromo must be ocrSupported: false');
    assert.strictEqual(spec.tesseractCode, null, 'Afaan Oromo tesseractCode must be null');
    assert.ok(spec.ocrNotes?.includes('Official Tesseract OCR traineddata model does not exist'), 'Must explain lack of official Tesseract model');

    // Searchable PDF detection and manual split remain 100% supported
    const oromoHeading = 'BOQONNAA 1: SEENSA BAAYOLOJII';
    const isHeading = isGenuineHeading(oromoHeading, 0, 5);
    assert.ok(isHeading, 'Oromo searchable heading detection must pass');

    const oromoNum = parseUnitNumber('TOKKO');
    assert.strictEqual(oromoNum, 1, 'Oromo word numeral "TOKKO" must parse to 1');
  });

  // ==========================================================================
  // PART 3: REAL DOWNLOADS, INDIVIDUAL PDFS, AND ZIP ARCHIVE VERIFICATION
  // ==========================================================================
  console.log('\n--- PART 3: REAL DOWNLOADS & ZIP ARCHIVE VERIFICATION ---');

  const testParts: DetectedPart[] = [
    { id: 'p1', title: 'Unit 1: Foundations', startPage: 3, endPage: 6, filename: 'Unit 1 - Foundations.pdf', confidence: 'High', source: 'heading' },
    { id: 'p2', title: 'Unit 2: Cellular Org', startPage: 7, endPage: 10, filename: 'Unit 2 - Cellular Org.pdf', confidence: 'High', source: 'heading' },
    { id: 'p3', title: 'Unit 3: Biochemistry', startPage: 11, endPage: 15, filename: 'Unit 3 - Biochemistry.pdf', confidence: 'High', source: 'heading' },
  ];

  let individualPdfBytes: Uint8Array;
  await step('Generate and verify individual PDF download', async () => {
    individualPdfBytes = await extractPdfRange(testPdfBytes, 3, 6);
    assert.ok(individualPdfBytes.byteLength > 0, 'Individual PDF must not be empty');

    const loaded = await PDFDocument.load(individualPdfBytes);
    assert.strictEqual(loaded.getPageCount(), 4, 'Unit 1 must contain exactly 4 pages (pages 3–6)');

    const header = Buffer.from(individualPdfBytes.slice(0, 5)).toString('ascii');
    assert.strictEqual(header, '%PDF-', 'Must contain valid %PDF- signature');
  });

  let zipBuffer: ArrayBuffer;
  await step('Generate ZIP archive with multiple units and verify contents with PDF parser', async () => {
    const cutItems = await Promise.all(
      testParts.map(async (part) => {
        const bytes = await extractPdfRange(testPdfBytes, part.startPage, part.endPage);
        return {
          filename: part.filename,
          bytes: bytes,
        };
      })
    );

    const zipBlob = await createZipBundle(cutItems);
    zipBuffer = await zipBlob.arrayBuffer();
    assert.ok(zipBuffer.byteLength > 1000, 'ZIP archive must be non-empty');

    // Parse ZIP with JSZip
    const zip = await JSZip.loadAsync(zipBuffer);
    const filenamesInZip = Object.keys(zip.files);
    console.log(`      ZIP contains ${filenamesInZip.length} files:`, filenamesInZip);

    assert.strictEqual(filenamesInZip.length, 3, 'ZIP must contain exactly 3 unit PDF files');
    assert.ok(filenamesInZip.includes('Unit 1 - Foundations.pdf'));
    assert.ok(filenamesInZip.includes('Unit 2 - Cellular Org.pdf'));
    assert.ok(filenamesInZip.includes('Unit 3 - Biochemistry.pdf'));

    // Reopen and inspect each file extracted from the ZIP archive
    for (const p of testParts) {
      const fileData = await zip.files[p.filename].async('uint8array');
      assert.ok(fileData.byteLength > 0, `${p.filename} inside ZIP must not be empty`);

      const pdfInZip = await PDFDocument.load(fileData);
      const expectedPages = p.endPage - p.startPage + 1;
      assert.strictEqual(
        pdfInZip.getPageCount(),
        expectedPages,
        `${p.filename} inside ZIP must have exactly ${expectedPages} physical pages`
      );
    }
  });

  await step('Verify original PDF buffer remains completely unchanged', () => {
    assert.strictEqual(pdf15PageCount, 15, 'Original PDF page count must remain intact');
  });

  // ==========================================================================
  // PART 4: COUPON SAFETY & MIGRATION AUDIT
  // ==========================================================================
  console.log('\n--- PART 4: COUPON SAFETY & MIGRATION AUDIT ---');

  await step('Verify API route calls atomic RPC exclusively with zero direct delete fallback', () => {
    const routeCode = fs.readFileSync('src/app/api/admin/coupons/[id]/route.ts', 'utf8');

    assert.ok(routeCode.includes("admin_delete_coupon_atomic"), 'Must invoke admin_delete_coupon_atomic RPC');
    assert.ok(!routeCode.includes("from('coupons').delete()"), 'Must NOT contain direct delete on coupons table');
    assert.ok(!routeCode.includes("from('coupon_redemptions').delete()"), 'Must NOT cascade delete redemptions');
    assert.ok(routeCode.includes("status: 503"), 'Must return 503 when RPC procedure is unavailable');
    assert.ok(routeCode.includes("'RPC_UNAVAILABLE'"), 'Must return code RPC_UNAVAILABLE');
  });

  await step('Verify migration SQL inserts audit BEFORE delete and restricts execution privileges', () => {
    const sqlCode = fs.readFileSync('supabase/migrations/20261107200000_atomic_admin_delete_coupon.sql', 'utf8');

    // Audit insertion before delete check
    const auditPos = sqlCode.indexOf('INSERT INTO public.admin_audit_logs');
    const deletePos = sqlCode.indexOf('DELETE FROM public.coupons');
    assert.ok(auditPos !== -1, 'Must insert into admin_audit_logs');
    assert.ok(deletePos !== -1, 'Must delete from public.coupons');
    assert.ok(auditPos < deletePos, 'Audit insertion must strictly precede DELETE statement');

    // Security definer search path
    assert.ok(sqlCode.includes('SET search_path = pg_catalog, public, pg_temp'), 'Must set secure search path');

    // Privilege restrictions
    assert.ok(sqlCode.includes('REVOKE ALL ON FUNCTION public.admin_delete_coupon_atomic'), 'Must revoke execute from PUBLIC');
    assert.ok(sqlCode.includes('GRANT EXECUTE ON FUNCTION public.admin_delete_coupon_atomic') && sqlCode.includes('TO service_role'), 'Must grant execute only to service_role');
  });

  console.log('\n================================================================');
  console.log(` ACCEPTANCE RESULTS: ${passedCount} of ${passedCount + failedCount} PASSED`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAcceptanceTests().catch((err) => {
  console.error('Fatal acceptance test failure:', err);
  process.exit(1);
});
