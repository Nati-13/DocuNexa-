import crypto from 'crypto';
import {
  parseExactUsdt,
  format4DecimalUsdt,
  roundMicroUnitsTo4Decimals,
  formatPaymentAmount,
  exactAmountsMatch,
  normalizeAmount,
} from './format';

export * from './format';

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
 * Generates a unique USDT payment amount with exactly 4 digits after the decimal point.
 * Base price defaults to 2.00 USDT, or the discounted final price when a coupon is applied.
 * Adds a small unique surcharge between 0.0010 and 0.0099 USDT (offsets 10..99 in 100 micro-units).
 * Produces amounts such as 2.0010, 2.0048, or 2.0099.
 *
 * All calculations use integer micro-units (1 USDT = 1,000,000 micro-units) to prevent binary
 * floating-point inaccuracy.
 *
 * Normalizes active amounts numerically so representations like "2.0048" and "2.004800"
 * count as identical amounts.
 *
 * If all 90 applicable candidates are occupied, throws a clear recoverable Error instead of
 * returning a duplicate amount or using a six-decimal fallback.
 *
 * @param activeAmounts Existing active amounts to prevent collisions.
 * @param baseAmountUsd The payable base amount (e.g. 2.00 or discounted 1.50).
 */
export function generateUniquePaymentAmount(
  activeAmounts?: Iterable<string | number | bigint> | null,
  baseAmountUsd: string | number = '2.00'
): string {
  const activeMicroSet = new Set<bigint>();
  if (activeAmounts) {
    for (const item of activeAmounts) {
      if (typeof item === 'bigint') {
        activeMicroSet.add(item);
      } else {
        const parsed = parseExactUsdt(item);
        if (parsed.valid) {
          activeMicroSet.add(parsed.microUnits);
        }
      }
    }
  }

  const baseParsed = parseExactUsdt(baseAmountUsd);
  let baseMicro = baseParsed.valid ? baseParsed.microUnits : 2000000n;

  // Apply deterministic round-half-up if base amount has > 4 decimal places
  if (baseMicro % 100n !== 0n) {
    baseMicro = roundMicroUnitsTo4Decimals(baseMicro);
  }

  // Candidate surcharges between 0.0010 and 0.0099 USDT (90 discrete offsets: 10..99)
  const availableOffsets: number[] = [];
  for (let offset = 10; offset <= 99; offset++) {
    const candidateMicro = baseMicro + BigInt(offset) * 100n;
    if (!activeMicroSet.has(candidateMicro)) {
      availableOffsets.push(offset);
    }
  }

  if (availableOffsets.length === 0) {
    throw new Error(
      'All unique payment amounts for this price tier are currently allocated. Please wait a few minutes for pending orders to settle or expire.'
    );
  }

  // Select uniformly at random among available candidate offsets
  const randomIndex = Math.floor(Math.random() * availableOffsets.length);
  const chosenOffset = availableOffsets[randomIndex];
  const chosenMicro = baseMicro + BigInt(chosenOffset) * 100n;

  return format4DecimalUsdt(chosenMicro);
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
      reason: `Deposit of ${possibleMismatchDeposit.amount} USDT does not match required ${formatPaymentAmount(order.payment_amount_usdt)} USDT.`,
    };
  }

  return {
    matched: false,
    status: 'pending',
  };
}
