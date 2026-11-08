import { DetectedPart, ConfidenceLevel, PageTextData } from '@/types';
import { DocumentSection } from '@/types/structure';
import {
  parseMultilingualNumber,
  SUPPORTED_LANGUAGES,
} from './multilingual';

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

export const ETHIOPIC_NUMERALS: Record<string, number> = {
  '፩': 1,
  '፪': 2,
  '፫': 3,
  '፬': 4,
  '፭': 5,
  '፮': 6,
  '፯': 7,
  '፰': 8,
  '፱': 9,
  '፲': 10,
  '፲፩': 11,
  '፲፪': 12,
  '፲፫': 13,
  '፲፬': 14,
  '፲፭': 15,
  '፲፮': 16,
  '፲፯': 17,
  '፲፰': 18,
  '፲፱': 19,
  '፳': 20,
  '፴': 30,
  '፵': 40,
  '፶': 50,
};

export type HeadingHierarchyLevel = 1 | 2 | 3;

/**
 * Level 1 prefixes: Top-level units and chapters eligible for separate PDF output.
 * Across English and all 9 supported localized languages.
 */
export const LEVEL1_PREFIXES =
  'UNIT|CHAPTER|MODULE|' +
  'ምዕራፍ|አሃድ|' +
  'ክፍሊ|' +
  'BOQONNAA|' +
  'الوحدة|وحدة|الفصل|فصل|الباب|باب|' +
  'CHAPITRE|UNITÉ|UNITE|' +
  'CAPÍTULO|CAPITULO|UNIDAD|MÓDULO|MODULO|' +
  'SURA|KITENGO|' +
  'इकाई|अध्याय|' +
  '单元|章';

/**
 * Level 2 prefixes: Sections, subsections, topics, and lessons that belong inside a parent unit.
 */
export const LEVEL2_PREFIXES =
  'SECTION|SUBSECTION|TOPIC|SUBTOPIC|LESSON|PART|' +
  'ክፍል|ትምህርት|ርዕስ|' +
  'ትምህርቲ|ኣርእስቲ|' +
  'KUTAA|BARNOOTA|MATA\\s+DUREE|' +
  'الدرس|درس|الجزء|جزء|' +
  'LEÇON|LECON|PARTIE|' +
  'LECCIÓN|LECCION|PARTE|' +
  'SEHEMU|SOMO|' +
  'पाठ|भाग|खण्ड|' +
  '课|部分|节|章节';

export const HEADING_PREFIXES = `${LEVEL1_PREFIXES}|${LEVEL2_PREFIXES}`;

export const HEADING_NUMBERS =
  '[0-9]{1,4}|[IVXLCDM]{1,6}|[፩-፳]+|[٠-٩]+|[०-९]+|[一二三四五六七八九十百]+|' +
  'ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|ELEVEN|TWELVE|THIRTEEN|FOURTEEN|FIFTEEN|SIXTEEN|SEVENTEEN|EIGHTEEN|NINETEEN|TWENTY|' +
  'الأول|الأولى|الثاني|الثانية|الثالث|الثالثة|الرابع|الرابعة|الخامس|الخامسة|السادس|السادسة|السابع|السابعة|الثامن|الثامنة|التاسع|التاسعة|العاشر|العاشرة|' +
  'واحد|اثنين|ثلاثة|اربعة|أربعة|خمسة|ستة|سبعة|ثمانية|تسعة|عشرة|' +
  'एक|दो|तीन|चार|पांच|पाँच|छह|छः|सात|आठ|नौ|दस|' +
  'አንድ|ሁለት|ሦስት|ሶስት|አራት|አምስት|ስድስት|ሰባት|ስምንት|ዘጠኝ|አስር|' +
  'ሓደ|ክልተ|ሰለስተ|ኣርባዕተ|ሓሙሽተ|ሽድሽተ|ሾብዓተ|ሸሞንተ|ትሽዓተ|ዓሰርተ|' +
  'TOKKO|LAMA|SADII|AFUR|SHAN|JA\'A|TORBA|SADDEET|SAGAL|KUDHAN|' +
  'MOJA|MBILI|TATU|NNE|TANO|SITA|SABA|NANE|TISA|KUMI|' +
  'UN|UNE|DEUX|TROIS|QUATRE|CINQ|SIX|SEPT|HUIT|NEUF|DIX|' +
  'UNO|UNA|DOS|TRES|CUATRO|CINCO|SEIS|SIETE|OCHO|NUEVE|DIEZ';

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
  level: HeadingHierarchyLevel;
}

export interface TocEntry {
  prefix: string;
  numberValue: number;
  numberRaw: string;
  title: string;
  printedPage: number;
  matchedLine: string;
  sourcePageNumber: number;
  level: HeadingHierarchyLevel;
}

/**
 * Classifies a heading prefix into Level 1 (top-level unit/chapter) or Level 2 (section/topic).
 */
export function classifyHeadingPrefix(prefix: string): HeadingHierarchyLevel {
  const clean = prefix.trim();
  const level1Regex = new RegExp(`^(?:${LEVEL1_PREFIXES})$`, 'i');
  if (level1Regex.test(clean)) return 1;
  return 2;
}

/**
 * Detects Level 3 exercises, questions, reviews, and assessment headings
 * across English and all 9 supported localized languages.
 * These lines must NEVER trigger a top-level unit boundary or separate PDF.
 */
export function isExerciseOrReviewLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Terminal boundary that safely matches ASCII word boundary OR non-Latin script end-of-string / punctuation
  const END = '(?:\b|$|\s|[:.\-–—፡፤：、，?？])';

  // 1. Explicit Review Questions / Unit Review / Chapter Review / Summaries
  const reviewPattern = new RegExp(
    '^(?:(?:UNIT|CHAPTER|MODULE)\\s+[0-9IVXLCDM]+\\s*[:.\\-–—\\s]*)?(?:REVIEW\\s+QUESTIONS|REVIEW\\s+EXERCISES|UNIT\\s+REVIEW|CHAPTER\\s+REVIEW|MODULE\\s+REVIEW|UNIT\\s+SUMMARY(?:\\s+(?:AND|&)\\s+EXERCISES?)?|CHAPTER\\s+SUMMARY(?:\\s+(?:AND|&)\\s+EXERCISES?)?|SUMMARY\\s+(?:AND|&)\\s+(?:REVIEW|EXERCISES?)|SUMMARY\\s+AND\\s+REVIEW|END\\s+OF\\s+(?:UNIT|CHAPTER)\\s+EXERCISES|REVISION\\s+EXERCISES|SELF-ASSESSMENT|SELF-TEST|PRACTICE\\s+QUESTIONS|PRACTICE\\s+EXERCISES|STUDY\\s+QUESTIONS|ACTIVITIES|ACTIVITY\\s+[0-9]+)' + END,
    'i'
  );
  if (reviewPattern.test(trimmed)) return true;

  // 2. Part-based exercise sections (e.g. "Part I: True or False", "Part II: Multiple Choice", "ክፍል ፩፡ እውነት ወይም ሐሰት", "Kutaa 1: Dhugaa ykn Soba", "第一部分：判断题")
  const partExercisePattern = new RegExp(
    '^\\s*(?:PART|PARTIE|PARTE|भाग|الجزء|ክፍል|ክፍሊ|KUTAA|SEHEMU(?:\\s+ya)?|第)\\s*(?:[0-9IVXLCDM]+|[A-Z]|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|الأول|الثاني|الثالث|፩|፪|፫|፬|፭|[一二三四五六七八九十]+)?(?:\\s*부분|\\s*部分)?\\s*[:.\\-–—\\s፡፤：、，]+\\s*(?:TRUE\\s+OR\\s+FALSE|TRUE\\s*\\/\\s*FALSE|MULTIPLE\\s+CHOICE|FILL\\s+IN|MATCHING|SHORT\\s+ANSWER|COMPLETION|EXERCISES?|QUESTIONS?|REVIEW|PROBLEMS?|VRAI\\s+OU\\s+FAUX|CHOIX\\s+MULTIPLES|VERDADERO\\s+O\\s+FALSO|OPCI[ÓO]N\\s+M[ÚU]LTIPLE|KWELI\\s+AU\\s+SI\\s+KWELI|CHAGUO|እውነት|ምርጫ|ክፍት\\s+ቦታ|ሕቶታት|DHUGAA|FILANNOO|BAKKA\\s+DUWWAA|صواب|صح\\s+أم\\s+خطأ|اختيار|املأ|سؤال|सत्य|बहुविकल्पी|रिक्त|判断题|选择题|填空题)',
    'i'
  );
  if (partExercisePattern.test(trimmed)) return true;

  // 3. True / False patterns in all 10 languages
  const trueFalsePattern = new RegExp(
    '^\\s*(?:(?:ITEM|QUESTION|SECTION|PART|KUTAA|SEHEMU|ክፍሊ?)?\\s*[0-9IVXLCDM፩-፭]*\\s*[:.\\-–—\\s፡፤：、，]*)*(?:TRUE\\s+OR\\s+FALSE|TRUE\\s*\\/\\s*FALSE|TRUE\\s+FALSE|VRAI\\s+OU\\s+FAUX|VERDADERO\\s+O\\s+FALSO|KWELI\\s+AU\\s+SI\\s+KWELI|እውነት\\s+ወይም\\s+ሐሰት|እውነት\\s*\\/\\s*ሐሰት|እውነት\\s+ወይም\\s+ሀሰት|ሓቂ\\s+ወይ\\s+ሓሶት|DHUGAA\\s+YKN\\s+SOBA|صح\\s+أم\\s+خطأ|صواب\\s+أو\\s+خطأ|सत्य\\s+या\\s+असत्य|判断题)' + END,
    'i'
  );
  if (trueFalsePattern.test(trimmed)) return true;

  // 4. Multiple Choice patterns in all 10 languages
  const multipleChoicePattern = new RegExp(
    '^\\s*(?:(?:ITEM|QUESTION|SECTION|PART|KUTAA|SEHEMU|ክፍሊ?)?\\s*[0-9IVXLCDM፩-፭]*\\s*[:.\\-–—\\s፡፤：、，]*)*(?:MULTIPLE\\s+CHOICE|CHOIX\\s+MULTIPLES?|QCM|OPCI[ÓO]N\\s+M[ÚU]LTIPLE|SELECCI[ÓO]N\\s+M[ÚU]LTIPLE|CHAGUO\\s+SAHIHI|MASWALI\\s+YA\\s+KUCHAGUA|ምርጫ|የምርጫ\\s+ጥያቄዎች|ናይ\\s+ምርጫ\\s+ሕቶታት|FILANNOO|GAAFFILEE\\s+FILANNOO|اختيار\\s+من\\s+متعدد|أسئلة\\s+الاختيار\\s+من\\s+متعدد|बहुविकल्पी|वस्तुनिष्ठ\\s+प्रश्न|单选题|多选题|选择题)' + END,
    'i'
  );
  if (multipleChoicePattern.test(trimmed)) return true;

  // 5. Fill in the Blank / Matching patterns in all 10 languages
  const fillMatchingPattern = new RegExp(
    '^\\s*(?:(?:ITEM|QUESTION|SECTION|PART|KUTAA|SEHEMU|ክፍሊ?)?\\s*[0-9IVXLCDM፩-፭]*\\s*[:.\\-–—\\s፡፤：、，]*)*(?:FILL\\s+IN\\s+THE\\s+BLANKS?|COMPLETION\\s+QUESTIONS?|MATCHING\\s+QUESTIONS?|MATCHING\\s+ITEMS?|MATCH\\s+COLUMN|MATCH\\s+THE\\s+FOLLOWING|REMPLIR\\s+LES\\s+BLANCS?|APPARIEMENT|COMPLETAR\\s+LOS\\s+ESPACIOS|RELACIONAR\\s+COLUMNAS|JAZA\\s+NAFASI\\s+ZILIZO\\s+WAZI|OANISHA|ክፍት\\s+ቦታውን\\s+ሙሉ|የማዛመድ\\s+ጥያቄዎች|ክፉት\\s+ቦታ\\s+ምምላእ|ምዝማድ|BAKKA\\s+DUWWAA\\s+GUUTUU|WALSIMSIISI|املأ\\s+الفراغ|أكمل\\s+الفراغ|صل\\s+بين\\s+العمودين|المطابقة|रिक्त\\s+स्थान\\s+भरें|सुमेलित\\s+कीजिए|填空题|连线题|匹配题)' + END,
    'i'
  );
  if (fillMatchingPattern.test(trimmed)) return true;

  // 6. Localized review questions and summaries in all 10 languages
  const localizedReviewPattern = new RegExp(
    '^\\s*(?:የክለሳ\\s+ጥያቄዎች|የምዕራፉ\\s+ማጠቃለያ|የክፍሉ\\s+ማጠቃለያ|የክለሳ\\s+መልመጃዎች|መልመጃ\\s+[0-9]+|ሕቶታት\\s+ክለሳ|መጠቃለሊ\\s+ምዕራፍ|GAAFFILEE\\s+IRRA-DEEBII|CUUNFAA\\s+BOQONNAA|GILGAALA\\s+IRRA-DEEBII|أسئلة\\s+المراجعة|مراجعة\\s+الوحدة|مراجعة\\s+الفصل|ملخص\\s+الوحدة|ملخص\\s+الفصل|تمارين|QUESTIONS\\s+DE\\s+R[ÉE]VISION|R[ÉE]SUM[ÉE]\\s+DU\\s+CHAPITRE|EXERCICES\\s+DE\\s+R[ÉE]VISION|PREGUNTAS\\s+DE\\s+REPASO|RESUMEN\\s+DEL\\s+CAP[ÍI]TULO|EJERCICIOS\\s+DE\\s+REPASO|MASWALI\\s+YA\\s+MARUDIO|MUHTASARI\\s+WA\\s+SURA|MAZOEZI|पुनरावलोकन\\s+प्रश्न|अध्याय\\s+सारांश|अभ्यास\\s+प्रश्न|本章小结|单元小结|复习题|课后习题|本章练习)' + END,
    'i'
  );
  if (localizedReviewPattern.test(trimmed)) return true;

  return false;
}

/**
 * Detects Level 2 sections, subsections, and topics that belong inside a parent unit.
 */
export function isSectionOrSubheadingLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Decimal numbered sections like "1.1 Ecosystem Dynamics", "2.4 Energy Flow", "3.1.2 Climate"
  if (/^\s*[0-9]+\.[0-9]+(?:\.[0-9]+)?\b/.test(trimmed)) {
    return true;
  }

  // Explicit decimal subsections with keywords e.g. "Section 2.4 - Energy Flow", "Unit 1.1 Topic Overview"
  if (/^\s*(?:UNIT|CHAPTER|MODULE|LESSON|PART|SECTION|SUBSECTION|TOPIC|SUBTOPIC)\s+[0-9]+\.[0-9]+/i.test(trimmed)) {
    return true;
  }

  // Non-decimal subsection keywords
  if (/^\s*(?:SUBSECTION|TOPIC|SUBTOPIC|ACTIVITY)\s+[0-9IVXLCDM]+/i.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Words/patterns that indicate a conversational sentence rather than a true heading
 */
const FALSE_POSITIVE_PREFIXES = [
  /^(in|as|according to|refer to|see|look at|review|from|during|end of|summary of|questions for|exercises in|throughout|after|before)s+/i,
  /^(we learned in|as discussed in|as seen in|as shown in|covered in|introduced in)s+/i,
  /^(note:|important:|recall that|remember:)s+/i,
  /^(step|hint|solution|answer|proof|sample\s+problem)\b/i,
];

const FALSE_POSITIVE_POSTFIXES = [
  /\b(we learned|we will learn|is discussed|was introduced|covers|explores|includes|focuses on|describes|contains|shows|consists of|deals with)\b/i,
  /\b(review\s+questions|review\s+exercises|practice\s+problems|end\s+of\s+chapter|chapter\s+review|unit\s+review|study\s+guide|self-test|self-assessment)\b/i,
  /\b(exercises|questions|problems|summary|review|glossary|index|notes|page|pages|fig|figure|table)\s*$/i,
];

function isMathematicalOrContentLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  // Coordinate pairs
  if (/^\(?\s*[-+]?\d*\.?\d+\s*,\s*[-+]?\d*\.?\d+\s*\)?$/i.test(trimmed)) return true;
  if (/^\(?\s*[a-z]\s*,\s*[a-z]\s*\)?$/i.test(trimmed)) return true;
  // Single table terms
  if (/^(input|output|domain|range|x|y|z|f\(x\)|value|total|sum)$/i.test(trimmed)) return true;
  if (/^(input|output)\s+[-+]?\d+/i.test(trimmed)) return true;
  // Pure numbers
  if (/^[-+]?\d*\.?\d+$/.test(trimmed)) return true;
  // Math expressions
  if (/^[a-z]\([a-z]\)\s*=/i.test(trimmed)) return true;
  if (/^[a-z]\s*=\s*[-+0-9a-z]/i.test(trimmed)) return true;
  if (/[=<>≤≥]/.test(trimmed) && /[+\-*/^0-9]/.test(trimmed)) return true;
  if (/[\^√π±≠≤≥]/.test(trimmed)) return true;
  if (/^[0-9+\-*/=<>^√π±≠≤≥()\s.,]+$/.test(trimmed) && trimmed.length > 2) return true;
  // Math problem stems
  if (/^(?:\d{1,3}[.)]\s*)?(let|if|find|solve|calculate|suppose|given|show that|prove that|determine|evaluate|consider|assume|draw|graph|simplify|factor|expand|compute|express|verify)\b/i.test(trimmed)) {
    return true;
  }
  return false;
}

/**
 * Regex for standard headings:
 * "UNIT 1: INTRODUCTION TO BIOLOGY"
 * "Unit 1 - Biology Basics"
 * "CHAPTER ONE   CELL STRUCTURE"
 * "Module 2. Photosynthesis"
 * "Lesson 3: Genetics"
 * "UNIT IV"
 */
const HEADING_REGEX = new RegExp(
  `^\\s*(${HEADING_PREFIXES})\\s+(${HEADING_NUMBERS})(?:\\b|(?=[^a-zA-Z0-9]))[:.\\-–—\\s]*(.*)$`,
  'i'
);

/**
 * Parses numeric value from string (e.g. '1', 'one', 'IV')
 */
export function parseUnitNumber(raw: string): number | null {
  if (!raw) return null;
  const clean = raw.trim();

  // 1. Try universal multilingual numeral parser
  const multi = parseMultilingualNumber(clean);
  if (multi !== null) {
    return multi;
  }

  const cleanLower = clean.toLowerCase();
  const intVal = parseInt(cleanLower, 10);
  if (!isNaN(intVal) && /^[0-9]+$/.test(cleanLower)) {
    return intVal;
  }

  if (WORD_NUMBERS[cleanLower] !== undefined) {
    return WORD_NUMBERS[cleanLower];
  }

  if (ROMAN_NUMERALS[cleanLower] !== undefined) {
    return ROMAN_NUMERALS[cleanLower];
  }

  if (ETHIOPIC_NUMERALS[clean] !== undefined) {
    return ETHIOPIC_NUMERALS[clean];
  }

  return null;
}

/**
 * Evaluates whether a line is a genuine unit/chapter heading vs conversational sentence
 */
export function isGenuineHeading(
  line: string,
  lineIndex = 0,
  totalLinesOnPage = 1
): RawHeadingMatch | null {
  const normalized = line.normalize('NFKC').replace(/[\u2010-\u2015]/g, '-').trim();
  const trimmed = normalized;
  if (!trimmed || trimmed.length < 2) return null;

  // Reject math and content expressions
  if (isMathematicalOrContentLine(trimmed)) return null;

  // Rule 0a: Strictly reject Level 3 exercises, questions, review questions, and summaries
  if (isExerciseOrReviewLine(trimmed)) {
    return null;
  }

  // Rule 0b: Strictly reject Level 2 decimal sections and subsections (e.g. 1.1, Section 2.4, Unit 1.1)
  if (isSectionOrSubheadingLine(trimmed)) {
    return null;
  }

  // Rule 0c: Reject subsections and general markers
  if (/^\s*(SUBSECTION|TOPIC|ACTIVITY|EXERCISE|REVIEW|SUMMARY|FIGURE|TABLE)\b/i.test(trimmed)) {
    return null;
  }

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

  // Language Heuristic A: Chinese circumfix pattern e.g. "第一单元 导论" or "第1章 细胞结构"
  const chineseMatch = trimmed.match(
    /^\s*第\s*([0-9一二三四五六七八九十百]+)\s*(单元|章|课|部分|节)[:.\-–—\s]*(.*)$/
  );
  if (chineseMatch) {
    const rawNum = chineseMatch[1].trim();
    const prefixName = chineseMatch[2].trim();
    let title = chineseMatch[3] ? chineseMatch[3].trim() : '';
    const numVal = parseUnitNumber(rawNum);
    if (numVal !== null) {
      title = title.replace(/^[:.\-–—\s]+/, '').replace(/[:.\-–—\s]+$/, '');
      const isLevel1 = prefixName === '单元' || prefixName === '章';
      return {
        pageNumber: 0,
        prefix: `第${prefixName}`,
        numberValue: numVal,
        numberRaw: rawNum,
        title: title ? `第${rawNum}${prefixName} – ${title}` : `第${rawNum}${prefixName}`,
        confidence: 'High',
        matchedLine: trimmed,
        lineIndex,
        source: 'heading',
        level: isLevel1 ? 1 : 2,
      };
    }
  }

  // Language Heuristic B: Swahili connecting particles "Sura ya 1", "Kitengo cha 2"
  const swahiliMatch = trimmed.match(
    /^\s*(SURA|SEHEMU|KITENGO|SOMO)\s+(?:ya|cha|la|wa)\s+([0-9IVXLCDM]+|MOJA|MBILI|TATU|NNE|TANO|SITA|SABA|NANE|TISA|KUMI)[:.\-–—\s]*(.*)$/i
  );
  if (swahiliMatch) {
    const prefix = swahiliMatch[1].trim();
    const rawNum = swahiliMatch[2].trim();
    let title = swahiliMatch[3] ? swahiliMatch[3].trim() : '';
    const numVal = parseUnitNumber(rawNum);
    if (numVal !== null) {
      title = title.replace(/^[:.\-–—\s]+/, '').replace(/[:.\-–—\s]+$/, '');
      const isLevel1 = /^(SURA|KITENGO)$/i.test(prefix);
      return {
        pageNumber: 0,
        prefix,
        numberValue: numVal,
        numberRaw: rawNum,
        title: title ? `${prefix} ${rawNum} – ${title}` : `${prefix} ${rawNum}`,
        confidence: 'High',
        matchedLine: trimmed,
        lineIndex,
        source: 'heading',
        level: isLevel1 ? 1 : 2,
      };
    }
  }

  // Rule 3: Regular match against heading patterns
  const match = trimmed.match(HEADING_REGEX);
  if (!match) return null;

  const prefix = match[1].trim();
  const rawNum = match[2].trim();
  let title = match[3] ? match[3].trim() : '';

  // Rule 4: Reject subsection decimals like Unit 1.1 or Chapter 2.4
  if (/^\.\d+/.test(title)) {
    return null;
  }

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

  const level = classifyHeadingPrefix(prefix);

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
    level,
  };
}

/**
 * Identifies all Table of Contents pages (including multi-page / continued TOC).
 */
export function findTocPageNumbers(pages: PageTextData[]): Set<number> {
  const tocPages = new Set<number>();
  // For large documents (> 700 to 1,500 pages), scan up to 80 pages or while TOC pages continue
  const scanLimit = Math.min(pages.length, 80);

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const prevPageWasToc = tocPages.has(page.pageNumber - 1);
    // If beyond scanLimit and previous page wasn't TOC, stop scanning
    if (i >= scanLimit && !prevPageWasToc) {
      break;
    }

    const lines = page.lines;
    if (!lines || lines.length === 0) continue;

    // Check top 15 lines for TOC title across all 10 supported languages
    const hasExplicitTitle = lines.slice(0, 15).some((l) => {
      const upper = l.trim().toUpperCase();
      return /^(TABLE\s*OF\s*CONTENTS|CONTENTS|SOMMAIRE|TABLE\s*DES\s*MATI[ÈE]RES|INHALTSVERZEICHNIS|ማውጫ|የርዕስ\s*ማውጫ|የይዘት\s*ማውጫ|ትሕዝቶ|መውጫ|መርአዪ\s*ትሕዝቶ|BAAFATA|QABIYYEE|BAAFATA\s*QABIYYEE|الفهرس|المحتويات|جدول\s*المحتويات|فهرس\s*المحتويات|المحتوى|CONTENIDO|ÍNDICE|INDICE|TABLA\s*DE\s*CONTENIDO|YALIYOMO|JEDWALI\s*LA\s*YALIYOMO|विषय\s*सूची|अनुक्रमणिका|सामग्री|目录|目次|内容)(?:\b|$|\s|:)/i.test(upper);
    });

    const isContinuedTitle = lines.slice(0, 12).some((l) => {
      const upper = l.trim().toUpperCase();
      return /^(CONTENTS\s*\(CONTINUED\)|TABLE OF CONTENTS\s*\(CONT\)|CONTENTS\s*CONT|CONTINUED|የቀጠለ|تابع\s*الفهرس)(?:\b|$|\s|:|\))/i.test(upper);
    });

    // Check for lines with dotted leaders or page numbers at the end
    const tocEntryCount = lines.filter((l) => {
      const t = l.trim();
      return (
        /[.\s_]{2,}\s*\d{1,4}\s*$/.test(t) ||
        new RegExp(`^(${HEADING_PREFIXES})\s+.*?([.\s_]{2,}|\s{2,})\s*\d{1,4}\s*$`, 'i').test(t)
      );
    }).length;

    if (
      hasExplicitTitle ||
      (isContinuedTitle && (tocEntryCount >= 1 || prevPageWasToc)) ||
      (prevPageWasToc && tocEntryCount >= 2) ||
      tocEntryCount >= 3
    ) {
      tocPages.add(page.pageNumber);
    }
  }

  return tocPages;
}

/**
 * Extracts structured entries from identified TOC pages.
 */
export function extractTocEntries(pages: PageTextData[], tocPageNumbers?: Set<number>): TocEntry[] {
  const targetTocPages = tocPageNumbers || findTocPageNumbers(pages);
  const entries: TocEntry[] = [];

  const TOC_REGEX = new RegExp(
    `^\\s*(${HEADING_PREFIXES})(?:\\s+ya|\\s+cha|\\s+la)?\\s*(${HEADING_NUMBERS})(?:\\b|(?=[^a-zA-Z0-9]))[:.\\-–—\\s]*(.*?)[.\\s_]{2,}\\s*([0-9٠-٩०-९\\d]{1,4})\\s*$`,
    'i'
  );

  const TOC_ALT_REGEX = new RegExp(
    `^\\s*(${HEADING_PREFIXES})(?:\\s+ya|\\s+cha|\\s+la)?\\s*(${HEADING_NUMBERS})(?:\\b|(?=[^a-zA-Z0-9]))[:.\\-–—\\s]*(.*?)\\s{2,}([0-9٠-٩०-९\\d]{1,4})\\s*$`,
    'i'
  );

  const TOC_CHINESE_REGEX =
    /^\s*第\s*([0-9一二三四五六七八九十百]+)\s*(单元|章|课|部分|节)[:.\-–—\s]*(.*?)[.\s_]{2,}\s*([0-9٠-٩०-९\d]{1,4})\s*$/;
  const TOC_CHINESE_ALT =
    /^\s*第\s*([0-9一二三四五六七八九十百]+)\s*(单元|章|课|部分|节)[:.\-–—\s]*(.*?)\s{2,}([0-9٠-٩०-९\d]{1,4})\s*$/;

  for (const page of pages) {
    if (!targetTocPages.has(page.pageNumber)) continue;

    for (let l = 0; l < page.lines.length; l++) {
      const line = page.lines[l].normalize('NFKC').replace(/[\u2010-\u2015]/g, '-').trim();
      if (!line) continue;

      // Filter out Level 3 exercise / review lines and decimal subsections in TOC
      if (isExerciseOrReviewLine(line)) continue;
      if (isSectionOrSubheadingLine(line)) continue;

      // Check Chinese TOC pattern first
      let chMatch = line.match(TOC_CHINESE_REGEX) || line.match(TOC_CHINESE_ALT);
      if (chMatch) {
        const rawNum = chMatch[1].trim();
        const prefixName = chMatch[2].trim();
        let title = chMatch[3] ? chMatch[3].trim() : '';
        const rawPageStr = chMatch[4].trim();
        const printedPage = parseMultilingualNumber(rawPageStr);
        const numVal = parseUnitNumber(rawNum);

        if (numVal !== null && printedPage !== null && printedPage > 0) {
          title = title.replace(/^[:.\-–—\s]+/, '').replace(/[:.\-–—\s]+$/, '');
          const isLevel1 = prefixName === '单元' || prefixName === '章';
          entries.push({
            prefix: `第${prefixName}`,
            numberValue: numVal,
            numberRaw: rawNum,
            title: title ? `第${rawNum}${prefixName} – ${title}` : `第${rawNum}${prefixName}`,
            printedPage,
            matchedLine: line,
            sourcePageNumber: page.pageNumber,
            level: isLevel1 ? 1 : 2,
          });
          continue;
        }
      }

      let match = line.match(TOC_REGEX);
      if (!match) {
        match = line.match(TOC_ALT_REGEX);
      }
      if (!match) continue;

      const prefix = match[1].trim();
      const rawNum = match[2].trim();
      let title = match[3] ? match[3].trim() : '';
      const rawPageStr = match[4].trim();
      const printedPage = parseMultilingualNumber(rawPageStr);
      const numVal = parseUnitNumber(rawNum);

      if (numVal !== null && printedPage !== null && printedPage > 0) {
        title = title.replace(/^[:.\-–—\s]+/, '').replace(/[:.\-–—\s]+$/, '');
        const level = classifyHeadingPrefix(prefix);
        entries.push({
          prefix,
          numberValue: numVal,
          numberRaw: rawNum,
          title: title ? `${prefix} ${rawNum} – ${title}` : `${prefix} ${rawNum}`,
          printedPage,
          matchedLine: line,
          sourcePageNumber: page.pageNumber,
          level,
        });
      }
    }
  }

  return entries;
}

export interface UnitDetectionResult {
  parts: DetectedPart[];
  hasFrontMatter: boolean;
  frontMatterRange?: { start: number; end: number };
  isUncertain: boolean;
  uncertaintyReason?: string;
  assignedPagesCount: number;
  unassignedPagesCount: number;
  overallConfidence: ConfidenceLevel;
}

/**
 * Scans all physical pages to detect units and chapters, skips TOC pages during heading scan,
 * establishes printed-to-physical page offset when matching evidence exists,
 * and creates contiguous, verified page ranges.
 */
export function detectDocumentUnits(
  pages: PageTextData[],
  totalPages: number,
  originalFilename = 'Document',
  outlineSections?: DocumentSection[] | null
): UnitDetectionResult {
  // 1. Identify all Table of Contents pages
  const tocPages = findTocPageNumbers(pages);

  // 2. Scan physical pages for genuine headings, SKIPPING all TOC pages
  const rawHeadings: RawHeadingMatch[] = [];
  const seenUnits = new Map<string, number>(); // key -> earliest physical page

  for (const page of pages) {
    // CRITICAL: Never interpret Table of Contents entries as physical page headings!
    if (tocPages.has(page.pageNumber)) {
      continue;
    }

    // Scan all lines on the page (no limitation stopping after first match)
    for (let l = 0; l < page.lines.length; l++) {
      const line = page.lines[l];
      const match = isGenuineHeading(line, l, page.lines.length);
      if (!match) continue;

      // Check if heading has no title on line l (e.g. "UNIT ONE") and line l + 1 has the unit title
      if (
        match.title === `${match.prefix} ${match.numberRaw}` &&
        l + 1 < page.lines.length
      ) {
        const nextLine = page.lines[l + 1].trim();
        if (
          nextLine.length >= 2 &&
          nextLine.length <= 80 &&
          !isMathematicalOrContentLine(nextLine) &&
          !isExerciseOrReviewLine(nextLine) &&
          !isSectionOrSubheadingLine(nextLine) &&
          !isGenuineHeading(nextLine, l + 1, page.lines.length)
        ) {
          const cleanedSub = nextLine
            .replace(/^[:.\-–—\s]+/, '')
            .replace(/[:.\-–—\s]+$/, '');
          if (cleanedSub.length > 0) {
            match.title = `${match.prefix} ${match.numberRaw} – ${cleanedSub}`;
            match.matchedLine = `${match.matchedLine}\n${nextLine}`;
          }
        }
      }

      const key = `${match.prefix.toLowerCase()}_${match.numberValue}`;

      // Filter out repeated running headers at the top of subsequent pages
      if (seenUnits.has(key)) {
        const firstPage = seenUnits.get(key)!;
        if (page.pageNumber > firstPage) {
          // Same unit repeating on a later page (running header or citation)
          continue;
        }
      }

      match.pageNumber = page.pageNumber;
      rawHeadings.push(match);
      seenUnits.set(key, page.pageNumber);
    }
  }

  // 3. Extract TOC entries
  const tocEntries = extractTocEntries(pages, tocPages);

  // Determine strict hierarchy level:
  // Level 1: Unit / Chapter (Standard textbook top-level - eligible for separate PDF output)
  // Level 2: Section / Topic (Subheadings - only used if document has ZERO Level 1 headings)
  const hasLevel1Physical = rawHeadings.some((h) => h.level === 1);
  const hasLevel1Toc = tocEntries.some((t) => t.level === 1);
  const hasLevel1Outline = Boolean(
    outlineSections &&
      outlineSections.some(
        (s) => s.level === 1 && !s.isUnresolved && s.startPage >= 1 && s.startPage <= totalPages
      )
  );
  const splitLevel: HeadingHierarchyLevel =
    hasLevel1Physical || hasLevel1Toc || hasLevel1Outline ? 1 : 2;

  // Filter physical headings and TOC entries strictly by splitLevel:
  // When Level 1 is present, Level 2 sections and Level 3 exercises stay inside parent units!
  const eligibleHeadings = rawHeadings.filter((h) => h.level === splitLevel);
  const eligibleTocEntries = tocEntries.filter((t) => t.level === splitLevel);

  // 4. Map physical body headings
  const physicalMap = new Map<string, RawHeadingMatch>();
  for (const heading of eligibleHeadings) {
    const key = `${heading.prefix.toLowerCase()}_${heading.numberValue}`;
    if (!physicalMap.has(key) || heading.pageNumber < physicalMap.get(key)!.pageNumber) {
      physicalMap.set(key, heading);
    }
  }

  // 5. Establish page-number mapping & offset calibration
  const offsetEvidence: number[] = [];
  for (const toc of eligibleTocEntries) {
    const key = `${toc.prefix.toLowerCase()}_${toc.numberValue}`;
    if (physicalMap.has(key)) {
      const physHeading = physicalMap.get(key)!;
      const offset = physHeading.pageNumber - toc.printedPage;
      offsetEvidence.push(offset);
    }
  }

  let consensusOffset: number | null = null;
  let isOffsetReliable = false;

  if (offsetEvidence.length > 0) {
    const freq = new Map<number, number>();
    for (const off of offsetEvidence) {
      freq.set(off, (freq.get(off) || 0) + 1);
    }
    let maxCount = 0;
    for (const [off, count] of freq.entries()) {
      if (count > maxCount) {
        maxCount = count;
        consensusOffset = off;
      }
    }
    // High reliability if majority of evidence agrees
    if (maxCount >= Math.ceil(offsetEvidence.length * 0.6)) {
      isOffsetReliable = true;
    }
  }

  // 6. Build Candidate Units List
  const candidateMap = new Map<string, {
    prefix: string;
    numberValue: number;
    title: string;
    physicalPage: number;
    confidence: ConfidenceLevel;
    source: 'heading' | 'toc' | 'manual' | 'outline';
    originalHeading?: string;
  }>();

  // Add physical headings found in document body (our primary source of truth)
  for (const [key, heading] of physicalMap.entries()) {
    candidateMap.set(key, {
      prefix: heading.prefix,
      numberValue: heading.numberValue,
      title: heading.title,
      physicalPage: heading.pageNumber,
      confidence: heading.confidence,
      source: 'heading',
      originalHeading: heading.matchedLine,
    });
  }

  let isUncertain = false;
  let uncertaintyReason = '';

  // Complement with TOC entries
  for (const toc of eligibleTocEntries) {
    const key = `${toc.prefix.toLowerCase()}_${toc.numberValue}`;
    if (!candidateMap.has(key)) {
      if (isOffsetReliable && consensusOffset !== null) {
        const calibratedPage = toc.printedPage + consensusOffset;
        if (calibratedPage >= 1 && calibratedPage <= totalPages) {
          candidateMap.set(key, {
            prefix: toc.prefix,
            numberValue: toc.numberValue,
            title: toc.title,
            physicalPage: calibratedPage,
            confidence: 'High',
            source: 'toc',
            originalHeading: toc.matchedLine,
          });
        }
      } else {
        // Offset could not be established conclusively
        isUncertain = true;
        uncertaintyReason =
          'Printed page numbers in the Table of Contents could not be conclusively verified against physical document headings. Please verify the unit page ranges.';
        if (toc.printedPage <= totalPages) {
          candidateMap.set(key, {
            prefix: toc.prefix,
            numberValue: toc.numberValue,
            title: toc.title,
            physicalPage: toc.printedPage,
            confidence: 'Low',
            source: 'toc',
            originalHeading: toc.matchedLine,
          });
        }
      }
    }
  }

  // Complement with PDF outline bookmarks (digital bookmarks)
  if (outlineSections && outlineSections.length > 0) {
    const validOutlines = outlineSections.filter(
      (s) => s.level === 1 && !s.isUnresolved && s.startPage >= 1 && s.startPage <= totalPages
    );

    for (const outline of validOutlines) {
      const parsedHeading = isGenuineHeading(outline.title);
      let prefix = 'Unit';
      let numberVal = 0;
      let unitTitle = outline.title;

      if (parsedHeading && parsedHeading.level === 1) {
        prefix = parsedHeading.prefix;
        numberVal = parsedHeading.numberValue;
        unitTitle = parsedHeading.title;
      } else {
        const m = outline.title.match(
          /^\s*(UNIT|CHAPTER|MODULE|LESSON|PART|ምዕራፍ|الفصل|CAPÍTULO|CHAPITRE|SURAT)\s+([0-9]{1,3}|[IVXLCDM]{1,6}|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|፩|፪|፫|፬|፭|፮|፯|፰|፱|፲)\b[:.\-–—\s]*(.*)$/i
        );
        if (m) {
          prefix = m[1];
          numberVal = parseMultilingualNumber(m[2]) || 0;
          unitTitle = outline.title;
        }
      }

      const key =
        numberVal > 0 ? `${prefix.toLowerCase()}_${numberVal}` : `outline_p${outline.startPage}`;

      if (candidateMap.has(key)) {
        const existing = candidateMap.get(key)!;
        existing.confidence = 'High';
        existing.source = 'outline';
      } else {
        candidateMap.set(key, {
          prefix,
          numberValue: numberVal,
          title: unitTitle,
          physicalPage: outline.startPage,
          confidence: 'High',
          source: 'outline',
          originalHeading: outline.title,
        });
      }
    }
  }

  // Sort candidates strictly by physical page number
  const sortedCandidates = Array.from(candidateMap.values()).sort(
    (a, b) => a.physicalPage - b.physicalPage || a.numberValue - b.numberValue
  );

  // Deduplicate any candidates sharing the same physical page
  const deduplicated: typeof sortedCandidates = [];
  for (const item of sortedCandidates) {
    if (deduplicated.length === 0) {
      deduplicated.push(item);
    } else {
      const last = deduplicated[deduplicated.length - 1];
      if (item.physicalPage > last.physicalPage) {
        deduplicated.push(item);
      }
    }
  }

  // Fallback if no units detected
  if (deduplicated.length === 0) {
    const baseName = originalFilename.replace(/\.pdf$/i, '');
    const isLikelyScanned = pages.length > 0 && pages.every((p) => !p.hasSubstantialText);
    const reason = isLikelyScanned
      ? 'This document appears to be scanned or image-only without an embedded text layer. Unit titles could not be extracted automatically. Please use Manual Split to specify your unit page ranges.'
      : 'No clear Unit or Chapter headings detected. Entire document provided as a single part. You can review or manually define unit page ranges.';
    return {
      parts: [
        {
          id: `part-${Date.now()}-1`,
          title: baseName || 'Full Document',
          startPage: 1,
          endPage: totalPages,
          filename: `${baseName || 'Document'}.pdf`,
          confidence: 'Low',
          source: 'manual',
        },
      ],
      hasFrontMatter: false,
      isUncertain: true,
      uncertaintyReason: reason,
      assignedPagesCount: totalPages,
      unassignedPagesCount: 0,
      overallConfidence: 'Low',
    };
  }

  // 7. Calculate exact contiguous unit boundaries
  const parts: DetectedPart[] = [];
  const firstUnitStart = deduplicated[0].physicalPage;
  const hasFrontMatter = firstUnitStart > 1;
  const frontMatterRange = hasFrontMatter
    ? { start: 1, end: firstUnitStart - 1 }
    : undefined;

  for (let i = 0; i < deduplicated.length; i++) {
    const current = deduplicated[i];
    const startPage = current.physicalPage;
    
    // End page is one before the next unit, or the actual final physical page (totalPages)
    let endPage = totalPages;
    if (i < deduplicated.length - 1) {
      endPage = Math.max(startPage, deduplicated[i + 1].physicalPage - 1);
    }

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
      originalHeading: current.originalHeading,
    });
  }

  // Compute coverage totals
  let assignedPagesCount = 0;
  for (const part of parts) {
    assignedPagesCount += Math.max(0, part.endPage - part.startPage + 1);
  }
  const unassignedPagesCount = Math.max(0, totalPages - assignedPagesCount);

  // Single unit warning in multi-page document
  if (parts.length === 1 && totalPages > 15) {
    isUncertain = true;
    uncertaintyReason = `Only 1 unit detected across ${totalPages} pages. Review boundaries before cutting.`;
  }

  const overallConfidence: ConfidenceLevel = isUncertain
    ? 'Low'
    : parts.every((p) => p.confidence === 'High')
    ? 'High'
    : 'Medium';

  return {
    parts,
    hasFrontMatter,
    frontMatterRange,
    isUncertain,
    uncertaintyReason,
    assignedPagesCount,
    unassignedPagesCount,
    overallConfidence,
  };
}

export interface CutEligibilityResult {
  canCut: boolean;
  reason?: string;
  requiresConfirmation: boolean;
}

/**
 * Validates whether cutting can proceed, enforcing that uncertain page boundaries
 * cannot be silently cut without explicit user review and confirmation.
 */
export function validateCutEligibility(
  isUncertain: boolean | undefined,
  isConfirmed: boolean | undefined,
  partsCount = 0,
  isValidRanges = true
): CutEligibilityResult {
  if (partsCount === 0) {
    return {
      canCut: false,
      requiresConfirmation: false,
      reason: 'No units defined for extraction.',
    };
  }

  if (!isValidRanges) {
    return {
      canCut: false,
      requiresConfirmation: false,
      reason: 'Page ranges contain validation errors.',
    };
  }

  if (isUncertain && !isConfirmed) {
    return {
      canCut: false,
      requiresConfirmation: true,
      reason: 'Page boundaries are uncertain and must be reviewed and confirmed before cutting.',
    };
  }

  return {
    canCut: true,
    requiresConfirmation: Boolean(isUncertain),
  };
}
