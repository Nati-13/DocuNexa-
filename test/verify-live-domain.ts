import { ALL_TOOLS } from '../src/config/tools';

async function auditLiveDomain() {
  console.log('================================================================');
  console.log('      DOCUNEXA — LIVE DOMAIN HTTP AUDIT (docunexa.pro.et)       ');
  console.log('================================================================');

  let passCount = 0;
  let failCount = 0;

  for (const tool of ALL_TOOLS) {
    const url = `https://docunexa.pro.et/tools/${tool.slug}`;
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.status === 200) {
        console.log(`✓ [PASS] (200) ${tool.slug.padEnd(22)}: ${tool.name}`);
        passCount++;
      } else {
        console.error(`✗ [FAIL] (${res.status}) ${tool.slug.padEnd(22)}: ${tool.name}`);
        failCount++;
      }
    } catch (err: any) {
      console.error(`✗ [ERROR] ${tool.slug.padEnd(22)}: ${err.message}`);
      failCount++;
    }
  }

  // Key assets
  const assets = [
    { url: 'https://docunexa.pro.et/', name: 'Home Page' },
    { url: 'https://docunexa.pro.et/tools', name: 'Tools Directory' },
    { url: 'https://docunexa.pro.et/tools/pdf-unit-cutter', name: 'PDF Unit Cutter (Dedicated)' },
    { url: 'https://docunexa.pro.et/favicon.ico', name: 'Favicon ICO' },
    { url: 'https://docunexa.pro.et/icon.svg', name: 'Icon SVG' },
    { url: 'https://docunexa.pro.et/apple-icon.png', name: 'Apple Icon PNG' },
    { url: 'https://docunexa.pro.et/pdf.worker.min.mjs', name: 'PDF.js Worker' },
    { url: 'https://docunexa.pro.et/standard_fonts/FoxitFixed.pfb', name: 'Standard Font Asset' },
    { url: 'https://docunexa.pro.et/standard_fonts/LICENSE_LIBERATION', name: 'Standard Font License' },
  ];

  console.log('\n--- Checking Asset Endpoints on Live Domain ---');
  for (const a of assets) {
    try {
      const res = await fetch(a.url, { method: 'GET' });
      if (res.status === 200) {
        console.log(`✓ [PASS] (200) ${a.name.padEnd(26)}: ${a.url}`);
        passCount++;
      } else {
        console.error(`✗ [FAIL] (${res.status}) ${a.name.padEnd(26)}: ${a.url}`);
        failCount++;
      }
    } catch (err: any) {
      console.error(`✗ [ERROR] ${a.name.padEnd(26)}: ${err.message}`);
      failCount++;
    }
  }

  console.log('\n================================================================');
  console.log(`LIVE AUDIT SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================');
}

auditLiveDomain();
