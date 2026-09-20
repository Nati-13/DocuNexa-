import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as XLSX from 'xlsx';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import * as fs from 'fs';
import * as path from 'path';

async function generateCompleteCorpus() {
  const outDir = path.join(__dirname, 'samples');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. multi-page.pdf (3 pages with selectable text)
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 1; i <= 3; i++) {
    const page = doc.addPage([595, 842]);
    page.drawText(`DocuNexa Verified Document - Page ${i}`, {
      x: 50,
      y: 780,
      size: 18,
      font: boldFont,
      color: rgb(0.1, 0.2, 0.4),
    });
    page.drawText(`This is page ${i} of our multi-page client-side PDF test corpus.`, {
      x: 50,
      y: 740,
      size: 12,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    page.drawText(`All processing occurs directly in the browser with zero server uploads.`, {
      x: 50,
      y: 710,
      size: 11,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }
  const multiPageBytes = await doc.save();
  fs.writeFileSync(path.join(outDir, 'multi-page.pdf'), multiPageBytes);

  // 2. sample.xlsx
  const wb = XLSX.utils.book_new();
  const wsData = [
    ['Product', 'Category', 'Units', 'Revenue'],
    ['DocuNexa Core', 'Software', 1500, 75000],
    ['PDF Unit Cutter', 'Add-on', 950, 47500],
    ['Offline OCR Engine', 'Module', 600, 30000],
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'Sales Data');
  const xlsxBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  fs.writeFileSync(path.join(outDir, 'sample.xlsx'), xlsxBuf);

  // 3. sample.html
  const htmlContent = `<!DOCTYPE html>
<html>
<head><title>DocuNexa Document</title></head>
<body>
  <h1>Quarterly Progress Report</h1>
  <p>DocuNexa delivers 34 high-performance client-side document processing tools.</p>
  <p>Features include conversion, manipulation, security, and document intelligence.</p>
</body>
</html>`;
  fs.writeFileSync(path.join(outDir, 'sample.html'), htmlContent, 'utf-8');

  // 4. corrupt.pdf (No PDF header)
  fs.writeFileSync(path.join(outDir, 'corrupt.pdf'), '<html><body>Not a PDF document</body></html>', 'utf-8');

  // 5. bom-corrupt.pdf (BOM prefix before %PDF-)
  const bomBytes = Buffer.concat([
    Buffer.from([0xEF, 0xBB, 0xBF, 0x20, 0x20, 0x20]),
    Buffer.from(multiPageBytes),
  ]);
  fs.writeFileSync(path.join(outDir, 'bom-corrupt.pdf'), bomBytes);

  // 6. encrypted.pdf
  const encDoc = await PDFDocument.create();
  const encPage = encDoc.addPage([500, 400]);
  encPage.drawText('Confidential Encrypted Document Content', {
    x: 50,
    y: 350,
    size: 14,
    font: boldFont,
  });
  const encBytes = await encDoc.save();
  const encryptedBytes = await encryptPDF(new Uint8Array(encBytes), '12345678', {
    ownerPassword: 'owner-pass-123',
    allowPrinting: true,
    allowCopying: false,
    allowModifying: false,
    algorithm: 'AES-256',
  });
  fs.writeFileSync(path.join(outDir, 'encrypted.pdf'), Buffer.from(encryptedBytes));

  console.log('Complete test corpus generated successfully in test/samples/');
}

generateCompleteCorpus().catch((err) => {
  console.error('Error generating corpus:', err);
  process.exit(1);
});
