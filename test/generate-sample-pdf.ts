import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

async function testPdfSplitting() {
  console.log('=== RUNNING SAMPLE PDF GENERATION & SPLIT TEST ===\n');

  // 1. Create a 10-page master PDF
  console.log('1. Creating 10-page master document...');
  const masterDoc = await PDFDocument.create();
  const font = await masterDoc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 1; i <= 10; i++) {
    const page = masterDoc.addPage([500, 700]);
    page.drawText(`Page ${i} of Master Textbook`, {
      x: 50,
      y: 600,
      size: 20,
      font,
      color: rgb(0.1, 0.2, 0.5),
    });
  }

  const masterBytes = await masterDoc.save();
  console.log(`✓ Master document created with ${masterDoc.getPageCount()} pages (${masterBytes.byteLength} bytes)`);

  // 2. Split into 3 parts:
  // Part 1: Pages 1-3
  // Part 2: Pages 4-7
  // Part 3: Pages 8-10
  console.log('\n2. Splitting into 3 separate sub-documents...');
  const plan = [
    { name: 'Unit 1.pdf', start: 1, end: 3 },
    { name: 'Unit 2.pdf', start: 4, end: 7 },
    { name: 'Unit 3.pdf', start: 8, end: 10 },
  ];

  const loadedMaster = await PDFDocument.load(masterBytes);

  for (const item of plan) {
    const subDoc = await PDFDocument.create();
    const pageIndices: number[] = [];
    for (let p = item.start; p <= item.end; p++) {
      pageIndices.push(p - 1);
    }
    const copiedPages = await subDoc.copyPages(loadedMaster, pageIndices);
    copiedPages.forEach((pg) => subDoc.addPage(pg));

    const subBytes = await subDoc.save();
    const expectedCount = item.end - item.start + 1;
    if (subDoc.getPageCount() !== expectedCount) {
      throw new Error(`Expected ${expectedCount} pages in ${item.name}, got ${subDoc.getPageCount()}`);
    }
    console.log(`✓ Generated ${item.name} (${subDoc.getPageCount()} pages, ${subBytes.byteLength} bytes)`);
  }

  console.log('\n✓ Lossless PDF Splitting pipeline verified successfully!');
}

testPdfSplitting().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
