import { PDFDocument, rgb, degrees } from 'pdf-lib';
import {
  screenToPdfCoordinates,
  pdfToScreenCoordinates,
  calculatePresetPosition,
  clampRectangle,
  ScreenRect,
  PageDimensions
} from '../src/lib/pdfCoordinates';
import {
  cropPdf,
  rotatePdf,
  addWatermarkToPdf,
  addPageNumbersToPdf
} from '../src/lib/pdfEngine';
import { detectPdfFormFields, fillPdfForm } from '../src/lib/tools/pdfForms';
import { sanitizeDownloadFilename } from '../src/lib/downloadContract';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`  ✓ PASS: ${message}`);
}

function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
}

async function createSamplePdf(pageCount: number = 2): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([600, 800]);
    page.drawText(`Page ${i + 1}`, { x: 50, y: 750, size: 24, color: rgb(0, 0, 0) });
  }
  return await doc.save();
}

async function runVisualWorkspaceTests() {
  console.log('================================================================');
  console.log(' DOCUNEXA — VISUAL PDF WORKSPACE & INTERACTIVE TOOLS TEST SUITE');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // 1. COORDINATE MATH & INVERSION TESTS
  // --------------------------------------------------------------------------
  console.log('[1/6] Testing Screen <-> PDF Coordinate Translation...');

  const pageDims: PageDimensions = { width: 600, height: 800 };
  const screenRect: ScreenRect = { x: 100, y: 150, width: 200, height: 100 };

  // Scale 1.0
  const pdfCoords1 = screenToPdfCoordinates(screenRect, pageDims, 1.0);
  assert(pdfCoords1.x === 100, 'Scale 1.0: X coordinate matches screen X');
  // PDF Y = height - (screenY + screenHeight) = 800 - (150 + 100) = 550
  assert(pdfCoords1.y === 550, 'Scale 1.0: Y coordinate properly inverts from top-left to bottom-left');
  assert(pdfCoords1.width === 200, 'Scale 1.0: Width matches');
  assert(pdfCoords1.height === 100, 'Scale 1.0: Height matches');

  // Invert back to screen coordinates
  const screenBack1 = pdfToScreenCoordinates(pdfCoords1, pageDims, 1.0);
  assert(Math.abs(screenBack1.x - screenRect.x) < 0.001, 'Invertibility: Screen X restored');
  assert(Math.abs(screenBack1.y - screenRect.y) < 0.001, 'Invertibility: Screen Y restored');
  assert(Math.abs(screenBack1.width - screenRect.width) < 0.001, 'Invertibility: Screen Width restored');
  assert(Math.abs(screenBack1.height - screenRect.height) < 0.001, 'Invertibility: Screen Height restored');

  // Scale 2.0 (Zoomed in)
  const screenRectZoomed: ScreenRect = { x: 200, y: 300, width: 400, height: 200 };
  const pdfCoordsZoomed = screenToPdfCoordinates(screenRectZoomed, pageDims, 2.0);
  assert(pdfCoordsZoomed.x === 100, 'Scale 2.0: X normalized by scale factor');
  assert(pdfCoordsZoomed.y === 550, 'Scale 2.0: Y normalized and properly inverted');
  assert(pdfCoordsZoomed.width === 200, 'Scale 2.0: Width normalized');
  assert(pdfCoordsZoomed.height === 100, 'Scale 2.0: Height normalized');

  // Clamping
  const outOfBoundsRect: ScreenRect = { x: -50, y: -20, width: 900, height: 1000 };
  const clamped = clampRectangle(outOfBoundsRect, 600, 800);
  assert(clamped.x >= 0, 'Clamping: X is non-negative');
  assert(clamped.y >= 0, 'Clamping: Y is non-negative');
  assert(clamped.x + clamped.width <= 600, 'Clamping: X + width does not exceed canvas width');
  assert(clamped.y + clamped.height <= 800, 'Clamping: Y + height does not exceed canvas height');

  // Preset positions
  const centerPos = calculatePresetPosition('center', pageDims.width, pageDims.height, 200, 100);
  assert(centerPos.x === (600 - 200) / 2, 'Preset Center: X is horizontally centered');
  assert(centerPos.y === (800 - 100) / 2, 'Preset Center: Y is vertically centered');

  const topLeftPos = calculatePresetPosition('top-left', pageDims.width, pageDims.height, 200, 100, 20);
  assert(topLeftPos.x === 20, 'Preset Top-Left: X respects margin');
  assert(topLeftPos.y === 20, 'Preset Top-Left: Y respects margin');

  // --------------------------------------------------------------------------
  // 2. PER-PAGE ROTATION
  // --------------------------------------------------------------------------
  console.log('\n[2/6] Testing Per-Page Independent Rotation...');
  const sample2PagePdf = await createSamplePdf(3);

  // Rotate page 1 by 90°, page 2 by 180°, leave page 3 at 0°
  const rotatedBytes = await rotatePdf(toArrayBuffer(sample2PagePdf), { 1: 90, 2: 180 });

  const verifiedRotDoc = await PDFDocument.load(rotatedBytes);
  assert(verifiedRotDoc.getPageCount() === 3, 'Per-page rotation: Page count preserved');
  assert(verifiedRotDoc.getPage(0).getRotation().angle === 90, 'Per-page rotation: Page 1 rotated 90°');
  assert(verifiedRotDoc.getPage(1).getRotation().angle === 180, 'Per-page rotation: Page 2 rotated 180°');
  assert(verifiedRotDoc.getPage(2).getRotation().angle === 0, 'Per-page rotation: Page 3 left unchanged at 0°');

  // --------------------------------------------------------------------------
  // 3. VISUAL WATERMARK & PRECISE COORDINATE STAMPING
  // --------------------------------------------------------------------------
  console.log('\n[3/6] Testing Visual Watermark Positioning...');
  const sampleWatermarkPdf = await createSamplePdf(2);

  const watermarkedBytes = await addWatermarkToPdf(toArrayBuffer(sampleWatermarkPdf), {
    text: 'STRICTLY CONFIDENTIAL',
    opacity: 0.3,
    rotation: 45,
    fontSize: 36,
    x: 120,
    y: 350,
    targetPages: [1], // Page 1 only
  });

  const verifiedWmDoc = await PDFDocument.load(watermarkedBytes);
  assert(verifiedWmDoc.getPageCount() === 2, 'Watermark: Page count preserved');
  assert(watermarkedBytes.byteLength > sampleWatermarkPdf.byteLength, 'Watermark: Document size increased with embedded font and content stream');

  // --------------------------------------------------------------------------
  // 4. INTERACTIVE CROP PDF BOUNDING BOX
  // --------------------------------------------------------------------------
  console.log('\n[4/6] Testing Interactive Crop PDF Bounds...');
  const sampleCropPdf = await createSamplePdf(2);

  const croppedBytes = await cropPdf(toArrayBuffer(sampleCropPdf), {
    cropBox: { x: 50, y: 50, width: 500, height: 700 },
  });

  const verifiedCropDoc = await PDFDocument.load(croppedBytes);
  const p1 = verifiedCropDoc.getPage(0);
  const cropBox = p1.getCropBox();
  assert(cropBox.x === 50, 'Crop Box: X set correctly');
  assert(cropBox.y === 50, 'Crop Box: Y set correctly');
  assert(cropBox.width === 500, 'Crop Box: Width set correctly');
  assert(cropBox.height === 700, 'Crop Box: Height set correctly');

  // --------------------------------------------------------------------------
  // 5. PAGE NUMBERING WITH 6-GRID & FORMATS
  // --------------------------------------------------------------------------
  console.log('\n[5/6] Testing Page Numbering Formats & 6-Grid Placements...');
  const sampleNumPdf = await createSamplePdf(3);

  for (const pos of ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'] as const) {
    const numBytes = await addPageNumbersToPdf(toArrayBuffer(sampleNumPdf), {
      position: pos,
      format: 'page-of-total',
      startNumber: 1,
      fontSize: 10,
      margin: 25,
      colorHex: '#334155',
    });
    const loadedDoc = await PDFDocument.load(numBytes);
    assert(loadedDoc.getPageCount() === 3, `Page Numbering at ${pos}: Saved successfully`);
  }

  // Roman format test
  const romanBytes = await addPageNumbersToPdf(toArrayBuffer(sampleNumPdf), {
    position: 'bottom-center',
    format: 'roman',
    startNumber: 1,
    fontSize: 10,
    margin: 30,
  });
  const romanDoc = await PDFDocument.load(romanBytes);
  assert(romanDoc.getPageCount() === 3, 'Page Numbering (Roman): Saved successfully');

  // --------------------------------------------------------------------------
  // 6. PDF FORMS ACCURACY & ACROFORM DETECTION
  // --------------------------------------------------------------------------
  console.log('\n[6/6] Testing PDF Forms AcroForm Scanning & Field Handling...');
  // Scanned / Flat PDF test
  const flatPdf = await createSamplePdf(1);
  const flatResult = await detectPdfFormFields(toArrayBuffer(flatPdf));
  assert(flatResult.hasForm === false, 'PDF Forms: Correctly reports flat PDF has no AcroForms');
  assert(flatResult.fields.length === 0, 'PDF Forms: 0 fields in flat PDF');
  assert(!flatResult.isXfa, 'PDF Forms: Correctly reports flat PDF is not XFA');

  // Interactive AcroForm creation and filling test
  const formDoc = await PDFDocument.create();
  const formPage = formDoc.addPage([600, 400]);
  const form = formDoc.getForm();
  const textField = form.createTextField('applicant_name');
  textField.setText('Initial Value');
  textField.addToPage(formPage, { x: 50, y: 300, width: 200, height: 30 });
  const formBytes = await formDoc.save();

  const formDetection = await detectPdfFormFields(toArrayBuffer(formBytes));
  assert(formDetection.hasForm === true, 'PDF Forms: Successfully detects genuine interactive AcroForm');
  assert(formDetection.fields.length === 1, 'PDF Forms: Detects 1 field');
  assert(formDetection.fields[0].name === 'applicant_name', 'PDF Forms: Field name matches');

  // Fill form
  const filledRes = await fillPdfForm(
    toArrayBuffer(formBytes),
    { applicant_name: 'Antigravity User' },
    'application-form'
  );
  assert(filledRes.modifiedCount === 1, 'PDF Forms: Modified count is 1');
  assert(filledRes.filename === 'application-form - (Filled).pdf', 'PDF Forms: Output filename has truthful format');

  // Verify filled value
  const filledDoc = await PDFDocument.load(filledRes.bytes);
  const filledField = filledDoc.getForm().getTextField('applicant_name');
  assert(filledField.getText() === 'Antigravity User', 'PDF Forms: Value correctly persisted into AcroForm field');

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(` VISUAL WORKSPACE SUITE COMPLETE: ${passedTests} of ${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runVisualWorkspaceTests().catch((err) => {
  console.error('Fatal visual workspace test error:', err);
  process.exit(1);
});
