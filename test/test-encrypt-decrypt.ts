import { PDFDocument } from 'pdf-lib';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import { decryptPDF } from '@pdfsmaller/pdf-decrypt';

async function runTest() {
  console.log('1. Creating a sample PDF...');
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 400]);
  page.drawText('Confidential DocuNexa Document Content');
  const pdfBytes = await doc.save();
  console.log('Original PDF size:', pdfBytes.length);

  console.log('2. Encrypting PDF with password "12345678"...');
  const encryptedBytes = await encryptPDF(new Uint8Array(pdfBytes), '12345678', {
    ownerPassword: 'admin-password-123',
    allowPrinting: true,
    allowCopying: false,
    allowModifying: false,
    algorithm: 'AES-256'
  });
  console.log('Encrypted PDF size:', encryptedBytes.length);

  console.log('3. Verifying that loading without password throws PasswordException...');
  let locked = false;
  try {
    // Attempt to load encrypted PDF without password using pdf-lib
    await PDFDocument.load(encryptedBytes);
  } catch (err: any) {
    locked = true;
    console.log('✓ Success: PDF load failed as expected when locked:', err.message);
  }
  if (!locked) {
    throw new Error('FAILED: PDF was loaded without a password!');
  }

  console.log('4. Decrypting PDF with password "12345678"...');
  const decryptedBytes = await decryptPDF(new Uint8Array(encryptedBytes), '12345678');
  console.log('Decrypted PDF size:', decryptedBytes.length);

  console.log('5. Verifying that decrypted PDF opens cleanly without password...');
  const unlockedDoc = await PDFDocument.load(decryptedBytes);
  console.log('✓ Success: Decrypted PDF loaded cleanly with', unlockedDoc.getPageCount(), 'page(s)!');

  console.log('6. Verifying wrong password fails...');
  let wrongPassFailed = false;
  try {
    await decryptPDF(new Uint8Array(encryptedBytes), 'wrong-password-999');
  } catch (err: any) {
    wrongPassFailed = true;
    console.log('✓ Success: Decrypt with wrong password threw error as expected:', err.message);
  }
  if (!wrongPassFailed) {
    throw new Error('FAILED: Decrypt should have rejected wrong password!');
  }

  console.log('ALL ENCRYPT/DECRYPT TESTS PASSED 100%!');
}

runTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
