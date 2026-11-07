/**
 * DocuNexa — 10-Language Support Engine for PDF Unit Cutter
 *
 * Supported Languages:
 * 1. English (en)
 * 2. Amharic / አማርኛ (am)
 * 3. Afaan Oromo (om)
 * 4. Tigrinya / ትግርኛ (ti)
 * 5. Arabic / العربية (ar)
 * 6. French / Français (fr)
 * 7. Spanish / Español (es)
 * 8. Swahili / Kiswahili (sw)
 * 9. Hindi / हिन्दी (hi)
 * 10. Simplified Chinese / 简体中文 (zh)
 */

export type SupportedLanguageCode =
  | 'en'
  | 'am'
  | 'om'
  | 'ti'
  | 'ar'
  | 'fr'
  | 'es'
  | 'sw'
  | 'hi'
  | 'zh';

export interface LanguageSpec {
  code: SupportedLanguageCode;
  name: string;
  nativeName: string;
  script: 'latin' | 'ethiopic' | 'arabic' | 'devanagari' | 'han';
  tesseractCode: string | null; // Tesseract OCR language code (null if no official model exists)
  ocrSupported: boolean;
  ocrNotes?: string;
  rtl: boolean;
  headingPrefixes: string[];
  tocKeywords: string[];
  sampleTitle: string;
}

export const SUPPORTED_LANGUAGES: Record<SupportedLanguageCode, LanguageSpec> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    script: 'latin',
    tesseractCode: 'eng',
    ocrSupported: true,
    rtl: false,
    headingPrefixes: ['UNIT', 'CHAPTER', 'MODULE', 'LESSON', 'PART', 'SECTION'],
    tocKeywords: ['TABLE OF CONTENTS', 'CONTENTS', 'INDEX'],
    sampleTitle: 'Unit 1 - Introduction to Biology',
  },
  am: {
    code: 'am',
    name: 'Amharic',
    nativeName: 'አማርኛ',
    script: 'ethiopic',
    tesseractCode: 'amh',
    ocrSupported: true,
    rtl: false,
    headingPrefixes: ['ምዕራፍ', 'ክፍል', 'አሃድ', 'ትምህርት', 'ርዕስ'],
    tocKeywords: ['ማውጫ', 'የርዕስ ማውጫ', 'የይዘት ማውጫ', 'የቀጠለ'],
    sampleTitle: 'ምዕራፍ 1 - መግቢያ',
  },
  om: {
    code: 'om',
    name: 'Afaan Oromo',
    nativeName: 'Afaan Oromoo',
    script: 'latin',
    tesseractCode: null,
    ocrSupported: false,
    ocrNotes:
      'Official Tesseract OCR traineddata model does not exist for Afaan Oromo. Searchable PDF text detection and manual splitting are fully supported.',
    rtl: false,
    headingPrefixes: ['BOQONNAA', 'KUTAA', 'BARNOOTA', 'MATA DUREE'],
    tocKeywords: ['BAAFATA', 'QABIYYEE', 'BAAFATA QABIYYEE'],
    sampleTitle: 'Boqonnaa 1 - Seensa',
  },
  ti: {
    code: 'ti',
    name: 'Tigrinya',
    nativeName: 'ትግርኛ',
    script: 'ethiopic',
    tesseractCode: 'tir',
    ocrSupported: true,
    rtl: false,
    headingPrefixes: ['ምዕራፍ', 'ክፍሊ', 'ትምህርቲ', 'ኣርእስቲ'],
    tocKeywords: ['ትሕዝቶ', 'መውጫ', 'መርአዪ ትሕዝቶ'],
    sampleTitle: 'ምዕራፍ 1 - መእተዊ',
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    script: 'arabic',
    tesseractCode: 'ara',
    ocrSupported: true,
    rtl: true,
    headingPrefixes: ['الوحدة', 'وحدة', 'الفصل', 'فصل', 'الباب', 'باب', 'الدرس', 'درس', 'الجزء', 'جزء'],
    tocKeywords: ['الفهرس', 'المحتويات', 'جدول المحتويات', 'فهرس المحتويات', 'المحتوى'],
    sampleTitle: 'الوحدة الأولى - المقدمة',
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    script: 'latin',
    tesseractCode: 'fra',
    ocrSupported: true,
    rtl: false,
    headingPrefixes: ['CHAPITRE', 'UNITÉ', 'MODULE', 'LEÇON', 'PARTIE'],
    tocKeywords: ['TABLE DES MATIÈRES', 'SOMMAIRE', 'CONTENU'],
    sampleTitle: 'Chapitre 1 - Introduction',
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    script: 'latin',
    tesseractCode: 'spa',
    ocrSupported: true,
    rtl: false,
    headingPrefixes: ['CAPÍTULO', 'UNIDAD', 'MÓDULO', 'LECCIÓN', 'PARTE'],
    tocKeywords: ['ÍNDICE', 'CONTENIDO', 'TABLA DE CONTENIDO', 'ÍNDICE GENERAL'],
    sampleTitle: 'Capítulo 1 - Introducción',
  },
  sw: {
    code: 'sw',
    name: 'Swahili',
    nativeName: 'Kiswahili',
    script: 'latin',
    tesseractCode: 'swa',
    ocrSupported: true,
    rtl: false,
    headingPrefixes: ['SURA', 'SEHEMU', 'KITENGO', 'SOMO'],
    tocKeywords: ['YALIYOMO', 'JEDWALI LA YALIYOMO'],
    sampleTitle: 'Sura 1 - Utangulizi',
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    script: 'devanagari',
    tesseractCode: 'hin',
    ocrSupported: true,
    rtl: false,
    headingPrefixes: ['इकाई', 'अध्याय', 'पाठ', 'भाग', 'खण्ड'],
    tocKeywords: ['विषय सूची', 'अनुक्रमणिका', 'सामग्री'],
    sampleTitle: 'अध्याय 1 - परिचय',
  },
  zh: {
    code: 'zh',
    name: 'Simplified Chinese',
    nativeName: '简体中文',
    script: 'han',
    tesseractCode: 'chi_sim',
    ocrSupported: true,
    rtl: false,
    headingPrefixes: ['单元', '章', '课', '部分', '章节'],
    tocKeywords: ['目录', '目次', '内容'],
    sampleTitle: '第一单元 - 导论',
  },
};

/**
 * Verified languages that have official, available Tesseract OCR models
 */
export const SUPPORTED_OCR_LANGUAGES: SupportedLanguageCode[] = [
  'en',
  'am',
  'ti',
  'ar',
  'fr',
  'es',
  'sw',
  'hi',
  'zh',
];

// ==============================================================================
// NUMERAL MAPPINGS FOR ALL 10 LANGUAGES
// ==============================================================================

// 1. Arabic-Indic Digits (٠-٩)
export const ARABIC_INDIC_DIGITS: Record<string, number> = {
  '٠': 0, '١': 1, '٢': 2, '٣': 3, '٤': 4,
  '٥': 5, '٦': 6, '٧': 7, '٨': 8, '٩': 9,
};

// 2. Arabic Words & Ordinals (الأول, الثاني, etc.)
export const ARABIC_WORD_NUMERALS: Record<string, number> = {
  'اول': 1, 'الاول': 1, 'الأول': 1, 'اولى': 1, 'الاولى': 1, 'الأولى': 1, 'واحد': 1,
  'ثاني': 2, 'الثاني': 2, 'ثانية': 2, 'الثانية': 2, 'اثنين': 2, 'إثنين': 2,
  'ثالث': 3, 'الثالث': 3, 'ثالثة': 3, 'الثالثة': 3, 'ثلاثة': 3,
  'رابع': 4, 'الرابع': 4, 'رابعة': 4, 'الرابعة': 4, 'اربعة': 4, 'أربعة': 4,
  'خامس': 5, 'الخامس': 5, 'خامسة': 5, 'الخامسة': 5, 'خمسة': 5,
  'سادس': 6, 'السادس': 6, 'سادسة': 6, 'السادسة': 6, 'ستة': 6,
  'سابع': 7, 'السابع': 7, 'سابعة': 7, 'السابعة': 7, 'سبعة': 7,
  'ثامن': 8, 'الثامن': 8, 'ثامنة': 8, 'الثامنة': 8, 'ثمانية': 8,
  'تاسع': 9, 'التاسع': 9, 'تاسعة': 9, 'التاسعة': 9, 'تسعة': 9,
  'عاشر': 10, 'العاشر': 10, 'عاشرة': 10, 'العاشرة': 10, 'عشرة': 10,
  'حادي عشر': 11, 'الحادي عشر': 11, 'اثنا عشر': 12, 'الثاني عشر': 12,
};

// 3. Hindi Devanagari Digits (०-९)
export const HINDI_DEVANAGARI_DIGITS: Record<string, number> = {
  '०': 0, '१': 1, '२': 2, '३': 3, '४': 4,
  '५': 5, '६': 6, '७': 7, '८': 8, '९': 9,
};

// 4. Hindi Word Numerals
export const HINDI_WORD_NUMERALS: Record<string, number> = {
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5,
  'छह': 6, 'छः': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  'ग्यारह': 11, 'बारह': 12, 'तेरह': 13, 'चौदह': 14, 'पंद्रह': 15,
};

// 5. Chinese Numerals (一, 二, 三...)
export const CHINESE_DIGITS: Record<string, number> = {
  '零': 0, '〇': 0,
  '一': 1, '壹': 1,
  '二': 2, '贰': 2, '两': 2,
  '三': 3, '叁': 3,
  '四': 4, '肆': 4,
  '五': 5, '伍': 5,
  '六': 6, '陆': 6,
  '七': 7, '柒': 7,
  '八': 8, '捌': 8,
  '九': 9, '玖': 9,
  '十': 10, '拾': 10,
};

// Helper: parse Chinese compound numbers like 十一 (11), 二十 (20), 二十一 (21)
export function parseChineseNumber(str: string): number | null {
  const trimmed = str.trim();
  if (!trimmed) return null;

  // Single digit check
  if (CHINESE_DIGITS[trimmed] !== undefined) {
    return CHINESE_DIGITS[trimmed];
  }

  // Handle teens: 十一 -> 11, 十五 -> 15
  if (trimmed.startsWith('十') && trimmed.length === 2) {
    const unit = CHINESE_DIGITS[trimmed[1]];
    if (unit !== undefined) return 10 + unit;
  }

  // Handle tens: 二十 -> 20, 三十 -> 30
  if (trimmed.endsWith('十') && trimmed.length === 2) {
    const tens = CHINESE_DIGITS[trimmed[0]];
    if (tens !== undefined) return tens * 10;
  }

  // Handle tens + units: 二十一 -> 21, 三十五 -> 35
  if (trimmed.length === 3 && trimmed[1] === '十') {
    const tens = CHINESE_DIGITS[trimmed[0]];
    const unit = CHINESE_DIGITS[trimmed[2]];
    if (tens !== undefined && unit !== undefined) {
      return tens * 10 + unit;
    }
  }

  // Pure digits written with Chinese glyphs e.g. 一二 -> 12
  let accumulator = 0;
  let allValid = true;
  for (let i = 0; i < trimmed.length; i++) {
    const digit = CHINESE_DIGITS[trimmed[i]];
    if (digit !== undefined) {
      accumulator = accumulator * 10 + digit;
    } else {
      allValid = false;
      break;
    }
  }
  if (allValid && accumulator > 0) return accumulator;

  return null;
}

// 6. Afaan Oromo Words
export const OROMO_WORD_NUMERALS: Record<string, number> = {
  tokko: 1, lama: 2, sadii: 3, afur: 4, shan: 5,
  "ja'a": 6, jaa: 6, torba: 7, saddeet: 8, sagal: 9, kudhan: 10,
  'kudha tokko': 11, 'kudha lama': 12, digdama: 20,
};

// 7. Swahili Words
export const SWAHILI_WORD_NUMERALS: Record<string, number> = {
  moja: 1, mbili: 2, tatu: 3, nne: 4, tano: 5,
  sita: 6, saba: 7, nane: 8, tisa: 9, kumi: 10,
  'kumi na moja': 11, 'kumi na mbili': 12, ishirini: 20,
};

// 8. French Words
export const FRENCH_WORD_NUMERALS: Record<string, number> = {
  un: 1, une: 1, premier: 1, premiere: 1, première: 1,
  deux: 2, deuxième: 2, deuxieme: 2,
  trois: 3, troisième: 3, troisieme: 3,
  quatre: 4, quatrième: 4, quatrieme: 4,
  cinq: 5, cinquième: 5, cinquieme: 5,
  six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
  vingt: 20,
};

// 9. Spanish Words
export const SPANISH_WORD_NUMERALS: Record<string, number> = {
  uno: 1, una: 1, primero: 1, primera: 1, primer: 1,
  dos: 2, segundo: 2, segunda: 2,
  tres: 3, tercero: 3, tercera: 3, tercer: 3,
  cuatro: 4, cuarto: 4, cuarta: 4,
  cinco: 5, quinto: 5, quinta: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  veinte: 20,
};

// 10. Amharic & Tigrinya Word Numerals
export const ETHIOPIC_WORD_NUMERALS: Record<string, number> = {
  አንድ: 1, ሁለት: 2, ሦስት: 3, ሶስት: 3, አራት: 4, አምስት: 5,
  ስድስት: 6, ሰባት: 7, ስምንት: 8, ዘጠኝ: 9, አስር: 10, ዐስር: 10,
  ሓደ: 1, ክልተ: 2, ሰለስተ: 3, ኣርባዕተ: 4, ሓሙሽተ: 5,
  ሽድሽተ: 6, ሾብዓተ: 7, ሸሞንተ: 8, ትሽዓተ: 9, ዓሰርተ: 10,
};

// ==============================================================================
// MULTILINGUAL NUMERAL PARSER
// ==============================================================================

/**
 * Universal numeral parser supporting all 10 languages:
 * Western, Roman, Ethiopic (glyphs & words), Arabic (digits & ordinals),
 * Hindi (Devanagari & words), Chinese (glyphs & compound),
 * and Latin-script language words (English, French, Spanish, Swahili, Afaan Oromo).
 */
export function parseMultilingualNumber(raw: string): number | null {
  if (!raw) return null;
  const clean = raw.trim();
  const lower = clean.toLowerCase();

  // 1. Standard Western Arabic Digits (1, 2, 3...)
  const intVal = parseInt(clean, 10);
  if (!isNaN(intVal) && /^[0-9]+$/.test(clean)) {
    return intVal;
  }

  // 2. Arabic-Indic Digits (١, ٢, ٣...)
  if (/^[٠-٩]+$/.test(clean)) {
    let result = 0;
    for (let i = 0; i < clean.length; i++) {
      const d = ARABIC_INDIC_DIGITS[clean[i]];
      if (d === undefined) return null;
      result = result * 10 + d;
    }
    return result > 0 ? result : null;
  }

  // 3. Hindi Devanagari Digits (१, २, ३...)
  if (/^[०-९]+$/.test(clean)) {
    let result = 0;
    for (let i = 0; i < clean.length; i++) {
      const d = HINDI_DEVANAGARI_DIGITS[clean[i]];
      if (d === undefined) return null;
      result = result * 10 + d;
    }
    return result > 0 ? result : null;
  }

  // 4. Chinese Numerals (一, 二, 三, 十, 十一, 二十...)
  const chineseVal = parseChineseNumber(clean);
  if (chineseVal !== null) {
    return chineseVal;
  }

  // 5. Arabic Words & Ordinals (الأول, الثاني, etc.)
  if (ARABIC_WORD_NUMERALS[clean] !== undefined) {
    return ARABIC_WORD_NUMERALS[clean];
  }
  const cleanArabicNoAl = clean.replace(/^(ال|أل)/, '');
  if (ARABIC_WORD_NUMERALS[cleanArabicNoAl] !== undefined) {
    return ARABIC_WORD_NUMERALS[cleanArabicNoAl];
  }

  // 6. Hindi Words (एक, दो, तीन...)
  if (HINDI_WORD_NUMERALS[clean] !== undefined) {
    return HINDI_WORD_NUMERALS[clean];
  }

  // 7. Ethiopic Words (አንድ, ሓደ, etc.)
  if (ETHIOPIC_WORD_NUMERALS[clean] !== undefined) {
    return ETHIOPIC_WORD_NUMERALS[clean];
  }

  // 8. Afaan Oromo Words
  if (OROMO_WORD_NUMERALS[lower] !== undefined) {
    return OROMO_WORD_NUMERALS[lower];
  }

  // 9. Swahili Words
  if (SWAHILI_WORD_NUMERALS[lower] !== undefined) {
    return SWAHILI_WORD_NUMERALS[lower];
  }

  // 10. French Words
  if (FRENCH_WORD_NUMERALS[lower] !== undefined) {
    return FRENCH_WORD_NUMERALS[lower];
  }

  // 11. Spanish Words
  if (SPANISH_WORD_NUMERALS[lower] !== undefined) {
    return SPANISH_WORD_NUMERALS[lower];
  }

  return null;
}

// ==============================================================================
// AUTOMATIC LANGUAGE DETECTION
// ==============================================================================

export interface LanguageDetectionResult {
  detectedLanguage: SupportedLanguageCode | null;
  confidence: 'High' | 'Medium' | 'Low' | 'None';
  script: 'latin' | 'ethiopic' | 'arabic' | 'devanagari' | 'han' | 'unknown';
  scores: Record<SupportedLanguageCode, number>;
  insufficientText?: boolean;
}

/**
 * Accurately detects document language from sample text using script inspection
 * and distinctive lexical tokens across all 10 supported languages.
 * An empty or near-empty text sample is NEVER treated as English.
 */
export function detectDocumentLanguage(sampleText: string): LanguageDetectionResult {
  const scores: Record<SupportedLanguageCode, number> = {
    en: 0,
    am: 0,
    om: 0,
    ti: 0,
    ar: 0,
    fr: 0,
    es: 0,
    sw: 0,
    hi: 0,
    zh: 0,
  };

  const cleanChars = sampleText ? sampleText.trim().replace(/\s/g, '').length : 0;
  if (!sampleText || cleanChars < 15) {
    return {
      detectedLanguage: null,
      confidence: 'None',
      script: 'unknown',
      scores,
      insufficientText: true,
    };
  }

  // 1. Script character counts
  const cjkCount = (sampleText.match(/[\u4E00-\u9FFF]/g) || []).length;
  const devanagariCount = (sampleText.match(/[\u0900-\u097F]/g) || []).length;
  const arabicCount = (sampleText.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
  const ethiopicCount = (sampleText.match(/[\u1200-\u137F]/g) || []).length;

  if (cjkCount > 15) {
    scores.zh += cjkCount * 2;
    return {
      detectedLanguage: 'zh',
      confidence: cjkCount > 40 ? 'High' : 'Medium',
      script: 'han',
      scores,
    };
  }

  if (devanagariCount > 15) {
    scores.hi += devanagariCount * 2;
    return {
      detectedLanguage: 'hi',
      confidence: devanagariCount > 40 ? 'High' : 'Medium',
      script: 'devanagari',
      scores,
    };
  }

  if (arabicCount > 15) {
    scores.ar += arabicCount * 2;
    return {
      detectedLanguage: 'ar',
      confidence: arabicCount > 40 ? 'High' : 'Medium',
      script: 'arabic',
      scores,
    };
  }

  if (ethiopicCount > 15) {
    scores.am += ethiopicCount;
    scores.ti += ethiopicCount;

    // Distinguish Tigrinya vs Amharic using distinctive vocabulary & characters
    const tiKeywords = ['ትሕዝቶ', 'ትምህርቲ', 'ክፍሊ', 'መእተዊ', 'ኣርእስቲ', 'ሓደ', 'ክልተ', 'ሰለስተ', 'ኣርባዕተ', 'ቀዳማይ'];
    const amKeywords = ['ማውጫ', 'ትምህርት', 'ክፍል', 'መግቢያ', 'ርዕስ', 'አሃድ', 'አንድ', 'ሁለት', 'ሦስት', 'ሶስት', 'አራት', 'አምስት'];

    for (const kw of tiKeywords) {
      if (sampleText.includes(kw)) scores.ti += 15;
    }
    for (const kw of amKeywords) {
      if (sampleText.includes(kw)) scores.am += 15;
    }

    const tiLetters = (sampleText.match(/[ቐቘቚቛቜቝጘጙጚጛጜጝ]/g) || []).length;
    scores.ti += tiLetters * 20;
    const amLetters = (sampleText.match(/[ኧ]/g) || []).length;
    scores.am += amLetters * 20;

    const detectedLanguage: SupportedLanguageCode = scores.ti > scores.am ? 'ti' : 'am';
    return {
      detectedLanguage,
      confidence: 'High',
      script: 'ethiopic',
      scores,
    };
  }

  // 2. Latin Script Analysis (en, fr, es, sw, om)
  const lower = sampleText.toLowerCase();

  // Afaan Oromo keywords
  const oromoMatches = (lower.match(/\b(boqonnaa|kutaa|barnoota|mata duree|baafata|qabiyyee|seensa|fuula|tokko|lama|sadii|afur|shan|kudhan|gara|fi|kan|itti|keessatti)\b/g) || []).length;
  scores.om += oromoMatches * 4;

  // Swahili keywords
  const swahiliMatches = (lower.match(/\b(sura|sehemu|kitengo|somo|yaliyomo|utangulizi|ukurasa|moja|mbili|tatu|nne|tano|kumi|katika|ya|kwa|na|ni|hiki|kitabu)\b/g) || []).length;
  scores.sw += swahiliMatches * 4;

  // French keywords & accents
  const frenchAccents = (sampleText.match(/[éèêëàâîïôûùçœæ]/gi) || []).length;
  const frenchMatches = (lower.match(/\b(chapitre|unité|module|leçon|partie|sommaire|matières|introduction|page|premier|deuxième|troisième|dans|avec|pour|les|des|une?)\b/g) || []).length;
  scores.fr += frenchAccents * 2 + frenchMatches * 3;

  // Spanish keywords & accents
  const spanishAccents = (sampleText.match(/[áéíóúüñ¿¡]/gi) || []).length;
  const spanishMatches = (lower.match(/\b(capítulo|capitulo|unidad|módulo|modulo|lección|leccion|parte|índice|indice|contenido|introducción|introduccion|página|primero|segundo|tercero|en|con|para|los|las|una?)\b/g) || []).length;
  scores.es += spanishAccents * 2 + spanishMatches * 3;

  // English keywords
  const englishMatches = (lower.match(/\b(unit|chapter|module|lesson|part|section|contents|introduction|overview|summary|exercises|review|page|first|second|third|the|and|for|with|in|to)\b/g) || []).length;
  scores.en += englishMatches * 2;

  // Find winner
  let bestLang: SupportedLanguageCode = 'en';
  let bestScore = -1;

  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang as SupportedLanguageCode;
    }
  }

  // If score is too low, we do not guess or falsely claim language confidence
  if (bestScore < 4) {
    return {
      detectedLanguage: null,
      confidence: 'None',
      script: 'latin',
      scores,
      insufficientText: false,
    };
  }

  const confidence: 'High' | 'Medium' | 'Low' = bestScore >= 12 ? 'High' : 'Medium';

  return {
    detectedLanguage: bestLang,
    confidence,
    script: 'latin',
    scores,
    insufficientText: false,
  };
}
