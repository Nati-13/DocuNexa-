import { DetectedPart, ConfidenceLevel, PageTextData } from '@/types';

// Map of word numbers to integers
const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
};

const ROMAN_NUMERALS: Record<string, number> = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
  x: 10,
  xi: 11,
  xii: 12,
  xiii: 13,
  xiv: 14,
  xv: 15,
  xvi: 16,
  xvii: 17,
  xviii: 18,
  xix: 19,
  xx: 20,
};

export interface RawHeadingMatch {
  pageNumber: number;
  prefix: string; // e.g., 'UNIT', 'Chapter', 'Module', 'Lesson'
  numberValue: number;
  numberRaw: string; // e.g., '1', 'ONE', 'I'
  title: string;
  confidence: ConfidenceLevel;
  matchedLine: string;
  lineIndex: number;
  source: 'heading' | 'toc';
}

/**
 * Words/patterns that indicate a conversational sentence rather than a true heading
 */
const FALSE_POSITIVE_PREFIXES = [
  /^(in|as|according to|refer to|see|look at|review|from|during|end of|summary of|questions for|exercises in|throughout|after|before)\s+/i,
  /^(we learned in|as discussed in|as seen in|as shown in|covered in|introduced in)\s+/i,
  /^(note:|important:|recall that|remember:)\s+/i,
];

const FALSE_POSITIVE_POSTFIXES = [
  /\b(we learned|we will learn|is discussed|was introduced|covers|explores|includes|focuses on|describes|contains|shows|consists of|deals with)\b/i,
  /\b(review\s+questions|review\s+exercises|practice\s+problems|end\s+of\s+chapter|chapter\s+review|unit\s+review|study\s+guide|self-test|self-assessment)\b/i,
  /\b(exercises|questions|problems|summary|review|glossary|index|notes|page|pages|fig|figure|table)\s*$/i,
];

/**
 * Regex for standard headings:
 * Matches:
 * "UNIT 1: INTRODUCTION TO BIOLOGY"
 * "Unit 1 - Biology Basics"
 * "CHAPTER ONE   CELL STRUCTURE"
 * "Module 2. Photosynthesis"
 * "Lesson 3: Genetics"
 * "UNIT IV"
 */
const HEADING_REGEX =
  /^\s*(UNIT|CHAPTER|MODULE|LESSON|PART)\s+([0-9]{1,3}|[IVXLCDM]{1,6}|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|ELEVEN|TWELVE|THIRTEEN|FOURTEEN|FIFTEEN|SIXTEEN|SEVENTEEN|EIGHTEEN|NINETEEN|TWENTY)\b[:.\-–—\s]*(.*)$/i;

/**
 * Parses numeric value from string (e.g. '1', 'one', 'IV')
 */
export function parseUnitNumber(raw: string): number | null {
  const clean = raw.trim().toLowerCase();
  
  const intVal = parseInt(clean, 10);
  if (!isNaN(intVal)) {
    return intVal;
  }

  if (WORD_NUMBERS[clean] !== undefined) {
    return WORD_NUMBERS[clean];
  }

  if (ROMAN_NUMERALS[clean] !== undefined) {
    return ROMAN_NUMERALS[clean];
  }

  return null;
}

/**
 * Evaluates whether a line is a genuine unit/chapter heading vs conversational sentence
 */
export function isGenuineHeading(
  line: string,
  lineIndex: number,
  totalLinesOnPage: number
): RawHeadingMatch | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3) return null;

  // Rule 1: Check false positive sentence prefixes (e.g., "In Unit 2 we learned...")
  for (const regex of FALSE_POSITIVE_PREFIXES) {
    if (regex.test(trimmed)) {
      return null;
    }
  }

  // Rule 2: Check false positive sentence postfixes / verbs
  for (const regex of FALSE_POSITIVE_POSTFIXES) {
    if (regex.test(trimmed)) {
      return null;
    }
  }

  // Rule 3: Regular match against heading patterns
  const match = trimmed.match(HEADING_REGEX);
  if (!match) return null;

  const prefix = match[1].trim();
  const rawNum = match[2].trim();
  let title = match[3] ? match[3].trim() : '';

  const numVal = parseUnitNumber(rawNum);
  if (numVal === null) return null;

  // Clean title from punctuation at start/end
  title = title.replace(/^[:.\-–—\s]+/, '').replace(/[:.\-–—\s]+$/, '');

  // If the line is an unusually long paragraph sentence (> 120 chars) with period at end,
  // it is almost certainly a paragraph rather than a title heading
  if (trimmed.length > 120 && trimmed.endsWith('.')) {
    return null;
  }

  // Confidence scoring heuristics
  let confidence: ConfidenceLevel = 'Medium';

  // High confidence if:
  // - Appears in top 35% of the page
  // - Is all uppercase or Title Case
  // - Has an explicit title or separator
  const isTop = lineIndex <= Math.max(3, Math.floor(totalLinesOnPage * 0.35));
  const isUpper = prefix === prefix.toUpperCase();
  const hasTitle = title.length > 0;

  if (isTop && (isUpper || hasTitle)) {
    confidence = 'High';
  } else if (!isTop && !hasTitle) {
    confidence = 'Low';
  }

  return {
    pageNumber: 0, // Assigned by caller
    prefix,
    numberValue: numVal,
    numberRaw: rawNum,
    title: title ? `${prefix} ${rawNum} – ${title}` : `${prefix} ${rawNum}`,
    confidence,
    matchedLine: trimmed,
    lineIndex,
    source: 'heading',
  };
}

/**
 * Checks for Table of Contents on early pages and extracts entries
 */
export function extractTocEntries(pages: PageTextData[]): RawHeadingMatch[] {
  const tocMatches: RawHeadingMatch[] = [];

  // Inspect first 15 pages for TOC
  const maxTocPages = Math.min(pages.length, 15);
  for (let i = 0; i < maxTocPages; i++) {
    const page = pages[i];
    const upperText = page.rawText.toUpperCase();
    const isTocPage =
      upperText.includes('CONTENTS') ||
      upperText.includes('TABLE OF CONTENTS') ||
      upperText.includes('SOMMAIRE');

    if (!isTocPage) continue;

    // Scan lines in TOC for entries like: "Unit 1: Basic Principles ..... 14"
    for (let l = 0; l < page.lines.length; l++) {
      const line = page.lines[l].trim();
      const tocRegex =
        /^(UNIT|CHAPTER|MODULE|LESSON|PART)\s+([0-9]{1,3}|[IVXLCDM]{1,6}|ONE|TWO|THREE|FOUR|FIVE)\b[:.\-–—\s]*(.*?)[.\s_]{2,}(\d{1,4})\s*$/i;
      const tocMatch = line.match(tocRegex);

      if (tocMatch) {
        const prefix = tocMatch[1];
        const rawNum = tocMatch[2];
        const rawTitle = tocMatch[3].trim();
        const targetPage = parseInt(tocMatch[4], 10);
        const numVal = parseUnitNumber(rawNum);

        if (numVal !== null && !isNaN(targetPage) && targetPage > 0) {
          tocMatches.push({
            pageNumber: targetPage,
            prefix,
            numberValue: numVal,
            numberRaw: rawNum,
            title: rawTitle ? `${prefix} ${rawNum} – ${rawTitle}` : `${prefix} ${rawNum}`,
            confidence: 'High',
            matchedLine: line,
            lineIndex: l,
            source: 'toc',
          });
        }
      }
    }
  }

  return tocMatches;
}

/**
 * Scans all pages to detect units and chapters, merges TOC and body headings,
 * and creates contiguous or bounded page ranges.
 */
export function detectDocumentUnits(
  pages: PageTextData[],
  totalPages: number,
  originalFilename = 'Document'
): { parts: DetectedPart[]; hasFrontMatter: boolean; frontMatterRange?: { start: number; end: number } } {
  const rawHeadings: RawHeadingMatch[] = [];

  // 1. Scan page by page for headings
  for (const page of pages) {
    for (let l = 0; l < page.lines.length; l++) {
      const line = page.lines[l];
      const match = isGenuineHeading(line, l, page.lines.length);
      if (match) {
        match.pageNumber = page.pageNumber;
        rawHeadings.push(match);
        // Usually only one primary unit heading per page
        break;
      }
    }
  }

  // 2. Check TOC
  const tocEntries = extractTocEntries(pages);

  // 3. Merge or consolidate headings
  // Group by (prefix + numberValue)
  const candidateMap = new Map<string, RawHeadingMatch>();

  // Prioritize physical page headings, verify with TOC
  for (const heading of rawHeadings) {
    const key = `${heading.prefix.toLowerCase()}_${heading.numberValue}`;
    if (!candidateMap.has(key)) {
      candidateMap.set(key, heading);
    } else {
      // Keep earliest page if repeated
      const existing = candidateMap.get(key)!;
      if (heading.pageNumber < existing.pageNumber) {
        candidateMap.set(key, heading);
      }
    }
  }

  // Complement with TOC entries if not found in body
  for (const toc of tocEntries) {
    const key = `${toc.prefix.toLowerCase()}_${toc.numberValue}`;
    if (!candidateMap.has(key) && toc.pageNumber <= totalPages) {
      candidateMap.set(key, toc);
    }
  }

  // Sort candidates by page number
  const sortedCandidates = Array.from(candidateMap.values()).sort(
    (a, b) => a.pageNumber - b.pageNumber
  );

  // If no units found, return a default single part covering entire PDF
  if (sortedCandidates.length === 0) {
    const baseName = originalFilename.replace(/\.pdf$/i, '');
    return {
      parts: [
        {
          id: `part-${Date.now()}-1`,
          title: baseName || 'Full Document',
          startPage: 1,
          endPage: totalPages,
          filename: `${baseName || 'Document'}.pdf`,
          confidence: 'Medium',
          source: 'manual',
        },
      ],
      hasFrontMatter: false,
    };
  }

  // 4. Calculate page ranges
  const parts: DetectedPart[] = [];
  const baseName = originalFilename.replace(/\.pdf$/i, '').trim();

  // Check front matter (pages before the first detected unit)
  const firstUnitStart = sortedCandidates[0].pageNumber;
  const hasFrontMatter = firstUnitStart > 1;
  const frontMatterRange = hasFrontMatter
    ? { start: 1, end: firstUnitStart - 1 }
    : undefined;

  for (let i = 0; i < sortedCandidates.length; i++) {
    const current = sortedCandidates[i];
    const startPage = current.pageNumber;
    
    // End page is one before the next unit, or totalPages for the last unit
    let endPage = totalPages;
    if (i < sortedCandidates.length - 1) {
      const next = sortedCandidates[i + 1];
      endPage = Math.max(startPage, next.pageNumber - 1);
    }

    // Default filename
    const safeTitle = current.title.replace(/[:\-–—\s]+/g, ' ').trim();
    const filename = `${safeTitle}.pdf`;

    parts.push({
      id: `part-${Date.now()}-${i + 1}`,
      title: current.title,
      startPage,
      endPage,
      filename,
      confidence: current.confidence,
      source: current.source,
      originalHeading: current.matchedLine,
    });
  }

  return {
    parts,
    hasFrontMatter,
    frontMatterRange,
  };
}
