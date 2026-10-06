import crypto from 'crypto';

export interface BybitConfig {
  apiKey: string;
  apiSecret: string;
  depositAddress: string;
  uid?: string;
}

export interface BybitDepositRecord {
  id?: string;
  coin: string;
  chain: string;
  amount: string;
  txID: string;
  status: number; // 1: toBeConfirmed, 2: processing, 3: success, 4: deposit failed
  toAddress: string;
  successAt?: string;
  confirmations?: string;
  blockHash?: string;
  depositId?: string;
  batchReleaseLimit?: string;
  depositType?: number;
}

export interface DepositMatchResult {
  matched: boolean;
  status: 'pending' | 'detected' | 'confirmed' | 'amount_mismatch' | 'late_payment';
  deposit?: BybitDepositRecord;
  reason?: string;
}

export interface ExactUsdtParseResult {
  valid: boolean;
  microUnits: bigint;
  normalized: string;
  hasExtraPrecision: boolean;
}

/**
 * Returns current Bybit configuration from server environment variables.
 * NEVER expose BYBIT_API_SECRET to the client.
 * Destination address is loaded strictly from BYBIT_USDT_POLYGON_ADDRESS.
 */
export function getBybitConfig(): BybitConfig {
  return {
    apiKey: process.env.BYBIT_API_KEY || '',
    apiSecret: process.env.BYBIT_API_SECRET || '',
    depositAddress: process.env.BYBIT_USDT_POLYGON_ADDRESS || '',
    uid: process.env.BYBIT_UID || '',
  };
}

/**
 * Generates an HMAC-SHA256 signature for Bybit V5 API GET requests.
 * Bybit V5 specification: sign = HMAC_SHA256(timestamp + apiKey + recvWindow + queryString, apiSecret)
 */
export function generateBybitV5Signature(
  timestamp: string | number,
  apiKey: string,
  recvWindow: string | number,
  queryString: string,
  apiSecret: string
): string {
  const signString = `${timestamp}${apiKey}${recvWindow}${queryString}`;
  return crypto.createHmac('sha256', apiSecret).update(signString).digest('hex');
}

/**
 * Generates a unique USDT payment amount with a 6-decimal fractional suffix.
 * Base price defaults to 2.00 USDT, or the discounted final price when a coupon is applied.
 * Produces amounts such as 2.004821, 1.504821, 1.751537, etc.
 * Uses exact integer micro-units to prevent binary floating-point inaccuracy.
 *
 * @param activeAmounts Existing active amounts to prevent collisions.
 * @param baseAmountUsd The payable base amount (e.g. 2.00 or discounted 1.50).
 */
export function generateUniquePaymentAmount(
  activeAmounts?: Set<string> | string[],
  baseAmountUsd: string | number = '2.00'
): string {
  const existingSet = activeAmounts instanceof Set ? activeAmounts : new Set(activeAmounts || []);
  const baseParsed = parseExactUsdt(baseAmountUsd);
  const baseMicro = baseParsed.valid ? baseParsed.microUnits : 2000000n;

  for (let attempt = 0; attempt < 100; attempt++) {
    // Generate random 4-digit fraction between 1000 and 9999 (0.001000 to 0.009999)
    const randomSuffix = BigInt(Math.floor(1000 + Math.random() * 8999));
    const candidateMicro = baseMicro + randomSuffix;
    const intPart = candidateMicro / 1000000n;
    const fracPart = (candidateMicro % 1000000n).toString().padStart(6, '0');
    const candidate = `${intPart}.${fracPart}`;
    if (!existingSet.has(candidate)) {
      return candidate;
    }
  }

  // Fallback high-entropy suffix
  const highEntropy = BigInt(1000 + (Date.now() % 8999));
  const fallbackMicro = baseMicro + highEntropy;
  const intPart = fallbackMicro / 1000000n;
  const fracPart = (fallbackMicro % 1000000n).toString().padStart(6, '0');
  return `${intPart}.${fracPart}`;
}

/**
 * Validates whether a chain name returned by Bybit corresponds to the Polygon PoS network.
 * Bybit commonly denotes Polygon as 'MATIC' or 'Polygon' or 'POLYGON' or 'POLYGON POS'.
 */
export function isPolygonNetwork(chainName: string): boolean {
  if (!chainName || typeof chainName !== 'string') return false;
  const c = chainName.trim().toLowerCase();
  return c.includes('matic') || c.includes('polygon') || c === 'pos';
}

/**
 * Parses a decimal amount string into exact integer micro-units (1 USDT = 1,000,000 micro-units).
 * Employs exact decimal string arithmetic to prevent IEEE-754 binary floating-point rounding errors.
 */
export function parseExactUsdt(amount: string | number): ExactUsdtParseResult {
  if (amount === undefined || amount === null) {
    return { valid: false, microUnits: 0n, normalized: '0.000000', hasExtraPrecision: false };
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
export function exactAmountsMatch(expected: string | number, received: string | number): boolean {
  const exp = parseExactUsdt(expected);
  const rec = parseExactUsdt(received);

  if (!exp.valid || !rec.valid) return false;
  if (exp.hasExtraPrecision || rec.hasExtraPrecision) return false;

  return exp.microUnits === rec.microUnits;
}

/**
 * Normalizes an amount representation to standard 6-decimal string.
 */
export function normalizeAmount(amount: string | number): string {
  const parsed = parseExactUsdt(amount);
  return parsed.valid ? parsed.normalized : '0.000000';
}

/**
 * Queries Bybit V5 Asset Deposit Records API.
 * Endpoint: GET /v5/asset/deposit/query-record
 */
export async function fetchBybitDeposits(params?: {
  coin?: string;
  limit?: number;
  startTime?: number;
  endTime?: number;
  cursor?: string;
}): Promise<{ success: boolean; rows: BybitDepositRecord[]; nextPageCursor?: string; error?: string }> {
  const { apiKey, apiSecret } = getBybitConfig();

  if (!apiKey || !apiSecret) {
    return {
      success: false,
      rows: [],
      error: 'Bybit API credentials not configured',
    };
  }

  const coin = params?.coin || 'USDT';
  const limit = params?.limit || 50;
  const timestamp = Date.now().toString();
  const recvWindow = '5000';

  const queryObj: Record<string, string> = {
    coin,
    limit: limit.toString(),
  };

  if (params?.startTime) {
    queryObj.startTime = params.startTime.toString();
  }

  if (params?.endTime) {
    queryObj.endTime = params.endTime.toString();
  }

  if (params?.cursor) {
    queryObj.cursor = params.cursor;
  }

  const queryString = new URLSearchParams(queryObj).toString();
  const signature = generateBybitV5Signature(
    timestamp,
    apiKey,
    recvWindow,
    queryString,
    apiSecret
  );

  const url = `https://api.bybit.com/v5/asset/deposit/query-record?${queryString}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recvWindow,
        'X-BAPI-SIGN': signature,
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (data.retCode === 0 && data.result && Array.isArray(data.result.rows)) {
      return {
        success: true,
        rows: data.result.rows,
        nextPageCursor: data.result.nextPageCursor || undefined,
      };
    }

    return {
      success: false,
      rows: [],
      error: data.retMsg || `Bybit API returned code ${data.retCode}`,
    };
  } catch (err: any) {
    return {
      success: false,
      rows: [],
      error: err.message || 'Network error querying Bybit API',
    };
  }
}

/**
 * Matches Bybit deposit records against an order's required parameters:
 * 1. Coin must be USDT
 * 2. Chain must be Polygon / MATIC
 * 3. Destination address must match BYBIT_USDT_POLYGON_ADDRESS
 * 4. Amount must exactly match order.payment_amount_usdt using exact decimal comparison
 * 5. Deposit time must be within the order's 20-minute window
 * 6. Status must be 1/2 (detected) or 3 (confirmed)
 */
export function matchDepositToOrder(
  order: {
    payment_amount_usdt: number | string;
    destination_address: string;
    created_at: string;
    expires_at: string;
  },
  deposits: BybitDepositRecord[],
  consumedDepositIds: Set<string> = new Set()
): DepositMatchResult {
  const targetAddress = order.destination_address.trim().toLowerCase();
  const orderCreatedMs = new Date(order.created_at).getTime();
  const orderExpiresMs = new Date(order.expires_at).getTime();

  let possibleMismatchDeposit: BybitDepositRecord | undefined;

  for (const dep of deposits) {
    const depId = dep.id || dep.depositId || dep.txID;
    if (consumedDepositIds.has(depId)) {
      continue;
    }

    // 1. Verify Coin
    if ((dep.coin || '').toUpperCase() !== 'USDT') {
      continue;
    }

    // 2. Verify Network
    if (!isPolygonNetwork(dep.chain)) {
      continue;
    }

    // 3. Verify Destination Address
    if ((dep.toAddress || '').trim().toLowerCase() !== targetAddress) {
      continue;
    }

    const depTime = parseInt(dep.successAt || '0', 10);

    // Filter out deposits that clearly occurred before this order was created (allow 60s clock skew)
    if (depTime > 0 && depTime < orderCreatedMs - 60000) {
      continue;
    }

    // Check for exact amount match with exact decimal arithmetic
    if (exactAmountsMatch(order.payment_amount_usdt, dep.amount)) {
      // Check if deposited after the 20-minute expiration window (allow 30s grace for block latency)
      if (depTime > 0 && depTime > orderExpiresMs + 30000) {
        return {
          matched: true,
          status: 'late_payment',
          deposit: dep,
          reason: 'Deposit received after the 20-minute order window expired.',
        };
      }

      // Check confirmation status
      // Bybit: 1 = toBeConfirmed, 2 = processing, 3 = success
      if (dep.status === 3) {
        return {
          matched: true,
          status: 'confirmed',
          deposit: dep,
        };
      } else if (dep.status === 1 || dep.status === 2) {
        return {
          matched: true,
          status: 'detected',
          deposit: dep,
          reason: 'Deposit detected on Polygon network; waiting for required block confirmations.',
        };
      }
    } else {
      // Tracking close deposit within time window with different amount for mismatch diagnostic
      if (depTime >= orderCreatedMs - 60000 && (!depTime || depTime <= orderExpiresMs + 60000)) {
        possibleMismatchDeposit = dep;
      }
    }
  }

  if (possibleMismatchDeposit) {
    return {
      matched: false,
      status: 'amount_mismatch',
      deposit: possibleMismatchDeposit,
      reason: `Deposit of ${possibleMismatchDeposit.amount} USDT does not match required ${normalizeAmount(order.payment_amount_usdt)} USDT.`,
    };
  }

  return {
    matched: false,
    status: 'pending',
  };
}
