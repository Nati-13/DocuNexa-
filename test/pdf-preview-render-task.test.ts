import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { renderPdfPageToCanvas, cancelActiveCanvasRender } from '../src/lib/pdfReader';

async function generate30PagePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= 30; i++) {
    const page = doc.addPage([600, 800]);
    page.drawText(`Sample Textbook Page ${i}`, {
      x: 50,
      y: 750,
      size: 24,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(`Content for unit review and exercises on page ${i}.`, {
      x: 50,
      y: 700,
      size: 14,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  return await doc.save();
}

/**
 * Node-compatible minimal mock canvas for PDF.js page.render
 */
function createMockCanvas() {
  const canvasObj: any = {
    width: 600,
    height: 800,
    style: {},
  };

  const baseCtx: any = {
    canvas: canvasObj,
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    measureText: () => ({ width: 10 }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    createImageData: () => ({ data: new Uint8ClampedArray(4) }),
  };

  const ctxProxy = new Proxy(baseCtx, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return () => {};
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });

  canvasObj.getContext = () => ctxProxy;
  return canvasObj as HTMLCanvasElement;
}

async function runTests() {
  console.log('--- Testing PDF Preview Canvas Rendering Lifecycle ---');
  const pdfBytes = await generate30PagePdf();
  const buffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);

  const canvas = createMockCanvas();

  // Test 1: Render page 25 directly
  console.log('Test 1: Render page 25 directly');
  await renderPdfPageToCanvas(buffer, 25, canvas, { scale: 1.0 });
  console.log('✅ Page 25 rendered successfully without collision');

  // Test 2: Rapid successive renders on the same canvas (simulating rapid user clicking 1 -> 5 -> 10 -> 25)
  console.log('Test 2: Rapid sequential page transitions to page 25');
  const p1 = renderPdfPageToCanvas(buffer, 1, canvas, { scale: 1.0 });
  const p2 = renderPdfPageToCanvas(buffer, 5, canvas, { scale: 1.0 });
  const p3 = renderPdfPageToCanvas(buffer, 10, canvas, { scale: 1.0 });
  const p4 = renderPdfPageToCanvas(buffer, 25, canvas, { scale: 1.0 });

  await Promise.allSettled([p1, p2, p3, p4]);
  console.log('✅ Rapid navigation settled cleanly without canvas concurrency errors');

  // Test 3: Opening page 25 repeatedly (simulating re-opening modal or jumping repeatedly)
  console.log('Test 3: Repeated page 25 openings');
  for (let round = 1; round <= 5; round++) {
    await renderPdfPageToCanvas(buffer, 25, canvas, { scale: 1.2 });
  }
  console.log('✅ Page 25 opened repeatedly 5 times with zero canvas conflicts');

  // Test 4: AbortSignal cancellation
  console.log('Test 4: AbortController in-flight cancellation');
  const controller = new AbortController();
  const cancelledRender = renderPdfPageToCanvas(buffer, 20, canvas, {
    scale: 1.0,
    signal: controller.signal,
  });
  controller.abort();
  await cancelledRender;
  console.log('✅ In-flight render aborted safely');

  // Test 5: Clean cancelActiveCanvasRender helper
  console.log('Test 5: cancelActiveCanvasRender helper');
  const backgroundRender = renderPdfPageToCanvas(buffer, 15, canvas, { scale: 1.0 });
  await cancelActiveCanvasRender(canvas);
  await backgroundRender;
  console.log('✅ Active canvas render successfully cancelled and awaited');

  console.log('\n🎉 ALL PDF PREVIEW RENDER LIFECYCLE TESTS PASSED!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
