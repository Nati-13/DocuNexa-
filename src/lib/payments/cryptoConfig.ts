/**
 * DOCUNEXA — INTERNATIONAL CRYPTO PAYMENT CONFIGURATION & VALIDATION
 *
 * This module defines the specifications, network requirements, and security guards
 * for active and planned international cryptocurrency payment methods.
 *
 * ACTIVE METHODS:
 *  - Polygon (PoS) USDT (via Bybit deposit tracking)
 *  - Aptos Mainnet USDT (via Aptos Fungible Asset indexer/fullnode)
 *
 * PLANNED METHODS (DISABLED BY DEFAULT):
 *  - TRON TRC20 USDT: Official Tether Contract TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
 *  - Polygon PoS Native USDC: Official Circle Contract 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
 *    (Contrasted with legacy bridged USDC.e 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174)
 *
 * SECURITY INVARIANTS:
 *  1. Planned methods remain strictly disabled until explicit legal authorization,
 *     merchant registration, and on-chain verification infrastructure are fully deployed.
 *  2. No fake or placeholder wallet addresses are invented.
 *  3. Private keys, seed phrases, or master wallet secrets are NEVER loaded into the environment.
 *  4. Screenshot-based user claims are strictly rejected; payment requires server-to-server confirmation.
 */

export type CryptoPaymentMethodId =
  | 'polygon_usdt'
  | 'aptos_usdt'
  | 'tron_usdt'
  | 'polygon_usdc';

export interface CryptoPaymentMethodInfo {
  id: CryptoPaymentMethodId;
  name: string;
  tokenSymbol: 'USDT' | 'USDC';
  networkName: string;
  contractAddress: string | null;
  decimals: number;
  status: 'active' | 'planned' | 'disabled';
  isEnabled: boolean;
  receivingAddressConfigured: boolean;
  notes: string;
}

export interface InternationalCryptoConfig {
  globalCryptoPaymentsEnabled: boolean;
  methods: Record<CryptoPaymentMethodId, CryptoPaymentMethodInfo>;
}

/** Official contract identifiers for validation */
export const OFFICIAL_CONTRACTS = {
  APTOS_USDT_METADATA:
    '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b',
  TRON_USDT_TRC20: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  POLYGON_USDC_NATIVE: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  POLYGON_USDC_BRIDGED_LEGACY: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC.e (not accepted)
} as const;

/**
 * Validates a TRON base58 address (starts with 'T', 34 characters total).
 */
export function isValidTronAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  const trimmed = address.trim();
  // TRON mainnet addresses are 34 characters base58, beginning with capital 'T'
  return /^T[1-9A-HJ-NP-za-km-z]{33}$/.test(trimmed);
}

/**
 * Validates an EVM (Ethereum / Polygon) hex address (0x followed by 40 hex characters).
 */
export function isValidEvmAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  const trimmed = address.trim();
  return /^0x[0-9a-fA-F]{40}$/.test(trimmed);
}

/**
 * Evaluates server-side payment configuration.
 * Never exposes secrets; returns boolean enablement and public metadata only.
 */
export function getInternationalCryptoConfig(): InternationalCryptoConfig {
  const globalCryptoEnabled =
    process.env.CRYPTO_PAYMENTS_ENABLED === 'true';

  const tronEnabled =
    globalCryptoEnabled &&
    process.env.USDT_TRC20_ENABLED === 'true' &&
    Boolean(process.env.USDT_TRC20_ADDRESS?.trim());

  const usdcPolygonEnabled =
    globalCryptoEnabled &&
    process.env.USDC_POLYGON_ENABLED === 'true' &&
    Boolean(process.env.USDC_POLYGON_ADDRESS?.trim());

  const bybitConfigured = Boolean(
    process.env.BYBIT_API_KEY &&
    process.env.BYBIT_API_SECRET &&
    process.env.BYBIT_USDT_POLYGON_ADDRESS
  );

  const aptosConfigured = Boolean(process.env.APTOS_USDT_ADDRESS);

  return {
    globalCryptoPaymentsEnabled: globalCryptoEnabled,
    methods: {
      polygon_usdt: {
        id: 'polygon_usdt',
        name: 'USDT on Polygon (PoS)',
        tokenSymbol: 'USDT',
        networkName: 'Polygon PoS',
        contractAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        decimals: 6,
        status: bybitConfigured ? 'active' : 'disabled',
        isEnabled: bybitConfigured,
        receivingAddressConfigured: Boolean(process.env.BYBIT_USDT_POLYGON_ADDRESS),
        notes: 'Active. Verified server-to-server via Bybit V5 deposit API with unique fractional amounts.',
      },
      aptos_usdt: {
        id: 'aptos_usdt',
        name: 'USDT on Aptos Mainnet',
        tokenSymbol: 'USDT',
        networkName: 'Aptos Mainnet',
        contractAddress: OFFICIAL_CONTRACTS.APTOS_USDT_METADATA,
        decimals: 6,
        status: aptosConfigured ? 'active' : 'disabled',
        isEnabled: aptosConfigured,
        receivingAddressConfigured: Boolean(process.env.APTOS_USDT_ADDRESS),
        notes: 'Active. Verified directly via Aptos GraphQL indexer and fullnode REST API.',
      },
      tron_usdt: {
        id: 'tron_usdt',
        name: 'USDT on TRON (TRC20)',
        tokenSymbol: 'USDT',
        networkName: 'TRON TRC20',
        contractAddress: OFFICIAL_CONTRACTS.TRON_USDT_TRC20,
        decimals: 6,
        status: tronEnabled ? 'active' : 'planned',
        isEnabled: tronEnabled,
        receivingAddressConfigured: Boolean(process.env.USDT_TRC20_ADDRESS?.trim()),
        notes: 'Planned / Disabled. Requires verified TRON node indexer and authorized treasury address before activation.',
      },
      polygon_usdc: {
        id: 'polygon_usdc',
        name: 'USDC (Native) on Polygon',
        tokenSymbol: 'USDC',
        networkName: 'Polygon PoS',
        contractAddress: OFFICIAL_CONTRACTS.POLYGON_USDC_NATIVE,
        decimals: 6,
        status: usdcPolygonEnabled ? 'active' : 'planned',
        isEnabled: usdcPolygonEnabled,
        receivingAddressConfigured: Boolean(process.env.USDC_POLYGON_ADDRESS?.trim()),
        notes: 'Planned / Disabled. Accepts ONLY native Circle-issued USDC (0x3c49...); legacy bridged USDC.e is strictly incompatible.',
      },
    },
  };
}

/**
 * Asserts that a requested payment method is genuinely active and enabled.
 * Throws a clean, descriptive error if the method is planned or disabled.
 */
export function assertPaymentMethodActive(methodId: CryptoPaymentMethodId): void {
  const config = getInternationalCryptoConfig();
  const method = config.methods[methodId];

  if (!method) {
    throw new Error(`Unsupported payment method identifier: ${methodId}`);
  }

  if (!method.isEnabled) {
    throw new Error(
      `Payment method "${method.name}" is currently ${method.status.toUpperCase()} and not active for checkout. Please select an active payment option.`
    );
  }
}

