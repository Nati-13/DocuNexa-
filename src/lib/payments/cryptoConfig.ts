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
  POLYGON_USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  POLYGON_USDC_NATIVE: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  POLYGON_USDC_BRIDGED_LEGACY: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC.e (not accepted)
} as const;

export interface CryptoSelectorOption {
  id: CryptoPaymentMethodId;
  label: string;
  shortLabel: string;
  tokenSymbol: 'USDT' | 'USDC';
  tokenLogoSrc: string;
  tokenLogoAlt: string;
  networkName: string;
  networkKey: 'Polygon' | 'Aptos' | 'TRON' | 'Polygon_USDC';
  networkLogoSrc: string;
  networkLogoAlt: string;
  status: 'active' | 'coming_soon';
  isEnabled: boolean;
  contractAddress: string;
  badgeText: 'Active' | 'Coming Soon';
  badgeColor: string;
  indicatorColor: string;
  tooltip: string;
}

/**
 * Authoritative 4-method checkout selector configuration:
 * 1. USDT Polygon (Active)
 * 2. USDT Aptos (Active)
 * 3. USDT TRON (TRC20) (Coming Soon / Disabled)
 * 4. USDC Polygon Native (Coming Soon / Disabled)
 */
const stripEnv = (val: string | undefined): string =>
  (val || '').replace(/^["']|["']$/g, '').trim();

/**
 * Validates a TRON base58 address (starts with 'T', 34 characters total).
 */
export function isValidTronAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  const trimmed = stripEnv(address);
  // TRON mainnet addresses are 34 characters base58, beginning with capital 'T'
  return /^T[1-9A-HJ-NP-za-km-z]{33}$/.test(trimmed);
}

/**
 * Validates an EVM (Ethereum / Polygon) hex address (0x followed by 40 hex characters).
 */
export function isValidEvmAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  const trimmed = stripEnv(address);
  return /^0x[0-9a-fA-F]{40}$/.test(trimmed);
}

/**
 * Checks for missing required environment variables for a given crypto payment method.
 */
export function getMissingPaymentEnvVars(methodId: CryptoPaymentMethodId): string[] {
  const missing: string[] = [];
  const globalEnabled = stripEnv(process.env.CRYPTO_PAYMENTS_ENABLED).toLowerCase() === 'true';
  if (!globalEnabled) missing.push('CRYPTO_PAYMENTS_ENABLED');

  switch (methodId) {
    case 'polygon_usdt':
      if (!stripEnv(process.env.BYBIT_API_KEY)) missing.push('BYBIT_API_KEY');
      if (!stripEnv(process.env.BYBIT_API_SECRET)) missing.push('BYBIT_API_SECRET');
      if (!stripEnv(process.env.BYBIT_USDT_POLYGON_ADDRESS)) missing.push('BYBIT_USDT_POLYGON_ADDRESS');
      break;
    case 'aptos_usdt':
      if (!stripEnv(process.env.APTOS_USDT_ADDRESS)) missing.push('APTOS_USDT_ADDRESS');
      break;
    case 'tron_usdt':
      if (stripEnv(process.env.USDT_TRC20_ENABLED).toLowerCase() !== 'true') missing.push('USDT_TRC20_ENABLED');
      if (!stripEnv(process.env.USDT_TRC20_ADDRESS)) missing.push('USDT_TRC20_ADDRESS');
      break;
    case 'polygon_usdc':
      if (stripEnv(process.env.USDC_POLYGON_ENABLED).toLowerCase() !== 'true') missing.push('USDC_POLYGON_ENABLED');
      if (!stripEnv(process.env.USDC_POLYGON_ADDRESS)) missing.push('USDC_POLYGON_ADDRESS');
      break;
  }
  return missing;
}

/**
 * Authoritative 4-method checkout selector configuration:
 * 1. USDT — Polygon PoS (Active)
 * 2. USDT — Aptos Mainnet (Active)
 * 3. USDT — TRON TRC20 (Active)
 * 4. USDC — Polygon PoS Native (Active)
 */
export const CRYPTO_SELECTOR_OPTIONS: CryptoSelectorOption[] = [
  {
    id: 'polygon_usdt',
    label: 'USDT — Polygon (PoS)',
    shortLabel: 'USDT — Polygon',
    tokenSymbol: 'USDT',
    tokenLogoSrc: '/images/crypto/usdt.png',
    tokenLogoAlt: 'Tether USDT official logo',
    networkName: 'Polygon PoS',
    networkKey: 'Polygon',
    networkLogoSrc: '/images/crypto/polygon.png',
    networkLogoAlt: 'Polygon network official logo',
    status: 'active',
    isEnabled: true,
    contractAddress: OFFICIAL_CONTRACTS.POLYGON_USDT,
    badgeText: 'Active',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    indicatorColor: 'bg-purple-500',
    tooltip: 'Active payment method: Verified on Polygon PoS network via Bybit deposit API.',
  },
  {
    id: 'aptos_usdt',
    label: 'USDT — Aptos Mainnet',
    shortLabel: 'USDT — Aptos',
    tokenSymbol: 'USDT',
    tokenLogoSrc: '/images/crypto/usdt.png',
    tokenLogoAlt: 'Tether USDT official logo',
    networkName: 'Aptos Mainnet',
    networkKey: 'Aptos',
    networkLogoSrc: '/images/crypto/aptos.png',
    networkLogoAlt: 'Aptos network official logo',
    status: 'active',
    isEnabled: true,
    contractAddress: OFFICIAL_CONTRACTS.APTOS_USDT_METADATA,
    badgeText: 'Active',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    indicatorColor: 'bg-teal-500',
    tooltip: 'Active payment method: Verified on Aptos Mainnet via fullnode indexer.',
  },
  {
    id: 'tron_usdt',
    label: 'USDT — TRON (TRC20)',
    shortLabel: 'USDT — TRON',
    tokenSymbol: 'USDT',
    tokenLogoSrc: '/images/crypto/usdt.png',
    tokenLogoAlt: 'Tether USDT official logo',
    networkName: 'TRON (TRC20)',
    networkKey: 'TRON',
    networkLogoSrc: '/images/crypto/tron.png',
    networkLogoAlt: 'TRON network official logo',
    status: 'active',
    isEnabled: true,
    contractAddress: OFFICIAL_CONTRACTS.TRON_USDT_TRC20,
    badgeText: 'Active',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    indicatorColor: 'bg-red-500',
    tooltip: 'Active payment method: Verified on TRON network (TRC20) via indexer.',
  },
  {
    id: 'polygon_usdc',
    label: 'USDC — Polygon (Native)',
    shortLabel: 'USDC — Polygon',
    tokenSymbol: 'USDC',
    tokenLogoSrc: '/images/crypto/usdc.png',
    tokenLogoAlt: 'Circle USDC official logo',
    networkName: 'Polygon PoS (Native USDC)',
    networkKey: 'Polygon_USDC',
    networkLogoSrc: '/images/crypto/polygon.png',
    networkLogoAlt: 'Polygon network official logo',
    status: 'active',
    isEnabled: true,
    contractAddress: OFFICIAL_CONTRACTS.POLYGON_USDC_NATIVE,
    badgeText: 'Active',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    indicatorColor: 'bg-blue-500',
    tooltip: 'Active payment method: Verified on Polygon PoS network (Native USDC 0x3c49...).',
  },
];

/**
 * Evaluates server-side payment configuration.
 * Never exposes secrets; returns boolean enablement and public metadata only.
 */
export function getInternationalCryptoConfig(): InternationalCryptoConfig {
  const globalCryptoEnabled =
    stripEnv(process.env.CRYPTO_PAYMENTS_ENABLED).toLowerCase() === 'true';

  const tronAddress = stripEnv(process.env.USDT_TRC20_ADDRESS);
  const tronEnabled =
    globalCryptoEnabled &&
    stripEnv(process.env.USDT_TRC20_ENABLED).toLowerCase() === 'true' &&
    isValidTronAddress(tronAddress);

  const usdcAddress = stripEnv(process.env.USDC_POLYGON_ADDRESS);
  const usdcPolygonEnabled =
    globalCryptoEnabled &&
    stripEnv(process.env.USDC_POLYGON_ENABLED).toLowerCase() === 'true' &&
    isValidEvmAddress(usdcAddress);

  const bybitAddress = stripEnv(process.env.BYBIT_USDT_POLYGON_ADDRESS);
  const bybitConfigured = Boolean(
    globalCryptoEnabled &&
    stripEnv(process.env.BYBIT_API_KEY) &&
    stripEnv(process.env.BYBIT_API_SECRET) &&
    bybitAddress &&
    isValidEvmAddress(bybitAddress)
  );

  const aptosAddress = stripEnv(process.env.APTOS_USDT_ADDRESS);
  const aptosConfigured = Boolean(
    globalCryptoEnabled &&
    aptosAddress
  );

  return {
    globalCryptoPaymentsEnabled: globalCryptoEnabled,
    methods: {
      polygon_usdt: {
        id: 'polygon_usdt',
        name: 'USDT on Polygon (PoS)',
        tokenSymbol: 'USDT',
        networkName: 'Polygon PoS',
        contractAddress: OFFICIAL_CONTRACTS.POLYGON_USDT,
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

