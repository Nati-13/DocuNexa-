import { ALL_TOOLS } from '../src/config/tools';

async function auditLiveDomain() {
  console.log('================================================================');
  console.log('      DOCUNEXA — LIVE DOMAIN HTTP & SEO AUDIT (docunexa.pro.et) ');
  console.log('================================================================\n');

  let passCount = 0;
  let failCount = 0;

  const keyEndpoints = [
    { url: 'https://docunexa.pro.et/', name: 'Home Page' },
    { url: 'https://docunexa.pro.et/tools', name: 'Tools Directory' },
    { url: 'https://docunexa.pro.et/tools/pdf-unit-cutter', name: 'PDF Unit Cutter (Flagship)' },
    { url: 'https://docunexa.pro.et/tools/split-pdf', name: 'Split PDF' },
    { url: 'https://docunexa.pro.et/tools/merge-pdf', name: 'Merge PDF' },
    { url: 'https://docunexa.pro.et/tools/compress-pdf', name: 'Compress PDF' },
    { url: 'https://docunexa.pro.et/tools/pdf-to-word', name: 'PDF to Word' },
    { url: 'https://docunexa.pro.et/tools/jpg-to-pdf', name: 'JPG to PDF' },
    { url: 'https://docunexa.pro.et/robots.txt', name: 'robots.txt' },
    { url: 'https://docunexa.pro.et/sitemap.xml', name: 'sitemap.xml' },
  ];

  for (const ep of keyEndpoints) {
    try {
      const res = await fetch(ep.url, { method: 'GET' });
      const text = await res.text();

      if (res.status === 200) {
        passCount++;
        console.log(`✓ [HTTP 200] ${ep.name.padEnd(28)}: ${ep.url}`);

        if (ep.url.endsWith('.txt') || ep.url.endsWith('.xml')) {
          console.log(`    Content-Type: ${res.headers.get('content-type')}`);
          console.log(`    Length: ${text.length} chars`);
        } else {
          const titleMatch = text.match(/<title>([^<]*)<\/title>/i);
          const h1Match = text.match(/<h1[^>]*>([^<]*)<\/h1>/i);
          const canonicalMatch = text.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
          const hasNoindex = text.includes('noindex');

          if (titleMatch) console.log(`    Title:     ${titleMatch[1]}`);
          if (h1Match) console.log(`    H1:        ${h1Match[1].trim()}`);
          if (canonicalMatch) console.log(`    Canonical: ${canonicalMatch[1]}`);
          console.log(`    Noindex:   ${hasNoindex ? 'YES (WARNING)' : 'None (Indexable)'}`);
        }
      } else {
        failCount++;
        console.error(`✗ [HTTP ${res.status}] ${ep.name.padEnd(28)}: ${ep.url}`);
      }
    } catch (err: any) {
      failCount++;
      console.error(`✗ [ERROR] ${ep.name.padEnd(28)}: ${err.message}`);
    }
  }

  console.log('\n================================================================');
  console.log(`LIVE AUDIT SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================');
}

auditLiveDomain();
