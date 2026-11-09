/**
 * DocuNexa — Country Code Normalization & English Display Mapping
 *
 * Normalizes ISO 3166-1 alpha-2 codes and maps them to full English names
 * using the standard Intl.DisplayNames API with an offline fallback map.
 */

// Fallback dictionary of common ISO 3166-1 alpha-2 country codes
export const ISO_COUNTRY_NAMES: Record<string, string> = {
  ET: 'Ethiopia',
  YE: 'Yemen',
  VN: 'Vietnam',
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  CA: 'Canada',
  AU: 'Australia',
  IN: 'India',
  KE: 'Kenya',
  NG: 'Nigeria',
  ZA: 'South Africa',
  NL: 'Netherlands',
  SE: 'Sweden',
  BR: 'Brazil',
  JP: 'Japan',
  SG: 'Singapore',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  EG: 'Egypt',
  CN: 'China',
  IT: 'Italy',
  ES: 'Spain',
  CH: 'Switzerland',
  PL: 'Poland',
  TR: 'Turkey',
  SO: 'Somalia',
  SD: 'Sudan',
  DJ: 'Djibouti',
  ER: 'Eritrea',
  UG: 'Uganda',
  RW: 'Rwanda',
  TZ: 'Tanzania',
  GH: 'Ghana',
  ID: 'Indonesia',
  PK: 'Pakistan',
  BD: 'Bangladesh',
  RU: 'Russia',
  MX: 'Mexico',
  KR: 'South Korea',
};

let displayNamesInstance: Intl.DisplayNames | null = null;
try {
  displayNamesInstance = new Intl.DisplayNames(['en'], { type: 'region' });
} catch {
  displayNamesInstance = null;
}

/**
 * Normalizes a raw country code string into a valid 2-letter uppercase ISO 3166-1 alpha-2 code.
 * Returns null if missing, invalid, or representing non-geographic/private networks (XX, T1, ZZ).
 */
export function normalizeCountryCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toUpperCase();
  if (trimmed.length !== 2) return null;
  // Non-geographic / private proxy codes
  if (trimmed === 'XX' || trimmed === 'T1' || trimmed === 'ZZ') return null;
  // Must be two ASCII letters A-Z
  if (!/^[A-Z]{2}$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Converts an ISO 3166-1 alpha-2 code into a full human-readable English country name.
 * Uses Intl.DisplayNames if available, falling back to static mapping, or 'Unknown location'.
 */
export function getCountryName(code: string | null | undefined): string {
  const normalized = normalizeCountryCode(code);
  if (!normalized) {
    return 'Unknown location';
  }

  if (displayNamesInstance) {
    try {
      const name = displayNamesInstance.of(normalized);
      if (name && name !== normalized) {
        return name;
      }
    } catch {
      // ignore
    }
  }

  return ISO_COUNTRY_NAMES[normalized] || normalized;
}

/**
 * Returns the regional flag emoji for a given country code, or '🌐' for unknown.
 */
export function getCountryFlag(code: string | null | undefined): string {
  const normalized = normalizeCountryCode(code);
  if (!normalized) {
    return '🌐';
  }
  const codePoints = normalized
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

