/**
 * DOCUNEXA — TRON MAINNET USDT (TRC20) PAYMENT INTEGRATION
 *
 * Tether USDt on TRON (TRC20):
 * - Official Contract Address: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
 * - Decimals: 6 (1 USDT = 1,000,000 sun)
 * - Indexer: TRON Grid REST API (https://api.trongrid.io) / TRON Fullnode
 */

import { normalizeAmount, formatPaymentAmount } from './bybit';

export const OFFICIAL_TRON_USDT_TRC20 = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

export interface TronConfig {
  receivingAddress: string;
  contractAddress: string;
  apiUrl: string;
  apiKey?: string;
  isEnabled: boolean;
}

export interface TronTrc20Transaction {
  transaction_id: string;
  block_timestamp: number; // Unix timestamp in milliseconds
  from: string;
  to: string;
  type: string;
  value: string; // Micro-units (e.g. "2000412" for 2.000412 USDT)
  token_info?: {
    symbol: string;
    address: string;
    decimals: number;
    name: string;
  };
}

export interface TronDepositMatchResult {
  matched: boolean;
  status: 'pending' | 'detected' | 'confirmed' | 'amount_mismatch' | 'late_payment';
  transaction?: TronTrc20Transaction;
  txHash?: string;
  depositId?: string;
  reason?: string;
}

const stripEnv = (val: string | undefined): string =>
  (val || '').replace(/^["']|["']$/g, '').trim();

/**
 * Validates a TRON base58 address (starts with 'T', 34 characters total).
 */
export function isValidTronAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  const clean = stripEnv(address);
  return /^T[1-9A-HJ-NP-za-km-z]{33}$/.test(clean);
}

/**
 * Returns current server-side TRON TRC20 payment configuration.
 */
export function getTronConfig(): TronConfig {
  const receivingAddress = stripEnv(process.env.USDT_TRC20_ADDRESS);
  const enabledStr = stripEnv(process.env.USDT_TRC20_ENABLED).toLowerCase();
  const globalEnabled = stripEnv(process.env.CRYPTO_PAYMENTS_ENABLED).toLowerCase() === 'true';

  const isConfigured = Boolean(
    globalEnabled &&
    enabledStr === 'true' &&
    receivingAddress &&
    isValidTronAddress(receivingAddress)
  );

  return {
    receivingAddress,
    contractAddress: OFFICIAL_TRON_USDT_TRC20,
    apiUrl: stripEnv(process.env.TRON_NODE_URL) || 'https://api.trongrid.io',
    apiKey: stripEnv(process.env.TRON_API_KEY) || undefined,
    isEnabled: isConfigured,
  };
}

/**
 * Fetches recent TRC20 transfers received by the configured TRON address.
 */
export async function fetchTronTrc20Deposits(params?: {
  receivingAddress?: string;
  limit?: number;
  minTimestamp?: number;
}): Promise<{
  success: boolean;
  transactions: TronTrc20Transaction[];
  error?: string;
}> {
  const config = getTronConfig();
  const targetAddress = params?.receivingAddress || config.receivingAddress;

  if (!targetAddress || !isValidTronAddress(targetAddress)) {
    return {
      success: false,
      transactions: [],
      error: 'TRON receiving address is not configured or invalid.',
    };
  }

  const limit = params?.limit || 50;
  const url = new URL(
    `${config.apiUrl}/v1/accounts/${encodeURIComponent(targetAddress)}/transactions/trc20`
  );
  url.searchParams.set('contract_address', OFFICIAL_TRON_USDT_TRC20);
  url.searchParams.set('only_to', 'true');
  url.searchParams.set('limit', limit.toString());

  if (params?.minTimestamp && params.minTimestamp > 0) {
    url.searchParams.set('min_timestamp', params.minTimestamp.toString());
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (config.apiKey) {
    headers['TRON-PRO-API-KEY'] = config.apiKey;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers,
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        success: false,
        transactions: [],
        error: `TRON indexer returned HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const data = await res.json();
    const rows = Array.isArray(data?.data) ? data.data : [];

    // Filter strictly for incoming USDT TRC20 transfers to our receiving address
    const verifiedTxs: TronTrc20Transaction[] = rows
      .filter((tx: any) => {
        if (!tx || typeof tx !== 'object') return false;
        // Verify contract is official Tether
        const tokenAddr = tx?.token_info?.address || '';
        if (tokenAddr !== OFFICIAL_TRON_USDT_TRC20) return false;
        // Verify destination matches receiving address
        if (tx.to !== targetAddress) return false;
        // Verify type is Transfer
        if (tx.type && tx.type !== 'Transfer') return false;
        // Must have valid transaction ID and value
        return Boolean(tx.transaction_id && tx.value);
      })
      .map((tx: any) => ({
        transaction_id: tx.transaction_id,
        block_timestamp: Number(tx.block_timestamp) || 0,
        from: tx.from,
        to: tx.to,
        type: tx.type || 'Transfer',
        value: tx.value.toString(),
        token_info: tx.token_info,
      }));

    return {
      success: true,
      transactions: verifiedTxs,
    };
  } catch (err: any) {
    return {
      success: false,
      transactions: [],
      error: err.name === 'AbortError' ? 'TRON indexer request timed out' : err.message,
    };
  }
}

/**
 * Matches a detected TRC20 transaction to a DocuNexa payment order.
 */
export async function matchTronDepositToOrder(
  order: {
    order_id: string;
    payment_amount_usdt: number | string;
    destination_address: string;
    created_at: string;
    expires_at: string;
  },
  transactions: TronTrc20Transaction[],
  consumedSet: Set<string>
): Promise<TronDepositMatchResult> {
  const targetAddress = order.destination_address;
  const orderCreatedMs = new Date(order.created_at).getTime();
  const orderExpiresMs = new Date(order.expires_at).getTime();
  const allowedStartMs = orderCreatedMs - 60000; // 60s clock skew buffer

  // Target amount in 6 decimals (micro-units)
  // e.g. 2.000412 USDT -> 2000412
  const expectedAmountNormalized = normalizeAmount(order.payment_amount_usdt);
  const expectedMicros = Math.round(Number(expectedAmountNormalized) * 1000000);

  let detectedMismatch: TronTrc20Transaction | null = null;
  let detectedLate: TronTrc20Transaction | null = null;

  for (const tx of transactions) {
    // 1. Replay prevention: Skip already consumed transaction IDs
    const depId = `tron:${tx.transaction_id}`;
    if (consumedSet.has(depId) || consumedSet.has(tx.transaction_id)) {
      continue;
    }

    // 2. Strict destination address check
    if (tx.to !== targetAddress) {
      continue;
    }

    // 3. Official token contract validation
    if (tx.token_info?.address !== OFFICIAL_TRON_USDT_TRC20) {
      continue;
    }

    const txTimeMs = tx.block_timestamp;
    const txMicros = parseInt(tx.value, 10);
    const amountMatches = Math.abs(txMicros - expectedMicros) <= 1; // 1 sun tolerance

    // 4. Exact amount and within validity window
    if (amountMatches && txTimeMs >= allowedStartMs && txTimeMs <= orderExpiresMs + 60000) {
      return {
        matched: true,
        status: 'confirmed',
        transaction: tx,
        txHash: tx.transaction_id,
        depositId: depId,
      };
    }

    // 5. Late payment check
    if (amountMatches && txTimeMs > orderExpiresMs + 60000) {
      if (!detectedLate) detectedLate = tx;
    }

    // 6. Amount mismatch check within order window
    if (!amountMatches && txTimeMs >= allowedStartMs && txTimeMs <= orderExpiresMs + 60000) {
      const actualAmountUsdt = (txMicros / 1000000).toFixed(6);
      if (!detectedMismatch) detectedMismatch = tx;
    }
  }

  if (detectedLate) {
    return {
      matched: true,
      status: 'late_payment',
      transaction: detectedLate,
      txHash: detectedLate.transaction_id,
      depositId: `tron:${detectedLate.transaction_id}`,
      reason: 'USDT TRC20 transfer arrived after order window expired.',
    };
  }

  if (detectedMismatch) {
    const actualUsdt = (parseInt(detectedMismatch.value, 10) / 1000000).toFixed(6);
    return {
      matched: false,
      status: 'amount_mismatch',
      transaction: detectedMismatch,
      txHash: detectedMismatch.transaction_id,
      depositId: `tron:${detectedMismatch.transaction_id}`,
      reason: `Detected TRON transfer of ${actualUsdt} USDT, expected ${formatPaymentAmount(order.payment_amount_usdt)} USDT.`,
    };
  }

  return {
    matched: false,
    status: 'pending',
  };
}
