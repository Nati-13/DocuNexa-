/**
 * DOCUNEXA — APTOS MAINNET USDT (TETHER) PAYMENT INTEGRATION
 *
 * Tether USDt on Aptos:
 * - Fungible Asset Metadata ID: 0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b
 * - Decimals: 6 (1 USDT = 1,000,000 micro-units)
 * - Mainnet GraphQL Indexer: https://api.mainnet.aptoslabs.com/v1/graphql
 * - Mainnet Fullnode REST API: https://api.mainnet.aptoslabs.com/v1
 */

import { parseExactUsdt, normalizeAmount } from './bybit';

export const OFFICIAL_APTOS_USDT_METADATA =
  '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b';

export const DEFAULT_APTOS_RECEIVING_ADDRESS =
  '0xca9ea3f1167d11817d9ab02493c9a49a83d416bc3374f0872a7cc1ac79670bbd';

export interface AptosConfig {
  receivingAddress: string;
  metadataId: string;
  indexerUrl: string;
  nodeUrl: string;
}

export interface AptosFungibleActivity {
  transaction_version: number | string;
  transaction_timestamp: string; // ISO or unix timestamp string
  amount: number | string; // Micro-units (e.g. 2004821)
  asset_type: string;
  type: string; // e.g. "0x1::fungible_asset::Deposit"
  owner_address: string;
  is_transaction_success: boolean;
  txHash?: string | null;
}

export interface AptosDepositMatchResult {
  matched: boolean;
  status: 'pending' | 'detected' | 'confirmed' | 'amount_mismatch' | 'late_payment';
  activity?: AptosFungibleActivity;
  txHash?: string;
  depositId?: string;
  reason?: string;
}

/**
 * Returns the current server-side Aptos payment configuration.
 * Configured via APTOS_USDT_ADDRESS in environment variables.
 */
export function getAptosConfig(): AptosConfig {
  const receivingAddress =
    process.env.APTOS_USDT_ADDRESS || DEFAULT_APTOS_RECEIVING_ADDRESS;

  return {
    receivingAddress: normalizeAptosAddress(receivingAddress),
    metadataId: OFFICIAL_APTOS_USDT_METADATA.toLowerCase(),
    indexerUrl:
      process.env.APTOS_INDEXER_GRAPHQL_URL ||
      'https://api.mainnet.aptoslabs.com/v1/graphql',
    nodeUrl: process.env.APTOS_NODE_URL || 'https://api.mainnet.aptoslabs.com/v1',
  };
}

/**
 * Validates whether a string matches standard Aptos 32-byte hex address format.
 * (0x followed by up to 64 hex characters, commonly padded to 64).
 */
export function isValidAptosAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  const clean = address.trim();
  return /^0x[0-9a-fA-F]{1,64}$/.test(clean);
}

/**
 * Canonicalizes an Aptos address by lowercasing and zero-padding the hex to 64 digits.
 * e.g. "0xca9e..." -> 66 characters total (0x + 64 hex chars).
 */
export function normalizeAptosAddress(address: string): string {
  if (!address || typeof address !== 'string') return '';
  const clean = address.trim().toLowerCase();
  if (!clean.startsWith('0x')) return clean;
  const hex = clean.slice(2);
  const padded = hex.padStart(64, '0');
  return `0x${padded}`;
}

/**
 * Queries the official Aptos Indexer GraphQL API for successful Fungible Asset deposits
 * matching the configured receiving address and Tether USDt metadata ID.
 */
export async function fetchAptosUsdtDeposits(params?: {
  receivingAddress?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  activities: AptosFungibleActivity[];
  error?: string;
}> {
  const config = getAptosConfig();
  const targetAddress = normalizeAptosAddress(
    params?.receivingAddress || config.receivingAddress
  );

  const query = `
    query GetAptosUsdtDeposits($owner: String!, $assetType: String!, $limit: Int!) {
      fungible_asset_activities(
        where: {
          owner_address: { _eq: $owner },
          asset_type: { _eq: $assetType },
          type: { _eq: "0x1::fungible_asset::Deposit" },
          is_transaction_success: { _eq: true }
        },
        order_by: { transaction_version: desc },
        limit: $limit
      ) {
        transaction_version
        transaction_timestamp
        amount
        asset_type
        type
        owner_address
        is_transaction_success
      }
    }
  `;

  try {
    const res = await fetch(config.indexerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          owner: targetAddress,
          assetType: config.metadataId,
          limit: params?.limit || 50,
        },
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      return {
        success: false,
        activities: [],
        error: `Aptos Indexer returned HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    if (data.errors && data.errors.length > 0) {
      return {
        success: false,
        activities: [],
        error: data.errors[0]?.message || 'GraphQL error from Aptos Indexer',
      };
    }

    const activities: AptosFungibleActivity[] =
      data.data?.fungible_asset_activities || [];

    return {
      success: true,
      activities,
    };
  } catch (err: any) {
    return {
      success: false,
      activities: [],
      error: err.message || 'Network error querying Aptos Indexer',
    };
  }
}

/**
 * Fetches transaction hash for an Aptos transaction version from the mainnet REST node.
 */
export async function fetchAptosTxHashByVersion(
  version: number | string
): Promise<string | null> {
  const config = getAptosConfig();
  try {
    const res = await fetch(`${config.nodeUrl}/transactions/by_version/${version}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const tx = await res.json();
    return tx?.hash || null;
  } catch {
    return null;
  }
}

/**
 * Matches Aptos USDt deposits against an order:
 * 1. Asset must match official Tether USDt fungible asset metadata ID.
 * 2. Destination address must match order destination address.
 * 3. Amount must exactly match order.payment_amount_usdt using exact 6-decimal micro-units.
 * 4. Deposit time must be within the order's 20-minute window (with clock-skew & grace).
 * 5. Replay protection: deposit ID / transaction version must not have been consumed by another order.
 */
export async function matchAptosDepositToOrder(
  order: {
    payment_amount_usdt: number | string;
    destination_address: string;
    created_at: string;
    expires_at: string;
  },
  activities: AptosFungibleActivity[],
  consumedDepositIds: Set<string> = new Set()
): Promise<AptosDepositMatchResult> {
  const targetAddress = normalizeAptosAddress(order.destination_address);
  const config = getAptosConfig();
  const orderCreatedMs = new Date(order.created_at).getTime();
  const orderExpiresMs = new Date(order.expires_at).getTime();

  const expectedParsed = parseExactUsdt(order.payment_amount_usdt);
  if (!expectedParsed.valid) {
    return {
      matched: false,
      status: 'pending',
      reason: 'Invalid order amount for verification.',
    };
  }
  const expectedMicro = expectedParsed.microUnits;

  let possibleMismatchActivity: AptosFungibleActivity | undefined;

  for (const act of activities) {
    const versionStr = String(act.transaction_version);
    const depositId = `aptos:${versionStr}`;

    // 1. Replay / Double-spend prevention
    if (consumedDepositIds.has(depositId) || consumedDepositIds.has(versionStr)) {
      continue;
    }

    // 2. Verify Asset Type matches official Tether USDt
    const actAsset = (act.asset_type || '').toLowerCase();
    if (actAsset !== config.metadataId) {
      continue;
    }

    // 3. Verify Destination Address matches order
    const actOwner = normalizeAptosAddress(act.owner_address);
    if (actOwner !== targetAddress) {
      continue;
    }

    // 4. Verify transaction success
    if (!act.is_transaction_success) {
      continue;
    }

    // Parse deposit timestamp
    const depTimeMs = new Date(act.transaction_timestamp).getTime();

    // Ignore deposits that occurred prior to order creation (allow 60s clock skew)
    if (depTimeMs > 0 && depTimeMs < orderCreatedMs - 60000) {
      continue;
    }

    // 5. Amount check using exact integer micro-units
    const receivedMicro = BigInt(act.amount);

    if (receivedMicro === expectedMicro) {
      // Fetch transaction hash from fullnode REST API
      const txHash =
        (await fetchAptosTxHashByVersion(act.transaction_version)) ||
        `0xaptos_version_${versionStr}`;

      // Check if deposited after the 20-minute expiration window (allow 30s grace)
      if (depTimeMs > 0 && depTimeMs > orderExpiresMs + 30000) {
        return {
          matched: true,
          status: 'late_payment',
          activity: act,
          txHash,
          depositId,
          reason: 'Deposit received after the 20-minute order window expired.',
        };
      }

      // Confirmed on-chain payment
      return {
        matched: true,
        status: 'confirmed',
        activity: act,
        txHash,
        depositId,
      };
    } else {
      // Record candidate mismatch within window for diagnostic
      if (depTimeMs >= orderCreatedMs - 60000 && (!depTimeMs || depTimeMs <= orderExpiresMs + 60000)) {
        possibleMismatchActivity = act;
      }
    }
  }

  if (possibleMismatchActivity) {
    const receivedFormatted = (Number(possibleMismatchActivity.amount) / 1000000).toFixed(6);
    return {
      matched: false,
      status: 'amount_mismatch',
      activity: possibleMismatchActivity,
      depositId: `aptos:${possibleMismatchActivity.transaction_version}`,
      reason: `Deposit of ${receivedFormatted} USDT does not match required ${normalizeAmount(order.payment_amount_usdt)} USDT.`,
    };
  }

  return {
    matched: false,
    status: 'pending',
  };
}
