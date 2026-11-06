/**
 * DOCUNEXA — ETHIOPIC & INTERNATIONAL TEXT PDF CUTTER TEST SUITE
 *
 * Verifies:
 * 1. Ethiopic Unicode characters (ሀ..ፐ, ፩..፻) in headings and body text.
 * 2. Mixed Ethiopic and Latin textbook headings:
 *    - "ምዕራፍ 1: Introduction to Ethiopian Biodiversity"
 *    - "ክፍል 2 — Cellular Structure & Function"
 *    - "ትምህርት III: የጄኔቲክስ መሠረተ-ሐሳቦች"
 * 3. Amharic TOC identification:
 *    - "ማውጫ", "የርዕስ ማውጫ", "የይዘት ማውጫ", "ማውጫ (የቀጠለ)"
 * 4. False positive filtering in Amharic text:
 *    - Conversational references ("በምዕራፍ 1 እንደተማርነው...")
 *    - Problem stems ("ጥያቄ 1", "ምሳሌ 2", "መልስ")
 * 5. Page count and extraction boundaries with Ethiopic text content.
 */

import {
  parseUnitNumber,
  isGenuineHeading,
  findTocPageNumbers,
  detectDocumentUnits,
  ETHIOPIC_NUMERALS,
} from '../src/lib/detector';
import { PageTextData } from '../src/types';

let passed = 0;
let total = 0;

function assert(description: string, condition: boolean, details?: string) {
  total++;
  if (condition) {
    console.log(`  ✓ [PASS] ${description}${details ? ` (${details})` : ''}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${description}${details ? ` (${details})` : ''}`);
    process.exitCode = 1;
  }
}

function createPageText(pageNumber: number, lines: string[]): PageTextData {
  return {
    pageNumber,
    rawText: lines.join('\n'),
    lines,
    hasSubstantialText: lines.length > 0 && lines.some((l) => l.trim().length > 0),
  };
}

async function runEthiopicTests() {
  console.log('================================================================');
  console.log(' DOCUNEXA — ETHIOPIC & INTERNATIONAL TEXT DETECTION TESTS       ');
  console.log('================================================================\n');

  // --- 1. ETHIOPIC NUMERALS ---
  console.log('--- 1. ETHIOPIC NUMERALS (፩ to ፶) ---');
  for (const [ethChar, expectedVal] of Object.entries(ETHIOPIC_NUMERALS)) {
    const parsed = parseUnitNumber(ethChar);
    assert(`Ethiopic numeral ${ethChar} parses to ${expectedVal}`, parsed === expectedVal);
  }

  // --- 2. MIXED ETHIOPIC & LATIN HEADINGS ---
  console.log('\n--- 2. ETHIOPIC & MIXED HEADINGS ---');

  const h1 = isGenuineHeading('ምዕራፍ ፩: የሕይወት አመጣጥና ሥነ-ህይወት', 0, 10);
  assert('Detects pure Amharic heading "ምዕራፍ ፩"', Boolean(h1 && h1.numberValue === 1));

  const h2 = isGenuineHeading('ምዕራፍ 2: Introduction to Ethiopian Flora', 0, 10);
  assert('Detects mixed Amharic/English heading "ምዕራፍ 2: Introduction..."', Boolean(h2 && h2.numberValue === 2));

  const h3 = isGenuineHeading('ክፍል ፫ — Ecology and Natural Ecosystems', 1, 15);
  assert('Detects mixed heading "ክፍል ፫ — Ecology..."', Boolean(h3 && h3.numberValue === 3));

  const h4 = isGenuineHeading('ትምህርት 4: Organic Chemistry & Biomolecules', 0, 8);
  assert('Detects mixed heading "ትምህርት 4: Organic Chemistry..."', Boolean(h4 && h4.numberValue === 4));

  // --- 3. FALSE POSITIVE REJECTION IN AMHARIC PROSE ---
  console.log('\n--- 3. AMHARIC FALSE POSITIVE REJECTION ---');

  // Paragraph mentions should not trigger heading detection
  const fp1 = isGenuineHeading('በምዕራፍ 1 እንደተመለከትነው የሴል አወቃቀር ወሳኝ ነው።', 5, 20);
  assert('Rejects narrative mention "በምዕራፍ 1 እንደተመለከትነው..."', fp1 === null);

  const fp2 = isGenuineHeading('ጥያቄ 1: የሕዋስ ክፍሎችን ዘርዝሩ', 2, 10);
  assert('Rejects question stem "ጥያቄ 1..."', fp2 === null);

  // --- 4. AMHARIC TABLE OF CONTENTS & OFFSET ---
  console.log('\n--- 4. AMHARIC TABLE OF CONTENTS CALIBRATION ---');

  const pages: PageTextData[] = [
    createPageText(1, ['የኢትዮጵያ ሥነ-ሕይወት መማሪያ መጽሐፍ', '10ኛ ክፍል']),
    createPageText(2, [
      'ማውጫ',
      'ምዕራፍ ፩: የሕይወት አመጣጥ ................................. 1',
      'ምዕራፍ ፪: የዕፅዋት አወቃቀር ................................. 35',
      'ምዕራፍ ፫: የሰው ልጅ ፊዚዮሎጂ ............................... 75',
    ]),
    createPageText(3, ['መቅድም', 'ይህ መጽሐፍ ለ10ኛ ክፍል ተማሪዎች የተዘጋጀ ነው።']),
    createPageText(4, ['የምስጋና ቃል', 'ደራሲያን...']),
    // Printed page 1 starts on physical page 5 (offset = +4)
    createPageText(5, ['ምዕራፍ ፩: የሕይወት አመጣጥ', 'ይዘት መግለጫ']),
    createPageText(39, ['ምዕራፍ ፪: የዕፅዋት አወቃቀር', 'ስለ ዕፅዋት...']),
    createPageText(79, ['ምዕራፍ ፫: የሰው ልጅ ፊዚዮሎጂ', 'ስለ ሰውነት...']),
  ];

  // Fill in dummy pages up to 120
  const fullPages: PageTextData[] = [];
  for (let p = 1; p <= 120; p++) {
    const existing = pages.find((pg) => pg.pageNumber === p);
    fullPages.push(existing || createPageText(p, [`ገጽ ${p} ይዘት...`]));
  }

  const tocPages = findTocPageNumbers(fullPages);
  assert('Identifies Amharic TOC page 2 with "ማውጫ"', tocPages.has(2));

  const result = detectDocumentUnits(fullPages, 120, 'AmharicBiology.pdf');
  assert('Detects front matter range [1..4]', result.hasFrontMatter && result.frontMatterRange?.end === 4);
  assert('Unit 1 starts on physical page 5 (calibrated with printed page 1)', result.parts[0]?.startPage === 5);
  assert('Unit 1 ends on physical page 38', result.parts[0]?.endPage === 38);
  assert('Unit 2 starts on physical page 39 (calibrated with printed page 35)', result.parts[1]?.startPage === 39);
  assert('Unit 2 ends on physical page 78', result.parts[1]?.endPage === 78);
  assert('Unit 3 starts on physical page 79 (calibrated with printed page 75)', result.parts[2]?.startPage === 79);
  assert('Unit 3 ends on physical page 120', result.parts[2]?.endPage === 120);

  console.log('\n================================================================');
  console.log(` ETHIOPIC TEXT DETECTION TESTS: ${passed} of ${total} passed (${Math.round((passed / total) * 100)}%)`);
  if (passed === total) {
    console.log(' ALL ETHIOPIC & INTERNATIONAL TEXT TESTS PASSED 100%!');
    console.log('================================================================\n');
  } else {
    console.error(` FAILURES: ${total - passed}`);
    process.exitCode = 1;
  }
}

runEthiopicTests().catch((err) => {
  console.error('Fatal error in Ethiopic tests:', err);
  process.exit(1);
});
