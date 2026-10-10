import { getPdfJs, getPdfJsDocumentParams } from './pdfReader';
import {
  DocumentSection,
  DocumentStructure,
  DocumentTextClassification,
  DetectionSource,
  StructureValidationResult,
  StructureValidationIssue,
} from '@/types/structure';

// --------------------------------------------------------------------------
// Number & Roman Numeral Parsers
// --------------------------------------------------------------------------
const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
};

const ROMAN_NUMERALS: Record<string, number> = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5,
  vi: 6, vii: 7, viii: 8, ix: 9, x: 10,
  xi: 11, xii: 12, xiii: 13, xiv: 14, xv: 15,
  xvi: 16, xvii: 17, xviii: 18, xix: 19, xx: 20,
};

export function parseNumberString(raw: string): number | null {
  const clean = raw.trim().toLowerCase();
  const intVal = parseInt(clean, 10);
  if (!isNaN(intVal)) return intVal;
  if (WORD_NUMBERS[clean] !== undefined) return WORD_NUMBERS[clean];
  if (ROMAN_NUMERALS[clean] !== undefined) return ROMAN_NUMERALS[clean];
  return null;
}

// --------------------------------------------------------------------------
// Contextual False Positive Rejector
// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// Contextual & Mathematical False Positive Rejector
// --------------------------------------------------------------------------
const FALSE_POSITIVE_PREFIXES = [
  /^(in|as|according to|refer to|see|look at|review|from|during|end of|summary of|questions for|exercises in|throughout|after|before)\s+/i,
  /^(we learned in|as discussed in|as seen in|as shown in|covered in|introduced in)\s+/i,
  /^(note:|important:|recall that|remember:)\s+/i,
  /^(figure|table|chart|box|diagram|plate|map|exhibit)\s+\d+/i,
  /^(exercise|question|problem|activity|assignment|quiz|practice|review)\s+\d+/i,
  /^(step|hint|solution|answer|proof|sample\s+problem)\b/i,
];

const FALSE_POSITIVE_POSTFIXES = [
  /\b(we learned|we will learn|is discussed|was introduced|covers|explores|includes|focuses on|describes|contains|shows|deals with)\b/i,
  /\b(review\s+questions|review\s+exercises|practice\s+problems|end\s+of\s+chapter|chapter\s+review|unit\s+review|self-test)\b/i,
];

/**
 * Rejects conversational sentences, paragraphs, and narrative prose.
 */
export function isConversationalSentence(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  for (const regex of FALSE_POSITIVE_PREFIXES) {
    if (regex.test(trimmed)) return true;
  }
  for (const regex of FALSE_POSITIVE_POSTFIXES) {
    if (regex.test(trimmed)) return true;
  }
  return false;
}

/**
 * Rejects small mathematical expressions, coordinate pairs, isolated numbers,
 * function machine terms (Input/Output), and homework problem stems.
 */
export function isMathematicalOrContentText(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;

  // Coordinate pairs like (2, 4), (-1, 3), (x, y), (0, 0), (2.5, -4.1)
  if (/^\(?\s*[-+]?\d*\.?\d+\s*,\s*[-+]?\d*\.?\d+\s*\)?$/i.test(trimmed)) return true;
  if (/^\(?\s*[a-z]\s*,\s*[a-z]\s*\)?$/i.test(trimmed)) return true;
  if (/^\s*\(?\s*[-+]?\d+\s*,\s*[-+]?\d+\s*\)\s*$/i.test(trimmed)) return true;

  // Single small words or table headers: "Input", "Output", "Domain", "Range", "x", "y"
  if (/^(input|output|domain|range|x|y|z|f\(x\)|g\(x\)|h\(x\)|value|total|sum|result)$/i.test(trimmed)) return true;

  // Function tables / input-output pairs / coordinate pairs with values like "Input 1", "Output 2", "(2, 4) 5"
  if (/^(input|output|domain|range)\s+[-+]?\d+/i.test(trimmed)) return true;
  if (/^\(?\s*[-+]?\d+\s*,\s*[-+]?\d+\s*\)?\s+[-+]?\d+/i.test(trimmed)) return true;

  // Pure isolated numbers: "1", "42", "130", "3.14"
  if (/^[-+]?\d*\.?\d+$/.test(trimmed)) return true;

  // Mathematical equations & formulas: e.g. "f(x) = ...", "y = mx + b", "x^2 + y^2 = 1"
  if (/^[a-z]\([a-z]\)\s*=/i.test(trimmed)) return true;
  if (/^[a-z]\s*=\s*[-+0-9a-z]/i.test(trimmed)) return true;
  if (/[=<>≤≥]/.test(trimmed) && /[+\-*/^0-9]/.test(trimmed)) return true;
  if (/[\^√π±≠≤≥]/.test(trimmed)) return true;
  if (/^[0-9+\-*/=<>^√π±≠≤≥()\s.,]+$/.test(trimmed) && trimmed.length > 2) return true;

  // Math homework / exercise problem stems (e.g. "Let f(x) be...", "1. Let f(x)...", "2. Find...")
  if (
    /^(?:\d{1,3}[.)]\s*)?(let|if|find|solve|calculate|suppose|given|show that|prove that|determine|evaluate|consider|assume|draw|graph|simplify|factor|expand|compute|express|verify)\b/i.test(
      trimmed
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Textbook structural features that belong as subsections (Level 2) under a parent unit
 * and must NEVER be treated as top-level (Level 1) unit headers.
 */
const GENERIC_SUBSECTION_REGEX =
  /^\s*(summary|unit summary|chapter summary|summary of unit|review|unit review|chapter review|review exercises|practice exercises|exercises|key terms|key words|glossary|self-test|self-assessment|activity|activities|project|revision|checklist|example|examples)\b/i;

export function isGenericSubsection(title: string): boolean {
  const clean = title.trim();
  return GENERIC_SUBSECTION_REGEX.test(clean);
}

// --------------------------------------------------------------------------
// Heading Pattern Matcher
// --------------------------------------------------------------------------
const MAJOR_HEADING_REGEX =
  /^\s*(UNIT|CHAPTER|MODULE|LESSON|PART)\s+([0-9]{1,3}|[IVXLCDM]{1,6}|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|ELEVEN|TWELVE|THIRTEEN|FOURTEEN|FIFTEEN|SIXTEEN|SEVENTEEN|EIGHTEEN|NINETEEN|TWENTY)\b[:.\-–—\s]*(.*)$/i;

const NUMBERED_HEADING_REGEX =
  /^\s*(\d{1,2})\.\s+([A-Z][A-Za-z0-9\s,:—–\-]{3,80})$/;

const SUB_SECTION_REGEX =
  /^\s*(\d{1,2}\.\d{1,2})\s+([A-Z][A-Za-z0-9\s,:—–\-]{3,80})$/;

export interface ExtractedPageText {
  pageNumber: number;
  lines: string[];
  charCount: number;
}

// --------------------------------------------------------------------------
// 1. PDF Outline / Bookmarks Extractor
// --------------------------------------------------------------------------
async function resolveOutlineDestination(pdfDoc: any, dest: any): Promise<number | null> {
  if (!dest) return null;
  try {
    let explicitDest = dest;
    if (typeof dest === 'string') {
      explicitDest = await pdfDoc.getDestination(dest);
    }
    if (Array.isArray(explicitDest) && explicitDest.length > 0) {
      const destRef = explicitDest[0];
      if (destRef && typeof destRef === 'object') {
        const pageIndex = await pdfDoc.getPageIndex(destRef);
        if (typeof pageIndex === 'number' && pageIndex >= 0) {
          return pageIndex + 1; // Convert 0-indexed to 1-indexed
        }
      } else if (typeof destRef === 'number' && destRef >= 0) {
        return destRef + 1;
      }
    }
  } catch {
    // Cannot resolve destination directly
  }
  return null;
}

export async function extractOutlineStructure(
  pdfDoc: any,
  totalPages: number
): Promise<DocumentSection[] | null> {
  try {
    const outline = await pdfDoc.getOutline();
    if (!outline || !Array.isArray(outline) || outline.length === 0) {
      return null;
    }

    const flatSections: DocumentSection[] = [];

    async function walkOutline(items: any[], level: number) {
      for (const item of items) {
        if (!item || !item.title) continue;

        const resolvedPage = await resolveOutlineDestination(pdfDoc, item.dest);
        const isUnresolved = resolvedPage === null || resolvedPage < 1 || resolvedPage > totalPages;

        flatSections.push({
          id: `outline-${flatSections.length + 1}`,
          title: item.title.trim(),
          level,
          startPage: isUnresolved ? 1 : (resolvedPage as number),
          endPage: isUnresolved ? 1 : (resolvedPage as number),
          confidence: isUnresolved ? 45 : 95,
          source: 'outline',
          isUnresolved,
          notes: isUnresolved
            ? 'PDF outline bookmark destination could not be directly resolved; page index estimated.'
            : 'Extracted from genuine PDF document outline / bookmarks with verified destination.',
        });

        if (Array.isArray(item.items) && item.items.length > 0) {
          await walkOutline(item.items, level + 1);
        }
      }
    }

    await walkOutline(outline, 1);

    if (flatSections.length === 0) return null;

    // Fix end pages hierarchically based on peer boundaries (same or higher level)
    for (let i = 0; i < flatSections.length; i++) {
      if (flatSections[i].isUnresolved) continue;

      let nextPeerStart = totalPages + 1;
      for (let j = i + 1; j < flatSections.length; j++) {
        if (
          !flatSections[j].isUnresolved &&
          flatSections[j].level <= flatSections[i].level &&
          flatSections[j].startPage > flatSections[i].startPage
        ) {
          nextPeerStart = flatSections[j].startPage;
          break;
        }
      }
      flatSections[i].endPage = Math.max(
        flatSections[i].startPage,
        Math.min(totalPages, nextPeerStart - 1)
      );
    }

    return flatSections;
  } catch (err) {
    console.warn('Could not read PDF outline:', err);
    return null;
  }
}

// --------------------------------------------------------------------------
// 2. Table of Contents (TOC) Detection & Mapping
// --------------------------------------------------------------------------
export interface RawTocEntry {
  title: string;
  printedPageRaw: string;
  printedPageNum: number;
  level: number;
}

export function parseTocLines(lines: string[]): RawTocEntry[] {
  const entries: RawTocEntry[] = [];
  const dotLeaderRegex = /^(.*?)(?:\.{2,}|\s{3,}|\t+)\s*([ivxlcdm]+|\d+)\s*$/i;
  const trailingNumRegex = /^(.*?\b[A-Za-z]+)\s+([0-9]{1,4})\s*$/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      !trimmed ||
      isConversationalSentence(trimmed) ||
      isMathematicalOrContentText(trimmed)
    ) {
      continue;
    }

    let match = dotLeaderRegex.exec(trimmed);
    let matchedWithDotLeader = true;
    if (!match) {
      match = trailingNumRegex.exec(trimmed);
      matchedWithDotLeader = false;
    }

    if (match) {
      const rawTitle = match[1].replace(/[\._\-]+$/, '').trim();
      const rawPage = match[2].trim();
      const num = parseNumberString(rawPage);

      if (rawTitle.length >= 3 && num !== null && num > 0) {
        // Reject if rawTitle itself is math text, single word Input/Output, coordinate, etc.
        if (isMathematicalOrContentText(rawTitle) || isConversationalSentence(rawTitle)) {
          continue;
        }

        // If matched without dot leaders, require a reasonable title pattern (not just any word ending in a number)
        if (!matchedWithDotLeader) {
          // Reject if title is just generic words like "Input", "Output", "Example", "Question", "Figure", "Table"
          if (
            /^(input|output|example|question|problem|figure|table|step|case|part|page|item)$/i.test(
              rawTitle
            )
          ) {
            continue;
          }
          // Reject if title contains math operators or coordinates
          if (/[\(\)=+\-*/<>]/.test(rawTitle)) {
            continue;
          }
        }

        let level = 1;
        // Generic subsections (Summary, Example, Review Exercises) are demoted to level 2
        if (isGenericSubsection(rawTitle)) {
          level = 2;
        } else if (/^\s{2,}|\t/.test(line) || /^\d+\.\d+/.test(rawTitle)) {
          level = 2;
        }

        entries.push({
          title: rawTitle,
          printedPageRaw: rawPage,
          printedPageNum: num,
          level,
        });
      }
    }
  }

  return entries;
}

export async function detectTocStructure(
  pagesText: ExtractedPageText[],
  totalPages: number
): Promise<{ sections: DocumentSection[]; tocPages: number[]; pageOffset?: number } | null> {
  // 1. Identify TOC pages (usually within pages 1-25)
  const tocPages: number[] = [];
  const rawTocEntries: RawTocEntry[] = [];

  for (const p of pagesText) {
    if (p.pageNumber > 25) break;

    const hasTocHeader = p.lines.some((l) =>
      /^\s*(table of contents|contents|directory|sommaire|table des matières)\b/i.test(l.trim())
    );
    const parsed = parseTocLines(p.lines);

    // If page has an explicit TOC header, parsed entries >= 2 are accepted.
    // If NO TOC header, require strict TOC characteristics:
    // - at least 4 entries
    // - entries must have monotonically non-decreasing page numbers (>= 75% non-decreasing)
    // - at least 2 entries with dot leaders or structured unit titles
    let isCredibleTocPage = false;
    if (hasTocHeader && parsed.length >= 2) {
      isCredibleTocPage = true;
    } else if (!hasTocHeader && parsed.length >= 4) {
      let nonDecreasingCount = 0;
      for (let k = 1; k < parsed.length; k++) {
        if (parsed[k].printedPageNum >= parsed[k - 1].printedPageNum) {
          nonDecreasingCount++;
        }
      }
      const isMonotonic = nonDecreasingCount >= Math.floor((parsed.length - 1) * 0.75);
      const hasStructureTitles = parsed.some(
        (e) => MAJOR_HEADING_REGEX.test(e.title) || /^\d+(\.\d+)?\b/.test(e.title)
      );
      if (isMonotonic && hasStructureTitles) {
        isCredibleTocPage = true;
      }
    }

    if (isCredibleTocPage) {
      tocPages.push(p.pageNumber);
      rawTocEntries.push(...parsed);
    }
  }

  if (rawTocEntries.length < 2) {
    return null;
  }

  // Deduplicate entries by normalized title and printed page number
  const seenEntries = new Set<string>();
  const tocEntries: RawTocEntry[] = [];
  for (const entry of rawTocEntries) {
    const key = `${entry.title.toLowerCase().replace(/[^a-z0-9]/g, '')}_${entry.printedPageNum}`;
    if (!seenEntries.has(key)) {
      seenEntries.add(key);
      tocEntries.push(entry);
    }
  }

  if (tocEntries.length < 2) {
    return null;
  }

  // 2. Validate printed page offset
  // For candidate entries, search for matching heading on PDF pages around (printedPageNum + offset)
  let bestOffset: number | null = null;
  let highestMatchCount = 0;

  for (let candidateOffset = 0; candidateOffset <= 30; candidateOffset++) {
    let matches = 0;
    for (const entry of tocEntries.slice(0, 10)) {
      const targetPdfPage = entry.printedPageNum + candidateOffset;
      if (targetPdfPage > 0 && targetPdfPage <= totalPages) {
        const pageData = pagesText.find((p) => p.pageNumber === targetPdfPage);
        if (pageData) {
          const entryTitleLower = entry.title.toLowerCase().replace(/[^a-z0-9]/g, '');
          const majorMatch = MAJOR_HEADING_REGEX.exec(entry.title);
          const prefixKey = majorMatch
            ? `${majorMatch[1].toLowerCase()}${parseNumberString(majorMatch[2])}`
            : '';

          const found = pageData.lines.some((l) => {
            const lineLower = l.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (prefixKey && lineLower.includes(prefixKey)) return true;
            return (
              lineLower.includes(entryTitleLower) ||
              (entryTitleLower.length > 8 && lineLower.includes(entryTitleLower.slice(0, 8)))
            );
          });
          if (found) matches++;
        }
      }
    }
    if (matches > highestMatchCount) {
      highestMatchCount = matches;
      bestOffset = candidateOffset;
    }
  }

  const isOffsetConfident = highestMatchCount >= 2;
  const effectiveOffset = isOffsetConfident && bestOffset !== null ? bestOffset : (bestOffset ?? 0);

  // 3. Construct DocumentSection list from TOC
  const sections: DocumentSection[] = [];

  for (let i = 0; i < tocEntries.length; i++) {
    const entry = tocEntries[i];
    const computedStart = entry.printedPageNum + effectiveOffset;
    const safeStart = Math.max(1, Math.min(totalPages, computedStart));

    let confidence = 70;
    if (isOffsetConfident) {
      confidence = 90;
    } else {
      confidence = 65; // lower confidence when offset is unvalidated
    }

    sections.push({
      id: `toc-${i + 1}`,
      title: entry.title,
      level: entry.level,
      startPage: safeStart,
      endPage: safeStart, // will be resolved in peer pass below
      printedStartPage: entry.printedPageRaw,
      confidence,
      source: 'toc',
      notes: isOffsetConfident
        ? `Mapped from TOC with validated page offset (+${effectiveOffset} pages).`
        : `Candidate from TOC; printed page ${entry.printedPageRaw}. Offset (+${effectiveOffset}) not verified against headings.`,
    });
  }

  // Set peer-based end pages:
  // A section's end is determined by the next peer of the same or higher level
  for (let i = 0; i < sections.length; i++) {
    const current = sections[i];
    let nextPeerStart = totalPages + 1;

    for (let j = i + 1; j < sections.length; j++) {
      if (sections[j].level <= current.level && sections[j].startPage > current.startPage) {
        nextPeerStart = sections[j].startPage;
        break;
      }
    }

    current.endPage = Math.max(current.startPage, Math.min(totalPages, nextPeerStart - 1));
  }

  return {
    sections,
    tocPages,
    pageOffset: effectiveOffset,
  };
}

// --------------------------------------------------------------------------
// 3. Heading & Numbered Structure Detection
// --------------------------------------------------------------------------
export function detectHeadingsStructure(
  pagesText: ExtractedPageText[],
  totalPages: number
): DocumentSection[] {
  const sections: DocumentSection[] = [];
  const seenHeadings = new Set<string>();
  let lastMajorNumber: number | null = null;
  let sequentialCount = 0;

  // Check if document has genuine major headings (Unit / Chapter)
  const hasAnyMajorHeading = pagesText.some((p) =>
    p.lines.some((l) => MAJOR_HEADING_REGEX.test(l.trim()) && !isConversationalSentence(l.trim()))
  );

  for (const page of pagesText) {
    const { pageNumber, lines } = page;

    for (let lineIdx = 0; lineIdx < Math.min(lines.length, 12); lineIdx++) {
      const line = lines[lineIdx].trim();
      if (!line || isConversationalSentence(line) || isMathematicalOrContentText(line)) continue;

      // Check Major Headings (Unit, Chapter, Module)
      const majorMatch = MAJOR_HEADING_REGEX.exec(line);
      if (majorMatch) {
        const prefix = majorMatch[1].toUpperCase();
        const numVal = parseNumberString(majorMatch[2]);
        const titleRest = majorMatch[3].trim();
        const cleanTitle = titleRest
          ? `${prefix} ${majorMatch[2]}: ${titleRest}`
          : `${prefix} ${majorMatch[2]}`;

        // Skip if title rest indicates exercises/review/summary
        const isGenericSub = isGenericSubsection(cleanTitle) || isGenericSubsection(titleRest);
        const headingLevel = isGenericSub ? 2 : 1;

        const dedupeKey = `${cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '')}_${pageNumber}`;
        if (seenHeadings.has(dedupeKey)) break;
        seenHeadings.add(dedupeKey);

        let confidence = 85;
        if (numVal !== null && !isGenericSub) {
          if (lastMajorNumber !== null && numVal === lastMajorNumber + 1) {
            sequentialCount++;
            confidence = Math.min(95, 85 + sequentialCount * 2);
          }
          lastMajorNumber = numVal;
        }

        sections.push({
          id: `heading-${sections.length + 1}`,
          title: cleanTitle,
          level: headingLevel,
          startPage: pageNumber,
          endPage: pageNumber,
          confidence,
          source: 'heading',
          notes: `Detected major heading "${cleanTitle}" on page ${pageNumber}.`,
        });
        break; // Only one major heading per page
      }

      // Check Numbered Subheadings (1.1, 1.2)
      const subMatch = SUB_SECTION_REGEX.exec(line);
      if (subMatch) {
        const subTitle = `${subMatch[1]} ${subMatch[2]}`.trim();
        if (isMathematicalOrContentText(subTitle) || isConversationalSentence(subTitle)) {
          continue;
        }

        const dedupeKey = `${subTitle.toLowerCase().replace(/[^a-z0-9]/g, '')}_${pageNumber}`;
        if (seenHeadings.has(dedupeKey)) break;
        seenHeadings.add(dedupeKey);

        sections.push({
          id: `subheading-${sections.length + 1}`,
          title: subTitle,
          level: 2,
          startPage: pageNumber,
          endPage: pageNumber,
          confidence: 78,
          source: 'heading',
          notes: `Detected section heading "${subTitle}" on page ${pageNumber}.`,
        });
        break;
      }

      // Check Simple Numbered Top-level (1. Introduction)
      const numMatch = NUMBERED_HEADING_REGEX.exec(line);
      if (numMatch && lineIdx < 4) {
        const cleanTitle = `${numMatch[1]}. ${numMatch[2]}`.trim();

        // Reject math problem instructions or conversational lines
        if (isMathematicalOrContentText(cleanTitle) || isConversationalSentence(cleanTitle)) {
          continue;
        }

        // If title is generic subsection (Summary, Example, Review), reject or demote
        if (isGenericSubsection(numMatch[2])) {
          continue;
        }

        const dedupeKey = `${cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '')}_${pageNumber}`;
        if (seenHeadings.has(dedupeKey)) break;
        seenHeadings.add(dedupeKey);

        // If document already uses Unit/Chapter headings, simple numbered headings are level 2
        const assignedLevel = hasAnyMajorHeading ? 2 : 1;

        sections.push({
          id: `numheading-${sections.length + 1}`,
          title: cleanTitle,
          level: assignedLevel,
          startPage: pageNumber,
          endPage: pageNumber,
          confidence: 76,
          source: 'heading',
          notes: `Detected numbered section "${cleanTitle}" on page ${pageNumber}.`,
        });
        break;
      }
    }
  }

  // Adjust end pages hierarchically based on peer boundaries
  for (let i = 0; i < sections.length; i++) {
    const current = sections[i];
    let nextPeerStart = totalPages + 1;
    for (let j = i + 1; j < sections.length; j++) {
      if (sections[j].level <= current.level && sections[j].startPage > current.startPage) {
        nextPeerStart = sections[j].startPage;
        break;
      }
    }
    current.endPage = Math.max(current.startPage, Math.min(totalPages, nextPeerStart - 1));
  }

  return sections;
}

// --------------------------------------------------------------------------
// 4. Document Classification (Text vs Mixed vs Scanned-Only)
// --------------------------------------------------------------------------
export function classifyDocumentText(
  pagesText: ExtractedPageText[]
): DocumentTextClassification {
  if (pagesText.length === 0) return 'scanned-only';

  const totalPagesSampled = pagesText.length;
  let pagesWithSubstantialText = 0;
  let pagesWithZeroText = 0;

  for (const p of pagesText) {
    if (p.charCount > 100) {
      pagesWithSubstantialText++;
    } else if (p.charCount === 0) {
      pagesWithZeroText++;
    }
  }

  if (pagesWithZeroText === totalPagesSampled) {
    return 'scanned-only';
  }

  if (pagesWithSubstantialText === totalPagesSampled) {
    return 'text';
  }

  return 'mixed';
}

// --------------------------------------------------------------------------
// 5. Multi-Stage Detection Pipeline Entry Point
// --------------------------------------------------------------------------
export async function detectDocumentStructure(
  pdfBuffer: ArrayBuffer,
  onProgress?: (pct: number, msg: string) => void
): Promise<DocumentStructure> {
  onProgress?.(5, 'Opening PDF document proxy...');

  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument(getPdfJsDocumentParams(pdfBuffer));
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  onProgress?.(15, 'Checking PDF outline / bookmarks...');

  // 1. Try PDF Outline / Bookmarks first (Priority 1)
  const outlineSections = await extractOutlineStructure(pdfDoc, totalPages);
  if (outlineSections && outlineSections.length >= 2) {
    onProgress?.(100, 'Structure resolved from PDF outline bookmarks.');
    return {
      sections: outlineSections,
      hasOutline: true,
      hasToc: false,
      classification: 'text',
      detectionSummary: `Detected ${outlineSections.length} sections from genuine PDF outline bookmarks with hierarchical nesting.`,
      totalPages,
    };
  }

  onProgress?.(25, 'Sampling text pages across document...');

  // Sample pages: first 30 pages + sampled pages thereafter
  const pagesText: ExtractedPageText[] = [];
  const maxSample = Math.min(totalPages, 30);

  for (let pNum = 1; pNum <= maxSample; pNum++) {
    const page = await pdfDoc.getPage(pNum);
    const content = await page.getTextContent();
    const rawLines: string[] = [];
    let currentLine = '';

    for (const item of content.items) {
      if ('str' in item) {
        currentLine += item.str + ' ';
        if (item.hasEOL) {
          rawLines.push(currentLine.trim());
          currentLine = '';
        }
      }
    }
    if (currentLine.trim()) rawLines.push(currentLine.trim());

    const charCount = rawLines.reduce((acc, l) => acc + l.length, 0);
    pagesText.push({ pageNumber: pNum, lines: rawLines, charCount });

    if (pNum % 5 === 0) {
      const pct = Math.round(25 + (pNum / maxSample) * 35);
      onProgress?.(pct, `Extracting text: page ${pNum} of ${maxSample}...`);
    }
  }

  // 2. Classify document
  const classification = classifyDocumentText(pagesText);

  if (classification === 'scanned-only') {
    onProgress?.(100, 'Scanned document detected.');
    return {
      sections: [],
      hasOutline: false,
      hasToc: false,
      classification: 'scanned-only',
      detectionSummary:
        'This PDF appears to consist entirely of scanned images with no digital text. Automated heading detection cannot run; please use OCR first or create sections manually.',
      totalPages,
    };
  }

  onProgress?.(65, 'Analyzing Table of Contents (TOC)...');

  // 3. Try Table of Contents (Priority 2)
  const tocResult = await detectTocStructure(pagesText, totalPages);
  if (tocResult && tocResult.sections.length >= 2) {
    onProgress?.(100, 'Structure resolved from Table of Contents.');
    return {
      sections: tocResult.sections,
      hasOutline: false,
      hasToc: true,
      classification,
      tocPages: tocResult.tocPages,
      pageOffset: tocResult.pageOffset,
      detectionSummary: `Detected ${tocResult.sections.length} units from Table of Contents with ${
        tocResult.pageOffset !== undefined ? `page offset (+${tocResult.pageOffset} pages)` : 'unverified offset'
      }.`,
      totalPages,
    };
  }

  // 4. Try Headings hierarchy (Priority 3)
  // If TOC did not succeed and totalPages > 30, sample pages across the document for major unit headings
  if ((!tocResult || tocResult.sections.length < 2) && totalPages > 30) {
    onProgress?.(72, 'Scanning document pages for major unit headings...');
    const step = totalPages > 150 ? 2 : 1;
    for (let pNum = 31; pNum <= totalPages; pNum += step) {
      try {
        const page = await pdfDoc.getPage(pNum);
        const content = await page.getTextContent();
        const rawLines: string[] = [];
        let currentLine = '';
        for (const item of content.items) {
          if ('str' in item) {
            currentLine += item.str + ' ';
            if (item.hasEOL) {
              rawLines.push(currentLine.trim());
              currentLine = '';
            }
          }
        }
        if (currentLine.trim()) rawLines.push(currentLine.trim());
        const charCount = rawLines.reduce((acc, l) => acc + l.length, 0);
        pagesText.push({ pageNumber: pNum, lines: rawLines, charCount });
      } catch {
        // Skip inaccessible page
      }
    }
  }

  onProgress?.(85, 'Scanning text heading hierarchy...');

  const headingSections = detectHeadingsStructure(pagesText, totalPages);
  if (headingSections.length >= 2) {
    onProgress?.(100, `Detected ${headingSections.length} units from heading hierarchy.`);
    return {
      sections: headingSections,
      hasOutline: false,
      hasToc: false,
      classification,
      detectionSummary: `Detected ${headingSections.length} sections from sequential page headings.`,
      totalPages,
    };
  }

  // 5. Fallback: No trustworthy structure found
  onProgress?.(100, 'No reliable structure detected.');
  return {
    sections: [],
    hasOutline: false,
    hasToc: false,
    classification,
    detectionSummary:
      'No reliable unit structure was detected. You can define unit sections manually with visual boundary editing.',
    totalPages,
  };
}

// --------------------------------------------------------------------------
// 6. Section Invariants & Mutation Safety
// --------------------------------------------------------------------------
export function validateSectionInvariants(
  sections: DocumentSection[],
  totalPages: number
): StructureValidationResult {
  const issues: StructureValidationIssue[] = [];

  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];

    if (s.startPage < 1) {
      issues.push({
        type: 'error',
        message: `Section "${s.title}" has start page (${s.startPage}) below 1.`,
        sectionId: s.id,
      });
    }

    if (s.endPage > totalPages) {
      issues.push({
        type: 'error',
        message: `Section "${s.title}" has end page (${s.endPage}) exceeding total pages (${totalPages}).`,
        sectionId: s.id,
      });
    }

    if (s.startPage > s.endPage) {
      issues.push({
        type: 'error',
        message: `Section "${s.title}" has invalid range: start page (${s.startPage}) is greater than end page (${s.endPage}).`,
        sectionId: s.id,
      });
    }

    // Check overlapping ranges with subsequent sections
    for (let j = i + 1; j < sections.length; j++) {
      const other = sections[j];
      if (s.startPage <= other.endPage && s.endPage >= other.startPage) {
        issues.push({
          type: 'warning',
          message: `Overlap detected between "${s.title}" (pp. ${s.startPage}–${s.endPage}) and "${other.title}" (pp. ${other.startPage}–${other.endPage}).`,
          sectionId: s.id,
          pages: [Math.max(s.startPage, other.startPage), Math.min(s.endPage, other.endPage)],
        });
      }
    }
  }

  return {
    isValid: !issues.some((i) => i.type === 'error'),
    issues,
  };
}

export function splitSection(
  section: DocumentSection,
  splitPage: number,
  totalPages: number
): [DocumentSection, DocumentSection] {
  const safeSplit = Math.max(section.startPage, Math.min(section.endPage - 1, splitPage));

  const partA: DocumentSection = {
    ...section,
    id: `${section.id}-a`,
    title: `${section.title} (Part 1)`,
    endPage: safeSplit,
    isUserModified: true,
  };

  const partB: DocumentSection = {
    ...section,
    id: `${section.id}-b`,
    title: `${section.title} (Part 2)`,
    startPage: safeSplit + 1,
    endPage: section.endPage,
    isUserModified: true,
  };

  return [partA, partB];
}

export function mergeSections(
  sectionA: DocumentSection,
  sectionB: DocumentSection
): DocumentSection {
  const newStart = Math.min(sectionA.startPage, sectionB.startPage);
  const newEnd = Math.max(sectionA.endPage, sectionB.endPage);

  return {
    ...sectionA,
    id: `merged-${sectionA.id}-${sectionB.id}`,
    title: `${sectionA.title} & ${sectionB.title}`,
    startPage: newStart,
    endPage: newEnd,
    confidence: Math.round((sectionA.confidence + sectionB.confidence) / 2),
    isUserModified: true,
    notes: `Merged from "${sectionA.title}" and "${sectionB.title}".`,
  };
}

export function createManualSection(
  startPage: number,
  endPage: number,
  index: number,
  totalPages: number
): DocumentSection {
  const safeStart = Math.max(1, Math.min(totalPages, startPage));
  const safeEnd = Math.max(safeStart, Math.min(totalPages, endPage));

  return {
    id: `manual-${Date.now()}-${index}`,
    title: `Section ${index}`,
    level: 1,
    startPage: safeStart,
    endPage: safeEnd,
    confidence: 100,
    source: 'manual',
    isUserModified: true,
    notes: 'Created manually by user.',
  };
}
