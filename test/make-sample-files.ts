import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import * as fs from 'fs';
import * as path from 'path';

async function generateSampleFiles() {
  const outputDir = path.join(__dirname, 'samples');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 1. Real sample .pptx
  const pptx = new JSZip();
  pptx.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>');
  pptx.file('ppt/slides/slide1.xml', `<?xml version="1.0" encoding="UTF-8"?>
    <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:cSld><p:spTree>
        <p:sp><p:txBody><a:p><a:r><a:t>DocuNexa Suite Overview</a:t></a:r></a:p></p:txBody></p:sp>
        <p:sp><p:txBody><a:p><a:r><a:t>Client-Side Document Engineering</a:t></a:r></a:p></p:txBody></p:sp>
        <p:sp><p:txBody><a:p><a:r><a:t>Complete privacy and zero file uploads to servers</a:t></a:r></a:p></p:txBody></p:sp>
      </p:spTree></p:cSld>
    </p:sld>`);
  pptx.file('ppt/slides/slide2.xml', `<?xml version="1.0" encoding="UTF-8"?>
    <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:cSld><p:spTree>
        <p:sp><p:txBody><a:p><a:r><a:t>Key Technical Capabilities</a:t></a:r></a:p></p:txBody></p:sp>
        <p:sp><p:txBody><a:p><a:r><a:t>WebAssembly PDF rendering via PDF.js</a:t></a:r></a:p></p:txBody></p:sp>
        <p:sp><p:txBody><a:p><a:r><a:t>Lossless PDF manipulation via pdf-lib</a:t></a:r></a:p></p:txBody></p:sp>
        <p:sp><p:txBody><a:p><a:r><a:t>Genuine OpenXML parsing for Word and PowerPoint</a:t></a:r></a:p></p:txBody></p:sp>
      </p:spTree></p:cSld>
    </p:sld>`);
  const pptxBuf = await pptx.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(path.join(outputDir, 'presentation.pptx'), pptxBuf);

  // 2. Real sample .docx
  const docx = new JSZip();
  docx.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>');
  docx.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Executive Summary</w:t></w:r></w:p>
        <w:p><w:r><w:t>DocuNexa provides client-side document processing for modern web browsers.</w:t></w:r></w:p>
        <w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Platform Highlights</w:t></w:r></w:p>
        <w:p><w:r><w:t>• 34 fully functional offline document tools</w:t></w:r></w:p>
        <w:p><w:r><w:t>• Real PDF table grid detection for Excel export</w:t></w:r></w:p>
        <w:p><w:r><w:t>• Interactive AcroForm manipulation</w:t></w:r></w:p>
      </w:body>
    </w:document>`);
  const docxBuf = await docx.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(path.join(outputDir, 'report.docx'), docxBuf);

  // 3. Form PDF with AcroForm
  const formDoc = await PDFDocument.create();
  const formPage = formDoc.addPage([600, 450]);
  const boldFont = await formDoc.embedFont(StandardFonts.HelveticaBold);
  const font = await formDoc.embedFont(StandardFonts.Helvetica);

  formPage.drawText('Employee Registration Form', { x: 50, y: 400, size: 16, font: boldFont, color: rgb(0.1, 0.2, 0.4) });
  formPage.drawText('Full Name:', { x: 50, y: 350, size: 11, font });
  formPage.drawText('Department:', { x: 50, y: 300, size: 11, font });
  formPage.drawText('I accept the terms and privacy policy', { x: 75, y: 250, size: 10, font });

  const form = formDoc.getForm();
  const tfName = form.createTextField('fullName');
  tfName.setText('Abebe Bikila');
  tfName.addToPage(formPage, { x: 150, y: 345, width: 220, height: 22 });

  const ddDept = form.createDropdown('department');
  ddDept.setOptions(['Engineering', 'Product', 'Design', 'Operations']);
  ddDept.select('Engineering');
  ddDept.addToPage(formPage, { x: 150, y: 295, width: 160, height: 22 });

  const cbTerms = form.createCheckBox('agreeTerms');
  cbTerms.check();
  cbTerms.addToPage(formPage, { x: 50, y: 248, width: 18, height: 18 });

  const formPdfBuf = await formDoc.save();
  fs.writeFileSync(path.join(outputDir, 'registration-form.pdf'), formPdfBuf);

  // 4. Scanned-only PDF (no text items)
  const scannedDoc = await PDFDocument.create();
  const scPage = scannedDoc.addPage([595, 842]);
  scPage.drawRectangle({ x: 50, y: 50, width: 495, height: 742, color: rgb(0.94, 0.94, 0.94) });
  const scannedBuf = await scannedDoc.save();
  fs.writeFileSync(path.join(outputDir, 'scanned-document.pdf'), scannedBuf);

  // 5. Table PDF
  const tableDoc = await PDFDocument.create();
  const tableBoldFont = await tableDoc.embedFont(StandardFonts.HelveticaBold);
  const tableFont = await tableDoc.embedFont(StandardFonts.Helvetica);
  const tbPage = tableDoc.addPage([600, 500]);
  tbPage.drawText('Financial Summary Q1-Q4', { x: 50, y: 450, size: 16, font: tableBoldFont });
  tbPage.drawText('Quarter', { x: 50, y: 410, size: 11, font: tableBoldFont });
  tbPage.drawText('Revenue', { x: 180, y: 410, size: 11, font: tableBoldFont });
  tbPage.drawText('Expenses', { x: 320, y: 410, size: 11, font: tableBoldFont });
  tbPage.drawText('Profit', { x: 450, y: 410, size: 11, font: tableBoldFont });

  const rows = [
    ['Q1 2026', '$120,000', '$75,000', '$45,000'],
    ['Q2 2026', '$145,000', '$82,000', '$63,000'],
    ['Q3 2026', '$170,000', '$90,000', '$80,000'],
    ['Q4 2026', '$210,000', '$105,000', '$105,000'],
  ];
  rows.forEach((r, idx) => {
    const y = 380 - idx * 30;
    tbPage.drawText(r[0], { x: 50, y, size: 10, font: tableFont });
    tbPage.drawText(r[1], { x: 180, y, size: 10, font: tableFont });
    tbPage.drawText(r[2], { x: 320, y, size: 10, font: tableFont });
    tbPage.drawText(r[3], { x: 450, y, size: 10, font: tableFont });
  });
  const tableBuf = await tableDoc.save();
  fs.writeFileSync(path.join(outputDir, 'financial-table.pdf'), tableBuf);

  console.log('Sample files generated successfully in test/samples/');
}

generateSampleFiles().catch(console.error);
