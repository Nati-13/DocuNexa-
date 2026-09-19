const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'standard_fonts');
const destDir = path.join(__dirname, '..', 'public', 'standard_fonts');

if (!fs.existsSync(srcDir)) {
  console.warn(`[copy-pdf-assets] Source directory not found: ${srcDir}`);
  process.exit(0);
}

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const files = fs.readdirSync(srcDir);
let copied = 0;

for (const file of files) {
  const srcFile = path.join(srcDir, file);
  const destFile = path.join(destDir, file);
  const stat = fs.statSync(srcFile);

  if (stat.isFile()) {
    fs.copyFileSync(srcFile, destFile);
    copied++;
  }
}

// Normalize whitespace in LICENSE_LIBERATION if present
const licensePath = path.join(destDir, 'LICENSE_LIBERATION');
if (fs.existsSync(licensePath)) {
  const content = fs.readFileSync(licensePath, 'utf8');
  const normalized = content
    .split(/\r?\n/)
    .map(line => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n+$/, '') + '\n';
  fs.writeFileSync(licensePath, normalized, 'utf8');
}

console.log(`[copy-pdf-assets] Successfully copied ${copied} standard font assets to public/standard_fonts/`);
