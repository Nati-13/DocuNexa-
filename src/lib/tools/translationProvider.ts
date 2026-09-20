export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  isLocallySupported: boolean;
}

export const SUPPORTED_LANGUAGES_MATRIX: LanguageOption[] = [
  { code: 'amh', name: 'Amharic', nativeName: 'አማርኛ', isLocallySupported: true },
  { code: 'en', name: 'English', nativeName: 'English', isLocallySupported: false },
  { code: 'orm', name: 'Afaan Oromo', nativeName: 'Afaan Oromoo', isLocallySupported: false },
  { code: 'tir', name: 'Tigrinya', nativeName: 'ትግርኛ', isLocallySupported: false },
  { code: 'ara', name: 'Arabic', nativeName: 'العربية', isLocallySupported: false },
  { code: 'fra', name: 'French', nativeName: 'Français', isLocallySupported: false },
  { code: 'spa', name: 'Spanish', nativeName: 'Español', isLocallySupported: false },
  { code: 'por', name: 'Portuguese', nativeName: 'Português', isLocallySupported: false },
  { code: 'deu', name: 'German', nativeName: 'Deutsch', isLocallySupported: false },
  { code: 'ita', name: 'Italian', nativeName: 'Italiano', isLocallySupported: false },
  { code: 'nld', name: 'Dutch', nativeName: 'Nederlands', isLocallySupported: false },
  { code: 'tur', name: 'Turkish', nativeName: 'Türkçe', isLocallySupported: false },
  { code: 'rus', name: 'Russian', nativeName: 'Русский', isLocallySupported: false },
  { code: 'ukr', name: 'Ukrainian', nativeName: 'Українська', isLocallySupported: false },
  { code: 'zho-hans', name: 'Chinese (Simplified)', nativeName: '简体中文', isLocallySupported: false },
  { code: 'zho-hant', name: 'Chinese (Traditional)', nativeName: '繁體中文', isLocallySupported: false },
  { code: 'jpn', name: 'Japanese', nativeName: '日本語', isLocallySupported: false },
  { code: 'kor', name: 'Korean', nativeName: '한국어', isLocallySupported: false },
  { code: 'hin', name: 'Hindi', nativeName: 'हिन्दी', isLocallySupported: false },
  { code: 'ben', name: 'Bengali', nativeName: 'বাংলা', isLocallySupported: false },
  { code: 'urd', name: 'Urdu', nativeName: 'اردو', isLocallySupported: false },
  { code: 'fas', name: 'Persian', nativeName: 'فارسی', isLocallySupported: false },
  { code: 'swa', name: 'Swahili', nativeName: 'Kiswahili', isLocallySupported: false },
  { code: 'som', name: 'Somali', nativeName: 'Soomaali', isLocallySupported: false },
  { code: 'ell', name: 'Greek', nativeName: 'Ελληνικά', isLocallySupported: false },
];

export const SUPPORTED_TRANSLATION_LANGUAGES = SUPPORTED_LANGUAGES_MATRIX;

export function getLanguageInfo(code: string): LanguageOption | undefined {
  return SUPPORTED_LANGUAGES_MATRIX.find(
    (l) => l.code.toLowerCase() === code.toLowerCase() || l.code.toLowerCase().startsWith(code.toLowerCase())
  );
}

export function getTranslationEngine(): TranslationProvider {
  return new LocalRuleBasedTranslationProvider();
}

export interface TranslationResultPayload {
  translatedText: string;
  isSupported: boolean;
  unsupportedMessage?: string;
  engineLabel: string;
}

export interface TranslationProvider {
  providerName: string;
  isLocalOnly: boolean;
  supportedLanguages(): LanguageOption[];
  translateText(
    text: string,
    sourceLang: string,
    targetLangCode: string
  ): Promise<TranslationResultPayload>;
}

/**
 * Local rule-based translation provider.
 * Strictly limits local transformation to languages with authentic implementations (Amharic).
 * Explicitly rejects unsupported languages rather than returning fake or unchanged source text.
 */
export class LocalRuleBasedTranslationProvider implements TranslationProvider {
  providerName = 'Basic Local Translation (Glossary & Phrase Transformation)';
  isLocalOnly = true;

  supportedLanguages(): LanguageOption[] {
    return SUPPORTED_LANGUAGES_MATRIX;
  }

  async translateText(
    text: string,
    sourceLang: string,
    targetLangCode: string
  ): Promise<TranslationResultPayload> {
    const langNormalized = targetLangCode.toLowerCase().trim();

    // Only Amharic has a genuine local glossary transformation engine
    if (langNormalized === 'amh' || langNormalized === 'amharic') {
      const amharicGlossary: Record<string, string> = {
        unit: 'ምዕራፍ',
        chapter: 'ምዕራፍ',
        lesson: 'ትምህርት',
        section: 'ክፍል',
        introduction: 'መግቢያ',
        summary: 'ማጠቃለያ',
        biology: 'ሥነ-ህይወት',
        science: 'ሳይንስ',
        cell: 'ህዋስ',
        genetics: 'ዘረ-መል',
        definition: 'ትርጓሜ',
        question: 'ጥያቄ',
        questions: 'ጥያቄዎች',
        exercise: 'መልመጃ',
        table: 'ሠንጠረዥ',
        report: 'ሪፖርት',
        page: 'ገጽ',
        pages: 'ገጾች',
        author: 'ደራሲ',
        conclusion: 'መደምደሚያ',
        overview: 'አጠቃላይ እይታ',
      };

      let result = text;
      let matchedCount = 0;

      for (const [en, am] of Object.entries(amharicGlossary)) {
        const regex = new RegExp(`\\b${en}\\b`, 'gi');
        if (regex.test(result)) {
          result = result.replace(regex, am);
          matchedCount++;
        }
      }

      if (matchedCount === 0) {
        return {
          translatedText: '',
          isSupported: false,
          unsupportedMessage:
            'No matching terminology found in this document for local Amharic glossary translation. The original source text was preserved without claiming translation.',
          engineLabel: this.providerName,
        };
      }

      return {
        translatedText: result,
        isSupported: true,
        engineLabel: `${this.providerName} (${matchedCount} term${matchedCount > 1 ? 's' : ''} translated)`,
      };
    }

    // Explicitly reject all other languages without a genuine local engine
    // NEVER return source text disguised as translation
    const targetOption = SUPPORTED_LANGUAGES_MATRIX.find(
      (l) => l.code.toLowerCase() === langNormalized || l.name.toLowerCase() === langNormalized
    );
    const targetLabel = targetOption ? `${targetOption.name} (${targetOption.nativeName})` : targetLangCode;

    return {
      translatedText: '',
      isSupported: false,
      unsupportedMessage: `Language '${targetLabel}' is not available in the current local translation engine. Please select a locally supported language (Amharic) or configure an external Translation Provider.`,
      engineLabel: this.providerName,
    };
  }
}

let activeTranslationProvider: TranslationProvider = new LocalRuleBasedTranslationProvider();

export function getTranslationProvider(): TranslationProvider {
  return activeTranslationProvider;
}

export function setTranslationProvider(provider: TranslationProvider): void {
  activeTranslationProvider = provider;
}
