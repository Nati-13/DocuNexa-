import { ALL_TOOLS } from '../src/config/tools';

async function verifyAllRoutes() {
  console.log('================================================================');
  console.log('       DOCUNEXA — ALL 34 TOOL ROUTES HTTP HEALTH CHECK         ');
  console.log('================================================================');

  let passCount = 0;
  let failCount = 0;

  for (const tool of ALL_TOOLS) {
    const url = `http://localhost:3000/tools/${tool.slug}`;
    try {
      const res = await fetch(url);
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

  // Also check /tools/pdf-unit-cutter dedicated route and root
  const specialRoutes = [
    { url: 'http://localhost:3000/', name: 'Home Page' },
    { url: 'http://localhost:3000/tools', name: 'Tools Directory' },
    { url: 'http://localhost:3000/tools/pdf-unit-cutter', name: 'PDF Unit Cutter (Dedicated)' },
    { url: 'http://localhost:3000/how-it-works', name: 'How It Works' },
    { url: 'http://localhost:3000/about', name: 'About' },
    { url: 'http://localhost:3000/favicon.ico', name: 'Favicon ICO' },
    { url: 'http://localhost:3000/icon.svg', name: 'Icon SVG' },
    { url: 'http://localhost:3000/pdf.worker.min.mjs', name: 'PDF.js Worker Asset' },
  ];

  console.log('\n--- Checking Special & Asset Routes ---');
  for (const r of specialRoutes) {
    try {
      const res = await fetch(r.url);
      if (res.status === 200) {
        console.log(`✓ [PASS] (200) ${r.name.padEnd(30)}: ${r.url}`);
        passCount++;
      } else {
        console.error(`✗ [FAIL] (${res.status}) ${r.name.padEnd(30)}: ${r.url}`);
        failCount++;
      }
    } catch (err: any) {
      console.error(`✗ [ERROR] ${r.name.padEnd(30)}: ${err.message}`);
      failCount++;
    }
  }

  console.log('\n================================================================');
  console.log(`ROUTE HEALTH CHECK SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

verifyAllRoutes();
