import { 
  sanitizeFilename, 
  validateParts 
} from '../src/lib/validator';
import { 
  isGenuineHeading, 
  parseUnitNumber 
} from '../src/lib/detector';
import { DetectedPart } from '../src/types';

function runTests() {
  console.log('=== RUNNING UNIT DETECTOR & VALIDATOR TESTS ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName}`);
      failed++;
    }
  }

  // --- Test 1: Filename Sanitization ---
  console.log('--- Filename Sanitization ---');
  const dirtyName = 'Unit <1>: "Cell" / Biology *?| test.pdf';
  const cleanName = sanitizeFilename(dirtyName);
  assert(!/[<>:"/\\|?*]/.test(cleanName), 'Sanitizes all Windows illegal characters');
  assert(cleanName.endsWith('.pdf'), 'Ensures .pdf extension');
  assert(sanitizeFilename('my file') === 'my file.pdf', 'Appends .pdf if omitted');
  assert(sanitizeFilename('') === 'output.pdf', 'Falls back for empty name');

  // --- Test 2: Number Parsing ---
  console.log('\n--- Number Parsing ---');
  assert(parseUnitNumber('1') === 1, 'Parses numeric digit');
  assert(parseUnitNumber('ONE') === 1, 'Parses word ONE');
  assert(parseUnitNumber('fourteen') === 14, 'Parses word fourteen');
  assert(parseUnitNumber('IV') === 4, 'Parses Roman numeral IV');
  assert(parseUnitNumber('xii') === 12, 'Parses Roman numeral xii');

  // --- Test 3: Genuine Heading vs False Positive Sentences ---
  console.log('\n--- Genuine Heading vs False Positive Sentences ---');
  
  // Real Headings
  const h1 = isGenuineHeading('UNIT 1: INTRODUCTION TO BIOLOGY', 0, 20);
  assert(h1 !== null && h1.numberValue === 1, 'Detects "UNIT 1: INTRODUCTION TO BIOLOGY"');

  const h2 = isGenuineHeading('Chapter 2 - Cell Structure', 1, 20);
  assert(h2 !== null && h2.numberValue === 2, 'Detects "Chapter 2 - Cell Structure"');

  const h3 = isGenuineHeading('MODULE IV   GENETICS', 0, 15);
  assert(h3 !== null && h3.numberValue === 4, 'Detects "MODULE IV GENETICS"');

  const h4 = isGenuineHeading('Lesson 3. Cellular Respiration', 2, 25);
  assert(h4 !== null && h4.numberValue === 3, 'Detects "Lesson 3. Cellular Respiration"');

  // False Positives that MUST NOT be detected as unit starts
  const fp1 = isGenuineHeading('In Unit 2 we learned that all cells come from preexisting cells.', 10, 25);
  assert(fp1 === null, 'Rejects conversational sentence "In Unit 2 we learned..."');

  const fp2 = isGenuineHeading('As discussed in Chapter 3, enzymes speed up reactions.', 8, 20);
  assert(fp2 === null, 'Rejects "As discussed in Chapter 3..."');

  const fp3 = isGenuineHeading('Refer to Module 1 for background reading.', 5, 20);
  assert(fp3 === null, 'Rejects "Refer to Module 1..."');

  const fp4 = isGenuineHeading('Unit 1 review questions and exercises are listed below.', 15, 20);
  assert(fp4 === null, 'Rejects review questions line "Unit 1 review questions..."');

  // --- Test 4: Validation Engine (Ranges, Overlaps, Gaps, Duplicates) ---
  console.log('\n--- Validation Engine ---');

  const totalPages = 100;
  const sampleParts: DetectedPart[] = [
    {
      id: '1',
      title: 'Unit 1',
      startPage: 1,
      endPage: 25,
      filename: 'Unit 1.pdf',
      confidence: 'High',
    },
    {
      id: '2',
      title: 'Unit 2',
      startPage: 20, // Overlaps with Unit 1 (pages 20-25)
      endPage: 50,
      filename: 'Unit 1.pdf', // Duplicate filename!
      confidence: 'High',
    },
    {
      id: '3',
      title: 'Unit 3',
      startPage: 60, // Gap between 51 and 59!
      endPage: 90,
      filename: 'Unit 3.pdf',
      confidence: 'High',
    },
  ];

  const valResult = validateParts(sampleParts, totalPages);
  
  // Overlap check
  assert(valResult.overlaps.length > 0, 'Detects overlapping page ranges');
  assert(
    valResult.overlaps[0].startPage === 20 && valResult.overlaps[0].endPage === 25,
    'Identifies precise overlapping range [20..25]'
  );

  // Duplicate filename check
  assert(
    valResult.duplicateFilenames.includes('unit 1.pdf'),
    'Detects duplicate filename "Unit 1.pdf"'
  );

  // Gap check
  assert(valResult.gaps.length > 0, 'Detects unassigned page gaps');
  const gapFound = valResult.gaps.some((g) => g.startPage === 51 && g.endPage === 59);
  assert(gapFound, 'Identifies precise gap between pages 51 and 59');

  // Gap after end check (pages 91-100)
  const trailingGap = valResult.gaps.some((g) => g.startPage === 91 && g.endPage === 100);
  assert(trailingGap, 'Identifies trailing gap between pages 91 and 100');

  console.log(`\n================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
