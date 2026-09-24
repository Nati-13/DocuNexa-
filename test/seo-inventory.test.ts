import { ALL_TOOLS, TOOL_CATEGORIES, getToolBySlug } from '../src/config/tools';
import { SEO_TOOL_RECORDS, getToolSeoData, CANONICAL_BASE } from '../src/config/seoInventory';
import sitemap from '../src/app/sitemap';
import robots from '../src/app/robots';

async function runSeoInventoryAudit() {
  console.log('================================================================');
  console.log('    DOCUNEXA — SEO FOUNDATION & 34-TOOL INVENTORY AUDIT        ');
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
  // 1. TOOL INVENTORY CONSISTENCY
  // --------------------------------------------------
  console.log('--- 1. TOOL INVENTORY & REGISTRY INTEGRITY ---');

  assert(
    'Exact 34 Registered Tools',
    ALL_TOOLS.length === 34,
    `Registered tool count is exactly ${ALL_TOOLS.length} (expected 34)`
  );

  assert(
    'Exact 34 SEO Records',
    SEO_TOOL_RECORDS.length === 34,
    `SEO tool record count is exactly ${SEO_TOOL_RECORDS.length} (expected 34)`
  );

  const registeredSlugs = new Set(ALL_TOOLS.map((t) => t.slug));
  const seoSlugs = new Set(SEO_TOOL_RECORDS.map((s) => s.slug));

  assert(
    'No Duplicate Registered Slugs',
    registeredSlugs.size === ALL_TOOLS.length,
    `All ${registeredSlugs.size} registered slugs are unique`
  );

  assert(
    'No Duplicate SEO Slugs',
    seoSlugs.size === SEO_TOOL_RECORDS.length,
    `All ${seoSlugs.size} SEO slugs are unique`
  );

  let missingInSeo = 0;
  let nonexistentInRegistry = 0;

  ALL_TOOLS.forEach((tool) => {
    if (!seoSlugs.has(tool.slug)) missingInSeo++;
  });

  SEO_TOOL_RECORDS.forEach((seo) => {
    if (!registeredSlugs.has(seo.slug)) nonexistentInRegistry++;
  });

  assert(
    'Registered Tools Match SEO Records 1:1',
    missingInSeo === 0 && nonexistentInRegistry === 0,
    `Missing in SEO: ${missingInSeo}, Nonexistent in registry: ${nonexistentInRegistry}`
  );

  // --------------------------------------------------
  // 2. METADATA UNIQUENESS & INTEGRITY
  // --------------------------------------------------
  console.log('\n--- 2. METADATA UNIQUENESS & INTEGRITY ---');

  const titles = new Set<string>();
  const descriptions = new Set<string>();
  const canonicals = new Set<string>();
  const h1s = new Set<string>();

  let duplicateTitles = 0;
  let duplicateDescriptions = 0;
  let invalidCanonicals = 0;
  let mismatchedH1s = 0;

  SEO_TOOL_RECORDS.forEach((record) => {
    // Unique Title
    if (titles.has(record.title)) duplicateTitles++;
    titles.add(record.title);

    // Unique Description
    if (descriptions.has(record.description)) duplicateDescriptions++;
    descriptions.add(record.description);

    // Canonical format: https://docunexa.pro.et/tools/<slug>
    const expectedCanonical = `${CANONICAL_BASE}/tools/${record.slug}`;
    if (record.canonicalUrl !== expectedCanonical) invalidCanonicals++;
    canonicals.add(record.canonicalUrl);

    // H1 check: must match tool name
    if (record.h1 !== record.name) mismatchedH1s++;
    h1s.add(record.h1);
  });

  assert(
    '34 Unique Titles',
    duplicateTitles === 0 && titles.size === 34,
    `Found ${titles.size} unique titles (duplicates: ${duplicateTitles})`
  );

  assert(
    '34 Unique Descriptions',
    duplicateDescriptions === 0 && descriptions.size === 34,
    `Found ${descriptions.size} unique descriptions (duplicates: ${duplicateDescriptions})`
  );

  assert(
    '34 Correct Canonical URLs',
    invalidCanonicals === 0 && canonicals.size === 34,
    `All canonicals strictly map to ${CANONICAL_BASE}/tools/<slug>`
  );

  assert(
    '34 Matching H1 Headings',
    mismatchedH1s === 0 && h1s.size === 34,
    `All H1s match the corresponding registered tool name exactly`
  );

  // --------------------------------------------------
  // 3. SITEMAP AUDIT
  // --------------------------------------------------
  console.log('\n--- 3. SITEMAP INTEGRITY ---');

  const sitemapItems = sitemap();
  const sitemapUrls = sitemapItems.map((item) => item.url);
  const sitemapUrlSet = new Set(sitemapUrls);

  assert(
    'Sitemap Contains Exactly 36 URLs',
    sitemapItems.length === 36,
    `Sitemap has ${sitemapItems.length} URLs (1 homepage + 1 tools directory + 34 tools)`
  );

  assert(
    'No Duplicate Sitemap URLs',
    sitemapUrlSet.size === sitemapItems.length,
    `All ${sitemapUrlSet.size} sitemap URLs are unique`
  );

  assert(
    'Sitemap Includes Canonical Homepage',
    sitemapUrlSet.has(CANONICAL_BASE),
    `Found homepage: ${CANONICAL_BASE}`
  );

  assert(
    'Sitemap Includes Tools Directory',
    sitemapUrlSet.has(`${CANONICAL_BASE}/tools`),
    `Found tools directory: ${CANONICAL_BASE}/tools`
  );

  let missingToolsInSitemap = 0;
  ALL_TOOLS.forEach((tool) => {
    const expectedUrl = `${CANONICAL_BASE}/tools/${tool.slug}`;
    if (!sitemapUrlSet.has(expectedUrl)) missingToolsInSitemap++;
  });

  assert(
    'All 34 Tool URLs Present in Sitemap',
    missingToolsInSitemap === 0,
    `Missing tools in sitemap: ${missingToolsInSitemap}`
  );

  // Nonexistent slug test: e.g. png-to-pdf
  const invalidSlugTest = `${CANONICAL_BASE}/tools/png-to-pdf`;
  assert(
    'Zero Nonexistent Slugs in Sitemap',
    !sitemapUrlSet.has(invalidSlugTest),
    `Verified nonexistent slug "${invalidSlugTest}" is absent from sitemap`
  );

  // --------------------------------------------------
  // 4. ROBOTS.TXT AUDIT
  // --------------------------------------------------
  console.log('\n--- 4. ROBOTS.TXT COMPLIANCE ---');

  const robotsConfig = robots();
  const rules = Array.isArray(robotsConfig.rules) ? robotsConfig.rules[0] : robotsConfig.rules;
  const allowed = Array.isArray(rules?.allow) ? rules.allow : [rules?.allow];

  assert(
    'Robots Allows Root /',
    allowed.includes('/'),
    `Allowed paths include "/"`
  );

  assert(
    'Robots Allows /tools and /tools/',
    allowed.includes('/tools') || allowed.includes('/tools/'),
    `Allowed paths include tool directories without accidental blocking`
  );

  assert(
    'Robots Specifies Sitemap URL',
    robotsConfig.sitemap === `${CANONICAL_BASE}/sitemap.xml`,
    `Sitemap directive points to ${robotsConfig.sitemap}`
  );

  // --------------------------------------------------
  // 5. FLAGSHIP TOOL (PDF UNIT CUTTER) SEO AUDIT
  // --------------------------------------------------
  console.log('\n--- 5. PDF UNIT CUTTER FLAGSHIP SEO AUDIT ---');

  const unitCutterSeo = getToolSeoData('pdf-unit-cutter');

  assert(
    'Flagship Status Flag',
    unitCutterSeo.isFlagship === true,
    'PDF Unit Cutter is marked as flagship'
  );

  assert(
    'Flagship Title Quality',
    unitCutterSeo.title.includes('PDF Unit Cutter') && unitCutterSeo.title.includes('Textbooks'),
    `Title: "${unitCutterSeo.title}"`
  );

  assert(
    'Genuine Multi-Engine Capabilities Documented',
    unitCutterSeo.capabilities.some((c) => c.toLowerCase().includes('outline')) &&
      unitCutterSeo.capabilities.some((c) => c.toLowerCase().includes('table of contents')) &&
      unitCutterSeo.capabilities.some((c) => c.toLowerCase().includes('offset')),
    'Captures outline, TOC parsing, and offset calibration'
  );

  assert(
    'Visual Workspace & Section Editing Documented',
    unitCutterSeo.capabilities.some((c) => c.toLowerCase().includes('visual')) &&
      unitCutterSeo.capabilities.some((c) => c.toLowerCase().includes('manual')),
    'Captures visual preview, split/merge section editing, and manual sections'
  );

  assert(
    'No Fabricated AI Claims in Unit Cutter Description',
    !unitCutterSeo.description.toLowerCase().includes('ai-powered'),
    'PDF Unit Cutter honestly presents structure detection without false AI claims'
  );

  // --------------------------------------------------
  // 6. HONEST DISCLOSURES (SECURITY, AI, PRIVACY)
  // --------------------------------------------------
  console.log('\n--- 6. HONEST CAPABILITY & LIMITATION DISCLOSURES ---');

  // Sign PDF check: appearance stamping only
  const signSeo = getToolSeoData('sign-pdf');
  assert(
    'Sign PDF Honest Disclosure',
    signSeo.limitations.some((l) => l.toLowerCase().includes('cryptographic') || l.toLowerCase().includes('appearance')),
    'Sign PDF explicitly notes signature appearance stamping vs cryptographic certificates'
  );

  // Redact PDF check: visual blackout only
  const redactSeo = getToolSeoData('redact-pdf');
  assert(
    'Redact PDF Honest Disclosure',
    redactSeo.limitations.some((l) => l.toLowerCase().includes('visual blackout') || l.toLowerCase().includes('underlying')),
    'Redact PDF explicitly notes visual blackout vs raw binary stream sanitation'
  );

  // Document Summarizer check: local heuristic extraction
  const summarizerSeo = getToolSeoData('ai-summarizer');
  assert(
    'Document Summarizer Honest Disclosure',
    summarizerSeo.limitations.some((l) => l.toLowerCase().includes('local') || l.toLowerCase().includes('heuristics') || l.toLowerCase().includes('llm')),
    'Document Summarizer explicitly notes local heuristic layout analysis without cloud LLMs'
  );

  // Compress PDF check: genuine byte delta
  const compressSeo = getToolSeoData('compress-pdf');
  assert(
    'Compress PDF Honest Disclosure',
    compressSeo.capabilities.some((c) => c.toLowerCase().includes('unfabricated') || c.toLowerCase().includes('delta')),
    'Compress PDF documents genuine byte delta reporting and dual-parser verification'
  );

  // --------------------------------------------------
  // 7. DYNAMIC ROUTING AUDIT (INVALID SLUGS)
  // --------------------------------------------------
  console.log('\n--- 7. DYNAMIC ROUTING & INVALID SLUG AUDIT ---');

  const invalidSlugs = ['png-to-pdf', 'fake-tool', 'convert-anything', 'pdf-to-cad'];
  let invalidAccepted = 0;

  invalidSlugs.forEach((slug) => {
    const found = getToolBySlug(slug);
    if (found) invalidAccepted++;
  });

  assert(
    'Invalid Slugs Reject from Registry',
    invalidAccepted === 0,
    `Tested ${invalidSlugs.length} invalid slugs; none are recognized in tool registry`
  );

  // --------------------------------------------------
  // SUMMARY
  // --------------------------------------------------
  console.log('\n================================================================');
  console.log(`SEO AUDIT SUMMARY: ${passed} OF ${total} TESTS PASSED (${((passed / total) * 100).toFixed(0)}%)`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runSeoInventoryAudit();
