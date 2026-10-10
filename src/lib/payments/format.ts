export interface ExactUsdtParseResult {
  valid: boolean;
  microUnits: bigint;
  normalized: string;
  hasExtraPrecision: boolean;
}

/**
 * Parses a decimal amount string into exact integer micro-units (1 USDT = 1,000,000 micro-units).
 * Employs exact decimal string arithmetic to prevent IEEE-754 binary floating-point rounding errors.
 */
export function parseExactUsdt(amount: string | number | bigint | null | undefined): ExactUsdtParseResult {
  if (amount === undefined || amount === null) {
    return { valid: false, microUnits: 0n, normalized: '0.000000', hasExtraPrecision: false };
  }
  if (typeof amount === 'bigint') {
    const isNeg = amount < 0n;
    const abs = isNeg ? -amount : amount;
    const intPart = (abs / 1000000n).toString();
    const frac6 = (abs % 1000000n).toString().padStart(6, '0');
    return {
      valid: true,
      microUnits: amount,
      normalized: `${isNeg ? '-' : ''}${intPart}.${frac6}`,
      hasExtraPrecision: false,
    };
  }
  const str = String(amount).trim();
  const match = str.match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) {
    return { valid: false, microUnits: 0n, normalized: '0.000000', hasExtraPrecision: false };
  }

  const intPart = match[1];
  const rawFrac = match[2] || '';
  const frac6 = rawFrac.padEnd(6, '0').slice(0, 6);
  const extraDecimals = rawFrac.length > 6 ? rawFrac.slice(6) : '';
  const hasExtraPrecision = extraDecimals.length > 0 && !/^0+$/.test(extraDecimals);

  const microUnits = BigInt(intPart) * 1000000n + BigInt(frac6);
  const normalized = `${intPart}.${frac6}`;

  return {
    valid: true,
    microUnits,
    normalized,
    hasExtraPrecision,
  };
}

/**
 * Strict exact decimal comparison between expected order amount and received deposit amount.
 * - Rejects binary floating-point comparisons
 * - Rejects any extra precision beyond 6 decimal places (e.g. 2.0048211 != 2.004821)
 * - Returns true ONLY if micro-units match exactly
 */
export function exactAmountsMatch(
  expected: string | number | bigint,
  received: string | number | bigint
): boolean {
  const exp = parseExactUsdt(expected);
  const rec = parseExactUsdt(received);

  if (!exp.valid || !rec.valid) return false;
  if (exp.hasExtraPrecision || rec.hasExtraPrecision) return false;

  return exp.microUnits === rec.microUnits;
}

/**
 * Normalizes an amount representation to standard 6-decimal string.
 */
export function normalizeAmount(amount: string | number | bigint): string {
  const parsed = parseExactUsdt(amount);
  return parsed.valid ? parsed.normalized : '0.000000';
}

/**
 * Deterministically rounds integer micro-units to 4 decimal places (nearest 100 micro-units)
 * using standard round-half-up (>= 50 micro-units rounds up).
 */
export function roundMicroUnitsTo4Decimals(microUnits: bigint): bigint {
  const isNegative = microUnits < 0n;
  const abs = isNegative ? -microUnits : microUnits;
  const rem = abs % 100n;
  let roundedAbs = abs;
  if (rem >= 50n) {
    roundedAbs = abs + (100n - rem);
  } else {
    roundedAbs = abs - rem;
  }
  return isNegative ? -roundedAbs : roundedAbs;
}

/**
 * Formats integer micro-units with exactly 4 decimal places (1 USDT = 1,000,000 micro-units).
 * Assumes microUnits is already a multiple of 100 (4-decimal precision).
 */
export function format4DecimalUsdt(microUnits: bigint): string {
  const isNegative = microUnits < 0n;
  const abs = isNegative ? -microUnits : microUnits;
  const intPart = abs / 1000000n;
  const fracPart = ((abs % 1000000n) / 100n).toString().padStart(4, '0');
  return `${isNegative ? '-' : ''}${intPart}.${fracPart}`;
}

/**
 * Formats any payment amount consistently:
 * - If amount has 4 decimal places or fewer (multiple of 100 micro-units), formats with exactly 4 decimals (e.g. "2.0048")
 * - If historical order with 6-decimal precision (sub-100 micro-units, e.g. "2.004821"), preserves all 6 decimals.
 */
export function formatPaymentAmount(amount: string | number | bigint | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '0.0000';
  if (typeof amount === 'bigint') {
    if (amount % 100n !== 0n) {
      const isNeg = amount < 0n;
      const abs = isNeg ? -amount : amount;
      return `${isNeg ? '-' : ''}${abs / 1000000n}.${(abs % 1000000n).toString().padStart(6, '0')}`;
    }
    return format4DecimalUsdt(amount);
  }
  const parsed = parseExactUsdt(amount);
  if (!parsed.valid) return String(amount);
  const micro = parsed.microUnits;
  if (micro % 100n !== 0n) {
    const isNeg = micro < 0n;
    const abs = isNeg ? -micro : micro;
    return `${isNeg ? '-' : ''}${abs / 1000000n}.${(abs % 1000000n).toString().padStart(6, '0')}`;
  }
  return format4DecimalUsdt(micro);
}
