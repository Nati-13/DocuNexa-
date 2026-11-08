/**
 * DOCUNEXA — GEOGRAPHY TEXTBOOK STRICT HIERARCHICAL ACCEPTANCE TEST
 *
 * Verifies the 214-page Geography textbook acceptance scenario:
 * - Exactly 8 units detected (UNIT ONE through UNIT EIGHT)
 * - Front matter strictly identified as pages 1–6
 * - UNIT ONE spans physical pages 7–30 (24 pages)
 * - Pages 28–30 (Review Questions, Part I: True or False, Part II: Multiple Choice, Part III: Fill in the blank)
 *   belong strictly inside UNIT ONE and DO NOT become separate output files
 * - UNIT TWO: 31–56 (26 pages)
 * - UNIT THREE: 57–92 (36 pages)
 * - UNIT FOUR: 93–124 (32 pages)
 * - UNIT FIVE: 125–150 (26 pages)
 * - UNIT SIX: 151–166 (16 pages)
 * - UNIT SEVEN: 167–180 (14 pages)
 * - UNIT EIGHT: 181–214 (34 pages)
 * - Real PDF generation & physical page slicing verification with pdf-lib
 * - Multilingual Level 3 exercise rejection across all 10 supported languages
 * - Level 2 subsection & decimal rejection regression suite
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  detectDocumentUnits,
  isGenuineHeading,
  isExerciseOrReviewLine,
  isSectionOrSubheadingLine,
  classifyHeadingPrefix,
} from '../src/lib/detector';
import { extractPdfRange, executeCutPlan } from '../src/lib/cutter';
import { PageTextData, DetectedPart } from '../src/types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
    failed++;
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

/**
 * Builds the synthetic 214-page Geography Textbook data.
 */
function buildGeographyPagesData(): PageTextData[] {
  const pages: PageTextData[] = [];

  for (let p = 1; p <= 214; p++) {
    const lines: string[] = [];

    if (p === 1) {
      // Cover
      lines.push('GEOGRAPHY STUDENT TEXTBOOK');
      lines.push('GRADE 10');
      lines.push('FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA MINISTRY OF EDUCATION');
    } else if (p === 2) {
      // Copyright & Acknowledgements
      lines.push('Copyright © 2024 Ministry of Education');
      lines.push('All rights reserved.');
      lines.push('Published by DocuNexa Academic Press');
    } else if (p === 3) {
      // Table of Contents
      lines.push('TABLE OF CONTENTS');
      lines.push('UNIT ONE: INTRODUCTION TO GEOGRAPHY ................... 1');
      lines.push('  1.1 The Meaning of Geography ....................... 1');
      lines.push('  1.2 The Scope of Geography ......................... 8');
      lines.push('  1.3 Branches of Geography .......................... 15');
      lines.push('  Unit 1 Review Questions ............................ 22');
      lines.push('UNIT TWO: THE PHYSICAL ENVIRONMENT .................... 25');
      lines.push('UNIT THREE: HUMAN POPULATION .......................... 51');
      lines.push('UNIT FOUR: ECONOMIC ACTIVITIES ........................ 87');
      lines.push('UNIT FIVE: NATURAL RESOURCES .......................... 119');
      lines.push('UNIT SIX: ENVIRONMENTAL ISSUES ........................ 145');
      lines.push('UNIT SEVEN: CONTEMPORARY ISSUES ....................... 161');
      lines.push('UNIT EIGHT: GEOGRAPHIC INQUIRY ........................ 175');
    } else if (p >= 4 && p <= 6) {
      // Front matter: Preface and Introduction
      lines.push('PREFACE');
      lines.push('How to use this textbook');
      lines.push('Curriculum Framework for Ethiopian Secondary Education');
    } else if (p === 7) {
      // Physical start of Unit 1
      lines.push('UNIT ONE');
      lines.push('INTRODUCTION TO GEOGRAPHY');
      lines.push('1.1 The Meaning of Geography');
    } else if (p >= 8 && p <= 27) {
      // Unit 1 body pages
      lines.push(`Unit 1: Introduction to Geography - Page ${p}`);
      lines.push(`1.${(p % 4) + 1} Geographical concepts and spatial relationships`);
      lines.push('Geography investigates spatial patterns on the Earth surface.');
    } else if (p === 28) {
      // Unit 1 review: True/False
      lines.push('Unit 1 Review Questions');
      lines.push('Part I: True or False');
      lines.push('Direction: Write True if the statement is correct and False if it is incorrect.');
      lines.push('1. Geography is purely a physical science.');
    } else if (p === 29) {
      // Unit 1 review: Multiple Choice
      lines.push('Part II: Multiple Choice');
      lines.push('Direction: Choose the best answer from the given alternatives.');
      lines.push('1. Which branch of geography studies atmospheric phenomena?');
    } else if (p === 30) {
      // Unit 1 review: Fill in the blank
      lines.push('Part III: Fill in the blank');
      lines.push('Direction: Fill in the blank spaces with appropriate geographical terms.');
      lines.push('1. The ratio of map distance to ground distance is called _______.');
    } else if (p === 31) {
      // Physical start of Unit 2
      lines.push('UNIT TWO');
      lines.push('THE PHYSICAL ENVIRONMENT');
      lines.push('2.1 Landforms of the Earth');
    } else if (p >= 32 && p <= 56) {
      // Unit 2 body and review
      if (p === 55) {
        lines.push('Unit 2 Review Exercises');
        lines.push('Part I: True or False');
      } else if (p === 56) {
        lines.push('Part II: Multiple Choice Questions');
      } else {
        lines.push(`Unit 2: The Physical Environment - Page ${p}`);
        lines.push('Tectonic plates and volcanic formations.');
      }
    } else if (p === 57) {
      // Physical start of Unit 3
      lines.push('UNIT THREE');
      lines.push('HUMAN POPULATION');
      lines.push('3.1 Global Demographic Trends');
    } else if (p >= 58 && p <= 92) {
      if (p === 91) {
        lines.push('Unit 3 Review Questions');
      } else if (p === 92) {
        lines.push('Part I: Multiple Choice');
      } else {
        lines.push(`Unit 3: Human Population - Page ${p}`);
        lines.push('Population density and migration patterns.');
      }
    } else if (p === 93) {
      // Physical start of Unit 4
      lines.push('UNIT FOUR');
      lines.push('ECONOMIC ACTIVITIES');
      lines.push('4.1 Primary and Secondary Sectors');
    } else if (p >= 94 && p <= 124) {
      if (p === 124) {
        lines.push('Chapter 4 Review Exercises');
      } else {
        lines.push(`Unit 4: Economic Activities - Page ${p}`);
        lines.push('Agricultural distribution and industrial zones.');
      }
    } else if (p === 125) {
      // Physical start of Unit 5
      lines.push('UNIT FIVE');
      lines.push('NATURAL RESOURCES');
      lines.push('5.1 Renewable and Non-renewable Resources');
    } else if (p >= 126 && p <= 150) {
      if (p === 150) {
        lines.push('Unit 5 Summary and Exercises');
      } else {
        lines.push(`Unit 5: Natural Resources - Page ${p}`);
        lines.push('Water, mineral and forest resource conservation.');
      }
    } else if (p === 151) {
      // Physical start of Unit 6
      lines.push('UNIT SIX');
      lines.push('ENVIRONMENTAL ISSUES');
      lines.push('6.1 Global Warming and Deforestation');
    } else if (p >= 152 && p <= 166) {
      if (p === 166) {
        lines.push('Unit 6 Review Questions');
      } else {
        lines.push(`Unit 6: Environmental Issues - Page ${p}`);
        lines.push('Mitigation strategies for climate change.');
      }
    } else if (p === 167) {
      // Physical start of Unit 7
      lines.push('UNIT SEVEN');
      lines.push('CONTEMPORARY ISSUES');
      lines.push('7.1 Urbanization and Sustainable Development');
    } else if (p >= 168 && p <= 180) {
      if (p === 180) {
        lines.push('Unit 7 Self-Assessment Questions');
      } else {
        lines.push(`Unit 7: Contemporary Issues - Page ${p}`);
        lines.push('Regional integration and urban resilience.');
      }
    } else if (p === 181) {
      // Physical start of Unit 8
      lines.push('UNIT EIGHT');
      lines.push('GEOGRAPHIC INQUIRY');
      lines.push('8.1 Geographic Information Systems (GIS)');
    } else if (p >= 182 && p <= 214) {
      if (p === 213) {
        lines.push('Unit 8 Review Questions');
        lines.push('Part I: True/False Questions');
      } else if (p === 214) {
        lines.push('Part II: Multiple Choice and Inquiry Projects');
      } else {
        lines.push(`Unit 8: Geographic Inquiry - Page ${p}`);
        lines.push('Remote sensing and cartographic analysis.');
      }
    }

    pages.push(createPageText(p, lines));
  }

  return pages;
}

/**
 * Creates a real 214-page PDF with pdf-lib to test physical slicing.
 */
async function createSyntheticGeographyPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  for (let p = 1; p <= 214; p++) {
    const page = doc.addPage([595.28, 841.89]);
    const { height } = page.getSize();

    if (p === 1) {
      page.drawText('GEOGRAPHY STUDENT TEXTBOOK - GRADE 10', {
        x: 50,
        y: height - 100,
        size: 18,
        font: boldFont,
        color: rgb(0.1, 0.2, 0.5),
      });
    } else if (p === 7) {
      page.drawText('UNIT ONE: INTRODUCTION TO GEOGRAPHY', {
        x: 50,
        y: height - 80,
        size: 16,
        font: boldFont,
      });
    } else if (p === 28) {
      page.drawText('Part I: True or False', {
        x: 50,
        y: height - 80,
        size: 14,
        font: boldFont,
      });
    } else if (p === 31) {
      page.drawText('UNIT TWO: THE PHYSICAL ENVIRONMENT', {
        x: 50,
        y: height - 80,
        size: 16,
        font: boldFont,
      });
    } else if (p === 57) {
      page.drawText('UNIT THREE: HUMAN POPULATION', {
        x: 50,
        y: height - 80,
        size: 16,
        font: boldFont,
      });
    } else if (p === 93) {
      page.drawText('UNIT FOUR: ECONOMIC ACTIVITIES', {
        x: 50,
        y: height - 80,
        size: 16,
        font: boldFont,
      });
    } else if (p === 125) {
      page.drawText('UNIT FIVE: NATURAL RESOURCES', {
        x: 50,
        y: height - 80,
        size: 16,
        font: boldFont,
      });
    } else if (p === 151) {
      page.drawText('UNIT SIX: ENVIRONMENTAL ISSUES', {
        x: 50,
        y: height - 80,
        size: 16,
        font: boldFont,
      });
    } else if (p === 167) {
      page.drawText('UNIT SEVEN: CONTEMPORARY ISSUES', {
        x: 50,
        y: height - 80,
        size: 16,
        font: boldFont,
      });
    } else if (p === 181) {
      page.drawText('UNIT EIGHT: GEOGRAPHIC INQUIRY', {
        x: 50,
        y: height - 80,
        size: 16,
        font: boldFont,
      });
    } else {
      page.drawText(`Geography Grade 10 - Page ${p} of 214`, {
        x: 50,
        y: height - 50,
        size: 10,
        font,
      });
    }
  }

  return await doc.save();
}

async function runGeographyAcceptanceTests() {
  console.log('================================================================');
  console.log(' DOCUNEXA — GEOGRAPHY TEXTBOOK STRICT HIERARCHY ACCEPTANCE TEST ');
  console.log('================================================================\n');

  const pagesData = buildGeographyPagesData();
  const totalPages = 214;

  console.log('--- 1. Geography 214-Page Unit Detection Acceptance ---');
  const result = detectDocumentUnits(pagesData, totalPages, 'Geography_Grade_10.pdf');

  // Core requirement: Exactly 8 units detected
  assert(result.parts.length === 8, `Detected exactly 8 units (got ${result.parts.length})`);
  assert(result.hasFrontMatter === true, 'Correctly identified front matter presence');
  assert(
    result.frontMatterRange?.start === 1 && result.frontMatterRange?.end === 6,
    `Front matter range is [1..6] (got [${result.frontMatterRange?.start}..${result.frontMatterRange?.end}])`
  );

  // Expected 8 units specification table
  const expectedUnits = [
    { num: 1, name: 'UNIT ONE', start: 7, end: 30, expectedPages: 24 },
    { num: 2, name: 'UNIT TWO', start: 31, end: 56, expectedPages: 26 },
    { num: 3, name: 'UNIT THREE', start: 57, end: 92, expectedPages: 36 },
    { num: 4, name: 'UNIT FOUR', start: 93, end: 124, expectedPages: 32 },
    { num: 5, name: 'UNIT FIVE', start: 125, end: 150, expectedPages: 26 },
    { num: 6, name: 'UNIT SIX', start: 151, end: 166, expectedPages: 16 },
    { num: 7, name: 'UNIT SEVEN', start: 167, end: 180, expectedPages: 14 },
    { num: 8, name: 'UNIT EIGHT', start: 181, end: 214, expectedPages: 34 },
  ];

  for (let i = 0; i < expectedUnits.length; i++) {
    const exp = expectedUnits[i];
    const actual = result.parts[i];

    assert(Boolean(actual), `Unit ${exp.num} exists in output list`);
    if (!actual) continue;

    assert(
      actual.startPage === exp.start,
      `Unit ${exp.num} (${exp.name}) starts on page ${exp.start} (got ${actual.startPage})`
    );
    assert(
      actual.endPage === exp.end,
      `Unit ${exp.num} (${exp.name}) ends on page ${exp.end} (got ${actual.endPage})`
    );

    const actualPages = actual.endPage - actual.startPage + 1;
    assert(
      actualPages === exp.expectedPages,
      `Unit ${exp.num} spans exactly ${exp.expectedPages} pages (got ${actualPages})`
    );
  }

  console.log('\n--- 2. Pages 28–30 Exercise Rejection & Boundary Protection ---');
  // Pages 28-30 MUST remain inside Unit 1 and must not become separate output files
  const partsStartingOnExercisePages = result.parts.filter(
    (p) => p.startPage >= 28 && p.startPage <= 30
  );
  assert(
    partsStartingOnExercisePages.length === 0,
    `Zero separate output units created for exercise pages 28–30 (got ${partsStartingOnExercisePages.length})`
  );

  const unitOne = result.parts[0];
  assert(
    unitOne.startPage <= 28 && unitOne.endPage >= 30,
    `Pages 28–30 are completely contained inside UNIT ONE [${unitOne.startPage}..${unitOne.endPage}]`
  );

  console.log('\n--- 3. Page Accounting & Zero Gap / Zero Overlap Verification ---');
  let totalAssignedPages = 0;
  for (const part of result.parts) {
    totalAssignedPages += part.endPage - part.startPage + 1;
  }
  assert(
    totalAssignedPages === 208,
    `Total pages across all 8 units = 208 (got ${totalAssignedPages})`
  );

  const frontMatterPages = (result.frontMatterRange?.end || 0) - (result.frontMatterRange?.start || 0) + 1;
  assert(
    frontMatterPages === 6,
    `Front matter pages count = 6 (got ${frontMatterPages})`
  );
  assert(
    totalAssignedPages + frontMatterPages === totalPages,
    `100% of physical pages accounted for: 208 units + 6 front matter = 214 total (got ${totalAssignedPages + frontMatterPages})`
  );

  // Check no gaps between contiguous units
  let hasGaps = false;
  for (let i = 0; i < result.parts.length - 1; i++) {
    if (result.parts[i].endPage + 1 !== result.parts[i + 1].startPage) {
      hasGaps = true;
      console.error(`Gap detected between unit ${i + 1} and ${i + 2}`);
    }
  }
  assert(!hasGaps, 'Zero gaps between contiguous units from page 7 to 214');

  console.log('\n--- 4. Multi-Line Title Resolution ---');
  // Multi-line heading resolution: Unit 1 has "UNIT ONE" on line 0 and "INTRODUCTION TO GEOGRAPHY" on line 1
  assert(
    unitOne.title.includes('INTRODUCTION TO GEOGRAPHY'),
    `Unit 1 title incorporates subtitle from next line: "${unitOne.title}"`
  );

  console.log('\n--- 5. Real Physical PDF Slicing & Byte-Level Page Count Verification ---');
  console.log('  Generating synthetic 214-page PDF with pdf-lib...');
  const syntheticPdfBytes = await createSyntheticGeographyPdf();
  const sourceDoc = await PDFDocument.load(syntheticPdfBytes);
  assert(sourceDoc.getPageCount() === 214, `Synthetic PDF has 214 pages (got ${sourceDoc.getPageCount()})`);

  // Slice each unit and verify actual page count of loaded PDF bytes
  for (let i = 0; i < result.parts.length; i++) {
    const part = result.parts[i];
    const exp = expectedUnits[i];

    const sliceBytes = await extractPdfRange(syntheticPdfBytes, part.startPage, part.endPage);
    const sliceDoc = await PDFDocument.load(sliceBytes);
    const slicePageCount = sliceDoc.getPageCount();

    assert(
      slicePageCount === exp.expectedPages,
      `Extracted PDF slice for Unit ${exp.num} has exactly ${exp.expectedPages} pages (got ${slicePageCount})`
    );
  }

  // Slice front matter [1..6]
  const frontMatterBytes = await extractPdfRange(syntheticPdfBytes, 1, 6);
  const frontMatterDoc = await PDFDocument.load(frontMatterBytes);
  assert(
    frontMatterDoc.getPageCount() === 6,
    `Extracted front matter PDF slice has exactly 6 pages (got ${frontMatterDoc.getPageCount()})`
  );

  console.log('\n--- 6. Multilingual Level 3 Exercise Rejection (All 10 Languages) ---');
  const exerciseTestCases: { lang: string; line: string }[] = [
    // English
    { lang: 'English', line: 'Part I: True or False' },
    { lang: 'English', line: 'Part II: Multiple Choice Questions' },
    { lang: 'English', line: 'Part III: Fill in the Blanks' },
    { lang: 'English', line: 'Unit 1 Review Questions' },
    { lang: 'English', line: 'Chapter Summary and Exercises' },
    { lang: 'English', line: 'Review Exercises' },
    // Amharic
    { lang: 'Amharic', line: 'ክፍል ፩፡ እውነት ወይም ሐሰት' },
    { lang: 'Amharic', line: 'ክፍል ፪፡ ምርጫ' },
    { lang: 'Amharic', line: 'ክፍል ፫፡ ክፍት ቦታውን ሙሉ' },
    { lang: 'Amharic', line: 'የክለሳ ጥያቄዎች' },
    { lang: 'Amharic', line: 'የምዕራፉ ማጠቃለያ' },
    // Tigrinya
    { lang: 'Tigrinya', line: 'ክፍሊ ፩፡ ሓቂ ወይ ሓሶት' },
    { lang: 'Tigrinya', line: 'ክፍሊ ፪፡ ምርጫ' },
    { lang: 'Tigrinya', line: 'ክፉት ቦታ ምምላእ' },
    { lang: 'Tigrinya', line: 'ሕቶታት ክለሳ' },
    // Afaan Oromo
    { lang: 'Oromo', line: 'Kutaa 1: Dhugaa ykn Soba' },
    { lang: 'Oromo', line: 'Kutaa 2: Filannoo' },
    { lang: 'Oromo', line: 'Bakka duwwaa guutuu' },
    { lang: 'Oromo', line: 'Gaaffilee Irra-deebii' },
    // Arabic
    { lang: 'Arabic', line: 'الجزء الأول: صح أم خطأ' },
    { lang: 'Arabic', line: 'الجزء الثاني: اختيار من متعدد' },
    { lang: 'Arabic', line: 'املأ الفراغ' },
    { lang: 'Arabic', line: 'أسئلة المراجعة' },
    { lang: 'Arabic', line: 'ملخص الوحدة' },
    // French
    { lang: 'French', line: 'Partie 1: Vrai ou Faux' },
    { lang: 'French', line: 'Partie 2: Choix multiples' },
    { lang: 'French', line: 'Remplir les blancs' },
    { lang: 'French', line: 'Questions de révision' },
    // Spanish
    { lang: 'Spanish', line: 'Parte 1: Verdadero o Falso' },
    { lang: 'Spanish', line: 'Parte 2: Opción múltiple' },
    { lang: 'Spanish', line: 'Completar los espacios' },
    { lang: 'Spanish', line: 'Preguntas de repaso' },
    // Swahili
    { lang: 'Swahili', line: 'Sehemu ya 1: Kweli au Si kweli' },
    { lang: 'Swahili', line: 'Sehemu ya 2: Chaguo sahihi' },
    { lang: 'Swahili', line: 'Jaza nafasi zilizo wazi' },
    { lang: 'Swahili', line: 'Maswali ya marudio' },
    // Hindi
    { lang: 'Hindi', line: 'भाग 1: सत्य या असत्य' },
    { lang: 'Hindi', line: 'भाग 2: बहुविकल्पी प्रश्न' },
    { lang: 'Hindi', line: 'रिक्त स्थान भरें' },
    { lang: 'Hindi', line: 'पुनरावलोकन प्रश्न' },
    // Chinese
    { lang: 'Chinese', line: '第一部分：判断题' },
    { lang: 'Chinese', line: '第二部分：选择题' },
    { lang: 'Chinese', line: '填空题' },
    { lang: 'Chinese', line: '单元小结' },
    { lang: 'Chinese', line: '复习题' },
  ];

  for (const tc of exerciseTestCases) {
    const isExercise = isExerciseOrReviewLine(tc.line);
    const headingMatch = isGenuineHeading(tc.line, 0, 10);
    assert(
      isExercise && headingMatch === null,
      `[${tc.lang}] Rejects Level 3 exercise: "${tc.line}"`
    );
  }

  console.log('\n--- 7. Level 2 Decimal & Subheading Rejection ---');
  const sectionTestCases = [
    '1.1 Ecosystem Dynamics',
    '2.4 Energy Flow',
    'Section 2.4 - Energy Flow',
    'Unit 1.1 Topic Overview',
    'Chapter 3.2 Cell Division',
    '1.1.2 Climate Zones',
    'Topic 4: Plate Tectonics',
    'Activity 2.3: Soil Sampling',
  ];

  for (const line of sectionTestCases) {
    const headingMatch = isGenuineHeading(line, 0, 10);
    assert(
      headingMatch === null,
      `Rejects Level 2 subsection / decimal heading: "${line}"`
    );
  }

  console.log('\n--- 8. Level 1 vs Level 2 Hierarchy Classification ---');
  assert(classifyHeadingPrefix('UNIT') === 1, 'UNIT classified as Level 1');
  assert(classifyHeadingPrefix('CHAPTER') === 1, 'CHAPTER classified as Level 1');
  assert(classifyHeadingPrefix('MODULE') === 1, 'MODULE classified as Level 1');
  assert(classifyHeadingPrefix('ምዕራፍ') === 1, 'ምዕራፍ (Amharic Chapter) classified as Level 1');
  assert(classifyHeadingPrefix('አሃድ') === 1, 'አሃድ (Amharic Unit) classified as Level 1');
  assert(classifyHeadingPrefix('BOQONNAA') === 1, 'BOQONNAA (Oromo Unit) classified as Level 1');
  assert(classifyHeadingPrefix('الوحدة') === 1, 'الوحدة (Arabic Unit) classified as Level 1');
  assert(classifyHeadingPrefix('CHAPITRE') === 1, 'CHAPITRE (French Chapter) classified as Level 1');
  assert(classifyHeadingPrefix('CAPÍTULO') === 1, 'CAPÍTULO (Spanish Chapter) classified as Level 1');
  assert(classifyHeadingPrefix('SURA') === 1, 'SURA (Swahili Chapter) classified as Level 1');
  assert(classifyHeadingPrefix('इकाई') === 1, 'इकाई (Hindi Unit) classified as Level 1');

  assert(classifyHeadingPrefix('SECTION') === 2, 'SECTION classified as Level 2');
  assert(classifyHeadingPrefix('SUBSECTION') === 2, 'SUBSECTION classified as Level 2');
  assert(classifyHeadingPrefix('TOPIC') === 2, 'TOPIC classified as Level 2');
  assert(classifyHeadingPrefix('LESSON') === 2, 'LESSON classified as Level 2');
  assert(classifyHeadingPrefix('PART') === 2, 'PART classified as Level 2');

  console.log('\n================================================================');
  console.log(`TOTAL ACCEPTANCE TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runGeographyAcceptanceTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
