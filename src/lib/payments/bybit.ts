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
  const stripQuotes = (val: string | undefined): string =>
    (val || '').replace(/^["']|["']$/g, '').trim();
  return {
    apiKey: stripQuotes(process.env.BYBIT_API_KEY),
    apiSecret: stripQuotes(process.env.BYBIT_API_SECRET),
    depositAddress: stripQuotes(process.env.BYBIT_USDT_POLYGON_ADDRESS),
    uid: stripQuotes(process.env.BYBIT_UID),
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

// =============================================================================
// BYBIT UID INTERNAL TRANSFER SUPPORT (V5 API)
// Endpoint: GET /v5/asset/deposit/query-internal-record
// Doc: https://bybit-exchange.github.io/docs/v5/asset/deposit/internal-deposit-record
// =============================================================================

export interface BybitInternalDepositRecord {
  id?: string;
  type?: number;
  coin: string;
  amount: string;
  status: number; // 1: Processing, 2: Successful, 3: Failed
  address?: string;
  createdTime: string; // millisecond timestamp
  txID: string;
  fromMemberId?: string;
  toMemberId?: string;
}

export interface InternalDepositMatchResult {
  matched: boolean;
  status: 'pending' | 'detected' | 'confirmed' | 'amount_mismatch' | 'late_payment' | 'ambiguous';
  deposit?: BybitInternalDepositRecord;
  reason?: string;
  ambiguous?: boolean;
}

export interface InternalDepositsFetchResult {
  success: boolean;
  rows: BybitInternalDepositRecord[];
  nextPageCursor?: string;
  error?: string;
  rateLimited?: boolean;
}

// In-memory bounded cache for internal deposits queries (TTL: 5 seconds)
interface CachedInternalDeposits {
  cachedAt: number;
  data: InternalDepositsFetchResult;
}

const internalDepositsCache = new Map<string, CachedInternalDeposits>();
const INTERNAL_DEPOSITS_CACHE_TTL_MS = 5000;

// In-memory cache for API key identity verification (TTL: 60 seconds)
interface CachedApiKeyIdentity {
  cachedAt: number;
  configKey: string;
  result: BybitApiKeyInfoResult;
}

let cachedApiKeyIdentity: CachedApiKeyIdentity | null = null;
const API_KEY_IDENTITY_CACHE_TTL_MS = 60000;

/**
 * Clears in-memory caches (used primarily during automated test execution).
 */
export function clearBybitInternalCaches(): void {
  cachedApiKeyIdentity = null;
  internalDepositsCache.clear();
}

/**
 * Returns process-local cache statistics and properties.
 * Explicitly documents that caching is process-local within a single runtime instance,
 * while cross-instance idempotency is strictly enforced by database constraints.
 */
export function getBybitInternalCacheStats(): {
  depositsCacheSize: number;
  hasCachedApiKeyIdentity: boolean;
  ttlMs: number;
  isProcessLocalOnly: boolean;
} {
  return {
    depositsCacheSize: internalDepositsCache.size,
    hasCachedApiKeyIdentity: cachedApiKeyIdentity !== null,
    ttlMs: INTERNAL_DEPOSITS_CACHE_TTL_MS,
    isProcessLocalOnly: true,
  };
}

/**
 * Sets a cache entry directly (used for deterministic testing of cache reuse and expiry).
 */
export function setMockInternalDepositsCache(
  key: string,
  data: InternalDepositsFetchResult,
  cachedAt: number = Date.now()
): void {
  internalDepositsCache.set(key, { cachedAt, data });
}

/**
 * Queries Bybit V5 Internal Deposit Records API for account-to-account USDT transfers.
 * Endpoint: GET /v5/asset/deposit/query-internal-record
 *
 * Implements bounded server-side polling cache (5s TTL) and Bybit rate-limit (retCode 10006 / HTTP 429) handling.
 */
export async function fetchBybitInternalDeposits(
  params?: {
    coin?: string;
    limit?: number;
    startTime?: number;
    endTime?: number;
    txID?: string;
    cursor?: string;
  },
  bypassCache: boolean = false
): Promise<InternalDepositsFetchResult> {
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
  const txID = params?.txID ? params.txID.trim() : '';

  // Bucket startTime to 1-minute blocks so concurrent checkout polls share the cached feed
  const startTimeBucket = params?.startTime ? Math.floor(params.startTime / 60000) * 60000 : 0;
  const cacheKey = txID
    ? `tx:${txID.toLowerCase()}`
    : `feed:${coin}:${limit}:${startTimeBucket}:${params?.cursor || ''}`;

  const now = Date.now();
  if (!bypassCache) {
    const cached = internalDepositsCache.get(cacheKey);
    if (cached && now - cached.cachedAt < INTERNAL_DEPOSITS_CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const timestamp = now.toString();
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

  if (txID) {
    queryObj.txID = txID;
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

  const url = `https://api.bybit.com/v5/asset/deposit/query-internal-record?${queryString}`;

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

    const isHttpRateLimited = response.status === 429;
    const data = await response.json();

    const isBybitRateLimited =
      isHttpRateLimited ||
      data.retCode === 10006 ||
      String(data.retMsg || '').toLowerCase().includes('too many') ||
      String(data.retMsg || '').toLowerCase().includes('rate limit');

    if (isBybitRateLimited) {
      // If we have an existing cache entry within the last 30s, safely reuse it during rate-limiting
      const stale = internalDepositsCache.get(cacheKey);
      if (stale && stale.data.success && now - stale.cachedAt < 30000) {
        return {
          ...stale.data,
          rateLimited: true,
          error: 'Rate limit reached; using recent cached deposit records',
        };
      }
      return {
        success: false,
        rows: [],
        rateLimited: true,
        error: data.retMsg || 'Bybit API rate limit reached. Backing off.',
      };
    }

    if (data.retCode === 0 && data.result && Array.isArray(data.result.rows)) {
      const resultData: InternalDepositsFetchResult = {
        success: true,
        rows: data.result.rows,
        nextPageCursor: data.result.nextPageCursor || undefined,
      };
      internalDepositsCache.set(cacheKey, {
        cachedAt: now,
        data: resultData,
      });
      return resultData;
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
      error: err.message || 'Network error querying Bybit internal deposit API',
    };
  }
}

export interface BybitApiKeyInfoResult {
  valid: boolean;
  userId?: string;
  isUidMatched?: boolean;
  isReadOnly?: boolean;
  permissions?: Record<string, string[]>;
  error?: string;
}

/**
 * Confirms the receiving account's identity and permissions independently via Bybit V5:
 * GET /v5/user/query-api
 * Doc: https://bybit-exchange.github.io/docs/v5/user/apikey-info
 *
 * Verifies that the authenticated API key's owner (userID) matches the configured
 * recipient BYBIT_UID, and confirms that the key has read-only status without exposing credentials.
 * Utilizes a 60-second in-memory cache to eliminate redundant requests across concurrent checkouts.
 */
export async function verifyBybitApiKeyIdentity(
  config: BybitConfig = getBybitConfig(),
  bypassCache: boolean = false
): Promise<BybitApiKeyInfoResult> {
  const { apiKey, apiSecret, uid } = config;
  if (!apiKey || !apiSecret) {
    return {
      valid: false,
      error: 'Bybit API credentials not configured in environment',
    };
  }

  const configKey = `${apiKey}:${uid}`;
  const now = Date.now();
  if (!bypassCache && cachedApiKeyIdentity && cachedApiKeyIdentity.configKey === configKey) {
    if (now - cachedApiKeyIdentity.cachedAt < API_KEY_IDENTITY_CACHE_TTL_MS) {
      return cachedApiKeyIdentity.result;
    }
  }

  const timestamp = now.toString();
  const recvWindow = '5000';
  const queryString = '';

  const signature = generateBybitV5Signature(
    timestamp,
    apiKey,
    recvWindow,
    queryString,
    apiSecret
  );

  const url = 'https://api.bybit.com/v5/user/query-api';

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

    const isHttpRateLimited = response.status === 429;
    const data = await response.json();

    const isBybitRateLimited =
      isHttpRateLimited ||
      data.retCode === 10006 ||
      String(data.retMsg || '').toLowerCase().includes('too many');

    if (isBybitRateLimited && cachedApiKeyIdentity && cachedApiKeyIdentity.configKey === configKey) {
      return cachedApiKeyIdentity.result;
    }

    if (data.retCode === 0 && data.result) {
      const returnedUserId = data.result.userID ? data.result.userID.toString() : '';
      const configuredUid = (uid || '').trim();
      const isUidMatched = Boolean(
        configuredUid && returnedUserId && configuredUid === returnedUserId
      );

      const result: BybitApiKeyInfoResult = {
        valid: true,
        userId: returnedUserId,
        isUidMatched,
        isReadOnly: data.result.readOnly === 1,
        permissions: data.result.permissions || {},
      };

      cachedApiKeyIdentity = {
        cachedAt: now,
        configKey,
        result,
      };

      return result;
    }

    return {
      valid: false,
      error: data.retMsg || `Bybit API returned code ${data.retCode}`,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: err.message || 'Network error querying Bybit API key information',
    };
  }
}

/**
 * Matches Bybit internal deposit records against an order's required parameters:
 * 1. Coin must be USDT.
 * 2. Exact expected amount using integer micro-unit comparison.
 * 3. Deposit time must be within the order's validity window.
 * 4. Status must be 2 (Successful) for confirmed status. (1 is processing/detected, 3 is failed).
 * 5. Receiving account confirmed independently (fromMemberId is strictly the sender UID).
 * 6. Sender UID (fromMemberId) validated against order.sender_uid when customer submits their sender UID.
 * 7. Transaction ID (txID) must be unique and unconsumed (replay protection).
 * 8. Ambiguity protection: When no sender UID is supplied, only approve if uniquely attributed
 *    to exactly one eligible invoice and one matching deposit. Otherwise retain pending status for manual review.
 */
export function matchInternalDepositToOrder(
  order: {
    payment_amount_usdt: number | string;
    destination_address: string; // configured receiving Bybit UID
    created_at: string;
    expires_at: string;
    sender_uid?: string | null;
  },
  deposits: BybitInternalDepositRecord[],
  consumedDepositIds: Set<string> = new Set(),
  expectedTxId?: string | null,
  eligibleInvoicesCount: number = 1
): InternalDepositMatchResult {
  const orderCreatedMs = new Date(order.created_at).getTime();
  const orderExpiresMs = new Date(order.expires_at).getTime();
  const targetUid = (order.destination_address || '').trim();

  let possibleMismatchDeposit: BybitInternalDepositRecord | undefined;
  const matchingSuccessfulDeposits: BybitInternalDepositRecord[] = [];
  const matchingProcessingDeposits: BybitInternalDepositRecord[] = [];

  for (const dep of deposits) {
    const depId = dep.txID || dep.id || '';
    if (!depId || consumedDepositIds.has(depId)) {
      continue;
    }

    // 1. Verify Coin is USDT
    if ((dep.coin || '').toUpperCase() !== 'USDT') {
      continue;
    }

    // 2. If expectedTxId is specified (Option B: customer submitted txID), verify exact match
    if (expectedTxId && expectedTxId.trim().length > 0) {
      if (dep.txID.trim().toLowerCase() !== expectedTxId.trim().toLowerCase()) {
        continue;
      }
    }

    // 3. Verify destination Bybit UID if present in the record
    if (targetUid && dep.toMemberId && dep.toMemberId.trim() !== targetUid) {
      continue;
    }
    if (targetUid && dep.address && dep.address.trim() !== targetUid && !dep.toMemberId) {
      continue;
    }

    // 4. Verify sender UID if customer provided it (fromMemberId is strictly sender UID)
    if (order.sender_uid && order.sender_uid.trim().length > 0) {
      if (!dep.fromMemberId || dep.fromMemberId.trim() !== order.sender_uid.trim()) {
        continue;
      }
    }

    // 5. Verify deposit timestamp
    const depTime = parseInt(dep.createdTime || '0', 10);
    // Filter out deposits before order creation (allow 60s clock skew)
    if (depTime > 0 && depTime < orderCreatedMs - 60000) {
      continue;
    }

    // 6. Check for exact amount match
    if (exactAmountsMatch(order.payment_amount_usdt, dep.amount)) {
      // Check if received after the order window expired (allow 30s grace)
      if (depTime > 0 && depTime > orderExpiresMs + 30000) {
        return {
          matched: true,
          status: 'late_payment',
          deposit: dep,
          reason: 'Internal USDT transfer received after the order window expired.',
        };
      }

      // Check Bybit internal transfer status:
      // 1: Processing, 2: Successful, 3: Failed
      if (dep.status === 2) {
        matchingSuccessfulDeposits.push(dep);
      } else if (dep.status === 1) {
        matchingProcessingDeposits.push(dep);
      }
      // Status 3 is failed - safely ignore
    } else {
      // Track potential amount mismatch within order window
      if (depTime >= orderCreatedMs - 60000 && (!depTime || depTime <= orderExpiresMs + 60000)) {
        possibleMismatchDeposit = dep;
      }
    }
  }

  // Evaluate candidate matches
  if (matchingSuccessfulDeposits.length > 0) {
    // If multiple matching deposits were found -> retain pending status for manual review
    if (matchingSuccessfulDeposits.length > 1) {
      return {
        matched: false,
        status: 'ambiguous',
        ambiguous: true,
        deposit: matchingSuccessfulDeposits[0],
        reason: 'Multiple matching Bybit transfers detected for this invoice. Retaining pending status for manual review.',
      };
    }

    const singleCandidate = matchingSuccessfulDeposits[0];

    // Explicit attribution check:
    // 1. Customer-submitted Bybit internal txID matching the record (or admin-assigned txID)
    const hasMatchingTxId = Boolean(
      expectedTxId &&
      expectedTxId.trim().length > 0 &&
      singleCandidate.txID.trim().toLowerCase() === expectedTxId.trim().toLowerCase()
    );

    // If an explicitly verified txID was submitted: uniquely attributed to this invoice!
    if (hasMatchingTxId) {
      return {
        matched: true,
        status: 'confirmed',
        deposit: singleCandidate,
      };
    }

    // Ambiguity Guard 2: Multiple eligible invoices in system for this exact amount & window
    // When two or more pending invoices share the same customer, sender UID, amount, and window,
    // the Bybit record cannot determine which invoice the customer intended to pay.
    // Retain pending status for administrator review to select the intended invoice.
    // Do NOT choose the first invoice arbitrarily or automatically activate either subscription!
    if (eligibleInvoicesCount > 1) {
      return {
        matched: false,
        status: 'ambiguous',
        ambiguous: true,
        deposit: singleCandidate,
        reason: 'Multiple pending invoices match this sender UID and amount within the validity window. Retaining pending status for administrator review to assign to the intended invoice.',
      };
    }

    // 2. Customer-provided sender UID matching fromMemberId with exactly 1 eligible invoice
    const hasMatchingSenderUid = Boolean(
      order.sender_uid &&
      order.sender_uid.trim().length > 0 &&
      singleCandidate.fromMemberId &&
      singleCandidate.fromMemberId.trim() === order.sender_uid.trim()
    );

    // Single unambiguous invoice with matching sender UID: confirmed!
    if (hasMatchingSenderUid) {
      return {
        matched: true,
        status: 'confirmed',
        deposit: singleCandidate,
      };
    }

    // REQUIREMENT 1: Remove anonymous automatic approval!
    // When neither sender UID nor verified txID is supplied:
    // NEVER treat amount, time, and a single pending invoice as sufficient proof of payment.
    // Retain pending status for manual review.
    return {
      matched: false,
      status: 'pending',
      ambiguous: true,
      deposit: singleCandidate,
      reason: 'Payment detected, but automatic approval strictly requires your Bybit sender UID or verified transaction ID (txID). Retaining pending status for manual review.',
    };
  }

  if (matchingProcessingDeposits.length > 0) {
    return {
      matched: true,
      status: 'detected',
      deposit: matchingProcessingDeposits[0],
      reason: 'Internal USDT transfer detected on Bybit; processing confirmation.',
    };
  }

  if (possibleMismatchDeposit) {
    return {
      matched: false,
      status: 'amount_mismatch',
      deposit: possibleMismatchDeposit,
      reason: `Internal Bybit transfer of ${possibleMismatchDeposit.amount} USDT does not match required ${formatPaymentAmount(order.payment_amount_usdt)} USDT.`,
    };
  }

  return {
    matched: false,
    status: 'pending',
  };
}
