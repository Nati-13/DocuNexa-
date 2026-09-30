import fs from 'fs';
import path from 'path';
import sitemap from '../src/app/sitemap';
import robots from '../src/app/robots';
import { metadata as aboutMeta } from '../src/app/about/page';
import { metadata as privacyMeta } from '../src/app/privacy/page';
import { metadata as termsMeta } from '../src/app/terms/page';
import { metadata as contactMeta } from '../src/app/contact/page';
import { metadata as securityMeta } from '../src/app/security/page';

const CANONICAL_BASE = 'https://docunexa.pro.et';

async function runTrustLegalAudit() {
  console.log('================================================================');
  console.log('    DOCUNEXA — PRIVACY, LEGAL, TRUST & CLAIM READINESS AUDIT    ');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, details: string) {
    total++;
    if (condition) {
      console.log(`✓ [PASS] ${name}: ${details}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${name}: ${details}`);
      process.exitCode = 1;
    }
  }

  // --------------------------------------------------
  // 1. PUBLIC TRUST PAGES METADATA INTEGRITY
  // --------------------------------------------------
  console.log('--- 1. PUBLIC TRUST PAGES METADATA INTEGRITY ---');

  const trustPages = [
    { name: 'About', slug: 'about', meta: aboutMeta },
    { name: 'Privacy Policy', slug: 'privacy', meta: privacyMeta },
    { name: 'Terms of Service', slug: 'terms', meta: termsMeta },
    { name: 'Contact Us', slug: 'contact', meta: contactMeta },
    { name: 'Security & Architecture', slug: 'security', meta: securityMeta },
  ];

  const titles = new Set<string>();
  const descriptions = new Set<string>();
  const canonicals = new Set<string>();

  trustPages.forEach((page) => {
    // Page metadata exists
    assert(
      `/${page.slug} metadata exists`,
      Boolean(page.meta && page.meta.title && page.meta.description),
      `Title and description defined for /${page.slug}`
    );

    // Uniqueness
    assert(
      `/${page.slug} has unique title`,
      !titles.has(page.meta.title as string),
      `Title: "${page.meta.title}"`
    );
    titles.add(page.meta.title as string);

    assert(
      `/${page.slug} has unique description`,
      !descriptions.has(page.meta.description as string),
      `Description: "${(page.meta.description as string).slice(0, 70)}..."`
    );
    descriptions.add(page.meta.description as string);

    // Canonical format
    const expectedCanonical = `${CANONICAL_BASE}/${page.slug}`;
    const actualCanonical = (page.meta.alternates as any)?.canonical;
    assert(
      `/${page.slug} canonical URL`,
      actualCanonical === expectedCanonical,
      `Expected ${expectedCanonical}, got ${actualCanonical}`
    );
    canonicals.add(actualCanonical);

    // No accidental noindex
    const isNoindex =
      (page.meta as any)?.robots?.index === false ||
      (page.meta as any)?.robots === 'noindex';
    assert(
      `/${page.slug} is indexable (no accidental noindex)`,
      !isNoindex,
      `Robots index is allowed for public trust page`
    );
  });

  // --------------------------------------------------
  // 2. PAGE COMPONENT SOURCE & VISIBLE H1 AUDIT
  // --------------------------------------------------
  console.log('\n--- 2. PAGE COMPONENT SOURCE & VISIBLE H1 AUDIT ---');

  trustPages.forEach((page) => {
    const filePath = path.join(__dirname, '..', 'src', 'app', page.slug, 'page.tsx');
    assert(
      `/${page.slug}/page.tsx exists on disk`,
      fs.existsSync(filePath),
      `Path: ${filePath}`
    );

    const content = fs.readFileSync(filePath, 'utf8');

    // Check for visible H1
    const hasH1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.test(content);
    assert(
      `/${page.slug} contains visible semantic H1`,
      hasH1,
      `H1 tag verified in /${page.slug}/page.tsx`
    );

    // Check that default export exists
    const hasDefaultExport = /export\s+default\s+function/i.test(content);
    assert(
      `/${page.slug} has default page component export`,
      hasDefaultExport,
      `Default export present in /${page.slug}/page.tsx`
    );
  });

  // --------------------------------------------------
  // 3. FOOTER TRUST LINKS & STRUCTURE AUDIT
  // --------------------------------------------------
  console.log('\n--- 3. FOOTER TRUST LINKS & STRUCTURE AUDIT ---');

  const footerPath = path.join(__dirname, '..', 'src', 'components', 'layout', 'Footer.tsx');
  const footerContent = fs.readFileSync(footerPath, 'utf8');

  // Verify dedicated links in footer
  assert(
    'Footer links to /about',
    footerContent.includes('href="/about"'),
    'Dedicated href="/about" link present'
  );
  assert(
    'Footer links to /privacy',
    footerContent.includes('href="/privacy"'),
    'Dedicated href="/privacy" link present'
  );
  assert(
    'Footer links to /terms',
    footerContent.includes('href="/terms"'),
    'Dedicated href="/terms" link present'
  );
  assert(
    'Footer links to /security',
    footerContent.includes('href="/security"'),
    'Dedicated href="/security" link present'
  );
  assert(
    'Footer links to /contact',
    footerContent.includes('href="/contact"'),
    'Dedicated href="/contact" link present'
  );

  // Verify no fake "DocuNexa Inc." corporation claim
  assert(
    'No False Corporation Entity (No "DocuNexa Inc.") in Footer',
    !footerContent.includes('DocuNexa Inc.'),
    'Truthful entity representation verified'
  );

  // --------------------------------------------------
  // 4. CLAIM TRUTHFULNESS & CONTRADICTION AUDIT
  // --------------------------------------------------
  console.log('\n--- 4. CLAIM TRUTHFULNESS & CONTRADICTION AUDIT ---');

  const homepagePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
  const homepageContent = fs.readFileSync(homepagePath, 'utf8');

  // Verify contradictory "non-monetized public resource" was removed
  assert(
    'No Contradictory "non-monetized" Statement on Homepage',
    !homepageContent.includes('non-monetized'),
    'Contradictory non-monetized statement removed; truthful free model expressed'
  );

  // Verify military-grade buzzword removed from all src files
  const howItWorksPath = path.join(__dirname, '..', 'src', 'app', 'how-it-works', 'page.tsx');
  const howItWorksContent = fs.readFileSync(howItWorksPath, 'utf8');
  assert(
    'No "military-grade" buzzwords in How It Works',
    !howItWorksContent.includes('military-grade'),
    'Truthful standard algorithm description used'
  );

  // Check AdSlot for truthful copy
  const adSlotPath = path.join(__dirname, '..', 'src', 'components', 'ads', 'AdSlot.tsx');
  const adSlotContent = fs.readFileSync(adSlotPath, 'utf8');
  assert(
    'No unverified "sponsors" claim in AdSlot placeholder',
    !adSlotContent.includes('Unobtrusive sponsors help support serverless hosting'),
    'Neutral advertising-supported funding copy verified'
  );

  // Check that no dummy placeholder ad-slot ID is hardcoded
  assert(
    'No hardcoded dummy slot ID "1234567890" in AdSlot',
    !adSlotContent.includes("'1234567890'"),
    'No fake ad unit IDs hardcoded'
  );

  // Verify Privacy Policy Date
  const privacyPath = path.join(__dirname, '..', 'src', 'app', 'privacy', 'page.tsx');
  const privacyContent = fs.readFileSync(privacyPath, 'utf8');
  assert(
    'Privacy Policy contains "Last updated: September 30, 2026"',
    privacyContent.includes('Last updated: September 30, 2026') ||
      (privacyContent.includes('Last updated: {lastUpdated}') && privacyContent.includes("'September 30, 2026'")),
    'Privacy policy date verified at top of page'
  );

  // Verify Terms of Service Date
  const termsPath = path.join(__dirname, '..', 'src', 'app', 'terms', 'page.tsx');
  const termsContent = fs.readFileSync(termsPath, 'utf8');
  assert(
    'Terms of Service contains "Last updated: September 30, 2026"',
    termsContent.includes('Last updated: September 30, 2026') ||
      (termsContent.includes('Last updated: {lastUpdated}') && termsContent.includes("'September 30, 2026'")),
    'Terms date verified at top of page'
  );

  // Verify OCR and external resource disclosures across /about, /privacy, /security
  const aboutPath = path.join(__dirname, '..', 'src', 'app', 'about', 'page.tsx');
  const aboutContent = fs.readFileSync(aboutPath, 'utf8');
  const securityPath = path.join(__dirname, '..', 'src', 'app', 'security', 'page.tsx');
  const securityContent = fs.readFileSync(securityPath, 'utf8');

  assert(
    'About page documents Tesseract OCR language trained data retrieval via jsDelivr CDN',
    aboutContent.includes('Tesseract.js') && aboutContent.includes('traineddata') && aboutContent.includes('jsdelivr'),
    'Accurate OCR resource retrieval documented on /about'
  );

  assert(
    'Privacy policy documents Tesseract OCR language trained data retrieval via jsDelivr CDN',
    privacyContent.includes('Tesseract.js') && privacyContent.includes('traineddata') && privacyContent.includes('jsdelivr'),
    'Accurate OCR resource retrieval documented on /privacy'
  );

  assert(
    'Security page documents Tesseract OCR language trained data retrieval via jsDelivr CDN',
    securityContent.includes('Tesseract.js') && securityContent.includes('traineddata') && securityContent.includes('jsdelivr'),
    'Accurate OCR resource retrieval documented on /security'
  );

  assert(
    'External network resources distinguish document processing, OCR retrieval, and Google Fonts',
    aboutContent.includes('Google Fonts') && privacyContent.includes('Google Fonts') && securityContent.includes('Google Fonts'),
    'Technical distinction between local processing, OCR dictionary weights, and font CDN verified'
  );

  // Verify no "100% private" claims in seoInventory.ts
  const seoPath = path.join(__dirname, '..', 'src', 'config', 'seoInventory.ts');
  const seoContent = fs.readFileSync(seoPath, 'utf8');
  assert(
    'No overly broad "100% private" claims in SEO inventory',
    !seoContent.includes('100% private'),
    'Absolute "100% private" replaced with accurate technical phrasing across all tools'
  );

  // --------------------------------------------------
  // 5. ADSENSE-READINESS & ZERO FAKE ARTIFACTS
  // --------------------------------------------------
  console.log('\n--- 5. ADSENSE READINESS & ZERO FAKE ARTIFACTS ---');

  // Verify no fake ads.txt in public/
  const adsTxtPath = path.join(__dirname, '..', 'public', 'ads.txt');
  const adsTxtExists = fs.existsSync(adsTxtPath);
  assert(
    'No Fake ads.txt Exists (ads.txt intentionally not created)',
    !adsTxtExists,
    'ads.txt intentionally deferred until real AdSense publisher ID is provisioned'
  );

  // Verify no real or fake AdSense script injected in layout
  const layoutPath = path.join(__dirname, '..', 'src', 'app', 'layout.tsx');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  assert(
    'No Google AdSense script injected into RootLayout',
    !layoutContent.includes('adsbygoogle.js') && !layoutContent.includes('pagead2.googlesyndication.com'),
    'Zero AdSense scripts loaded before formal account configuration'
  );

  // Verify no fake publisher ID like ca-pub- anywhere in source
  const envExamplePath = path.join(__dirname, '..', '.env.example');
  const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
  assert(
    'No fake publisher ID in .env.example',
    !envExampleContent.includes('ca-pub-123456789'),
    '.env.example leaves NEXT_PUBLIC_ADS_CLIENT_ID empty'
  );

  // --------------------------------------------------
  // 6. SITEMAP & ROBOTS TRUST PAGES INTEGRATION
  // --------------------------------------------------
  console.log('\n--- 6. SITEMAP & ROBOTS TRUST PAGES INTEGRATION ---');

  const sitemapItems = sitemap();
  const sitemapUrls = new Set(sitemapItems.map((item) => item.url));

  assert(
    'Sitemap Total Count is Exactly 42 URLs',
    sitemapItems.length === 42,
    `Current sitemap count: ${sitemapItems.length} (1 home + 1 tools + 6 trust/info + 34 tools)`
  );

  trustPages.forEach((p) => {
    const url = `${CANONICAL_BASE}/${p.slug}`;
    assert(
      `Sitemap includes canonical /${p.slug}`,
      sitemapUrls.has(url),
      `Verified ${url} in sitemap`
    );
  });

  const robotsData = robots();
  const rule = Array.isArray(robotsData.rules) ? robotsData.rules[0] : robotsData.rules;
  const allowList = Array.isArray(rule?.allow) ? rule.allow : [rule?.allow];
  assert(
    'Robots.txt permits root and public paths',
    allowList.includes('/'),
    'Robots permits "/" without accidental trust page blocking'
  );

  // --------------------------------------------------
  // SUMMARY
  // --------------------------------------------------
  console.log('\n================================================================');
  console.log(`TRUST & LEGAL AUDIT SUMMARY: ${passed} OF ${total} TESTS PASSED (${((passed / total) * 100).toFixed(0)}%)`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTrustLegalAudit();
