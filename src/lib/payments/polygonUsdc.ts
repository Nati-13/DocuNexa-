/**
 * DOCUNEXA — POLYGON POS NATIVE USDC PAYMENT INTEGRATION
 *
 * Official Native Circle USD Coin (USDC) on Polygon PoS:
 * - Chain ID: 137 (Polygon PoS Mainnet)
 * - Official Native Contract: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
 * - Legacy Bridged USDC.e (STRICTLY INCOMPATIBLE): 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
 * - Decimals: 6 (1 USDC = 1,000,000 units)
 * - Verification: Standard Polygon JSON-RPC eth_getLogs / Transfer event indexer
 */

import { normalizeAmount, formatPaymentAmount } from './bybit';

export const OFFICIAL_POLYGON_USDC_NATIVE =
  '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';

export const LEGACY_BRIDGED_USDC_E =
  '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

export const ERC20_TRANSFER_EVENT_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export interface PolygonUsdcConfig {
  receivingAddress: string;
  contractAddress: string;
  rpcUrls: string[];
  chainId: number;
  isEnabled: boolean;
}

export interface PolygonUsdcTransfer {
  txHash: string;
  blockNumber: number;
  blockTimestampMs?: number;
  from: string;
  to: string;
  value: string; // Micro-units (e.g. "2000412" for 2.000412 USDC)
  contractAddress: string;
  confirmations?: number;
}

export interface PolygonUsdcMatchResult {
  matched: boolean;
  status: 'pending' | 'detected' | 'confirmed' | 'amount_mismatch' | 'late_payment';
  transfer?: PolygonUsdcTransfer;
  txHash?: string;
  depositId?: string;
  reason?: string;
}

const stripEnv = (val: string | undefined): string =>
  (val || '').replace(/^["']|["']$/g, '').trim();

/**
 * Validates an EVM hex address (0x followed by 40 hex characters).
 */
export function isValidEvmAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  const clean = stripEnv(address);
  return /^0x[0-9a-fA-F]{40}$/.test(clean);
}

/**
 * Returns current server-side Polygon Native USDC payment configuration.
 */
export function getPolygonUsdcConfig(): PolygonUsdcConfig {
  const receivingAddress = stripEnv(process.env.USDC_POLYGON_ADDRESS);
  const enabledStr = stripEnv(process.env.USDC_POLYGON_ENABLED).toLowerCase();
  const globalEnabled = stripEnv(process.env.CRYPTO_PAYMENTS_ENABLED).toLowerCase() === 'true';

  const isConfigured = Boolean(
    globalEnabled &&
    enabledStr === 'true' &&
    receivingAddress &&
    isValidEvmAddress(receivingAddress)
  );

  const primaryRpc = stripEnv(process.env.POLYGON_RPC_URL);
  const rpcUrls = [
    primaryRpc,
    'https://polygon-rpc.com',
    'https://rpc.ankr.com/polygon',
    'https://polygon.llamarpc.com',
    'https://1rpc.io/matic',
  ].filter(Boolean) as string[];

  return {
    receivingAddress: receivingAddress.toLowerCase(),
    contractAddress: OFFICIAL_POLYGON_USDC_NATIVE.toLowerCase(),
    rpcUrls,
    chainId: 137,
    isEnabled: isConfigured,
  };
}

/**
 * Pads an EVM 20-byte address into a 32-byte hex topic.
 */
export function addressToTopic(address: string): string {
  const clean = address.toLowerCase().replace(/^0x/, '');
  return '0x' + clean.padStart(64, '0');
}

/**
 * Extracts 20-byte address from a 32-byte hex topic.
 */
export function topicToAddress(topic: string): string {
  const clean = topic.toLowerCase().replace(/^0x/, '');
  return '0x' + clean.slice(-40);
}

/**
 * Dispatches a JSON-RPC call across available Polygon RPC endpoints with fallback.
 */
export async function polygonRpcCall(
  method: string,
  params: any[],
  rpcUrls: string[]
): Promise<any> {
  let lastError: Error | null = null;

  for (const url of rpcUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params,
        }),
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`RPC HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      if (json.error) {
        throw new Error(json.error.message || 'RPC method error');
      }

      return json.result;
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error('All Polygon RPC endpoints failed.');
}

/**
 * Fetches recent Native USDC Transfer events received by the configured destination address.
 */
export async function fetchPolygonUsdcTransfers(params?: {
  receivingAddress?: string;
  fromBlockOffset?: number;
}): Promise<{
  success: boolean;
  transfers: PolygonUsdcTransfer[];
  currentBlock?: number;
  error?: string;
}> {
  const config = getPolygonUsdcConfig();
  const targetAddress = (params?.receivingAddress || config.receivingAddress).toLowerCase();

  if (!targetAddress || !isValidEvmAddress(targetAddress)) {
    return {
      success: false,
      transfers: [],
      error: 'Polygon USDC receiving address is not configured or invalid.',
    };
  }

  try {
    // 1. Get latest block number
    const blockHex = await polygonRpcCall('eth_blockNumber', [], config.rpcUrls);
    const currentBlock = parseInt(blockHex, 16);

    // Look back approx 1000 blocks (~35-40 minutes on Polygon)
    const blockOffset = params?.fromBlockOffset || 1000;
    const fromBlockNum = Math.max(0, currentBlock - blockOffset);
    const fromBlockHex = '0x' + fromBlockNum.toString(16);

    // 2. Query eth_getLogs for Native USDC Transfers to target address
    // Strictly filter on official Native Circle USDC contract (0x3c49...)
    const logs = await polygonRpcCall(
      'eth_getLogs',
      [
        {
          fromBlock: fromBlockHex,
          toBlock: 'latest',
          address: config.contractAddress, // Strictly 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
          topics: [
            ERC20_TRANSFER_EVENT_TOPIC,
            null, // from: any
            addressToTopic(targetAddress), // to: receiving address
          ],
        },
      ],
      config.rpcUrls
    );

    const rows = Array.isArray(logs) ? logs : [];
    const transfers: PolygonUsdcTransfer[] = [];

    for (const log of rows) {
      const logAddress = (log.address || '').toLowerCase();
      // SECURITY INVARIANT: Reject if contract is NOT official native USDC
      if (logAddress !== config.contractAddress) {
        continue;
      }
      // Strictly guard against legacy bridged USDC.e
      if (logAddress === LEGACY_BRIDGED_USDC_E.toLowerCase()) {
        continue;
      }

      const txHash = log.transactionHash;
      const blockNumber = parseInt(log.blockNumber, 16);
      const toAddr = topicToAddress(log.topics?.[2] || '');
      const fromAddr = topicToAddress(log.topics?.[1] || '');

      // Parse 256-bit big-endian value in data
      let microUnits = '0';
      try {
        microUnits = BigInt(log.data).toString(10);
      } catch {
        continue;
      }

      const confirmations = Math.max(1, currentBlock - blockNumber + 1);

      transfers.push({
        txHash,
        blockNumber,
        from: fromAddr,
        to: toAddr,
        value: microUnits,
        contractAddress: logAddress,
        confirmations,
      });
    }

    return {
      success: true,
      transfers,
      currentBlock,
    };
  } catch (err: any) {
    return {
      success: false,
      transfers: [],
      error: err.message || 'Polygon RPC error',
    };
  }
}

/**
 * Matches detected Polygon Native USDC transfers to a DocuNexa payment order.
 */
export async function matchPolygonUsdcTransferToOrder(
  order: {
    order_id: string;
    payment_amount_usdt: number | string;
    destination_address: string;
    created_at: string;
    expires_at: string;
  },
  transfers: PolygonUsdcTransfer[],
  consumedSet: Set<string>
): Promise<PolygonUsdcMatchResult> {
  const targetAddress = order.destination_address.toLowerCase();

  // Target amount in 6 decimals
  const expectedAmountNormalized = normalizeAmount(order.payment_amount_usdt);
  const expectedMicros = Math.round(Number(expectedAmountNormalized) * 1000000);

  let detectedMismatch: PolygonUsdcTransfer | null = null;

  for (const transfer of transfers) {
    // 1. Replay prevention
    const depId = `polygon_usdc:${transfer.txHash.toLowerCase()}`;
    if (consumedSet.has(depId) || consumedSet.has(transfer.txHash.toLowerCase())) {
      continue;
    }

    // 2. Strict destination address check
    if (transfer.to.toLowerCase() !== targetAddress) {
      continue;
    }

    // 3. Official token contract validation
    if (transfer.contractAddress.toLowerCase() !== OFFICIAL_POLYGON_USDC_NATIVE.toLowerCase()) {
      continue;
    }

    const txMicros = parseInt(transfer.value, 10);
    const amountMatches = Math.abs(txMicros - expectedMicros) <= 1; // 1 unit tolerance

    // 4. Exact amount match
    if (amountMatches) {
      return {
        matched: true,
        status: 'confirmed',
        transfer,
        txHash: transfer.txHash,
        depositId: depId,
      };
    } else {
      if (!detectedMismatch) detectedMismatch = transfer;
    }
  }

  if (detectedMismatch) {
    const actualUsdc = (parseInt(detectedMismatch.value, 10) / 1000000).toFixed(6);
    return {
      matched: false,
      status: 'amount_mismatch',
      transfer: detectedMismatch,
      txHash: detectedMismatch.txHash,
      depositId: `polygon_usdc:${detectedMismatch.txHash.toLowerCase()}`,
      reason: `Detected Polygon USDC transfer of ${actualUsdc} USDC, expected ${formatPaymentAmount(order.payment_amount_usdt)} USDC.`,
    };
  }

  return {
    matched: false,
    status: 'pending',
  };
}
