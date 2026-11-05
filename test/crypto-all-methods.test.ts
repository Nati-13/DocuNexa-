/**
 * DOCUNEXA — 4-METHOD CRYPTO PAYMENT BACKEND & VERIFICATION TEST SUITE
 *
 * Verifies all 4 active payment rails:
 * 1. USDT — Polygon PoS
 * 2. USDT — Aptos Mainnet
 * 3. USDT — TRON TRC20
 * 4. USDC — Polygon PoS Native
 */

import {
  CRYPTO_SELECTOR_OPTIONS,
  OFFICIAL_CONTRACTS,
  isValidTronAddress,
  isValidEvmAddress,
} from '../src/lib/payments/cryptoConfig';
import {
  OFFICIAL_TRON_USDT_TRC20,
  matchTronDepositToOrder,
  TronTrc20Transaction,
} from '../src/lib/payments/tron';
import {
  OFFICIAL_POLYGON_USDC_NATIVE,
  LEGACY_BRIDGED_USDC_E,
  matchPolygonUsdcTransferToOrder,
  PolygonUsdcTransfer,
} from '../src/lib/payments/polygonUsdc';
import { matchAptosDepositToOrder, AptosFungibleActivity } from '../src/lib/payments/aptos';
import { normalizeAmount, formatPaymentAmount } from '../src/lib/payments/bybit';

let passed = 0;
let total = 0;

function assert(description: string, condition: boolean, details?: string) {
  total++;
  if (condition) {
    console.log(`  ✓ [PASS] ${description}${details ? ` (${details})` : ''}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${description}${details ? ` (${details})` : ''}`);
    process.exitCode = 1;
  }
}

async function runAllCryptoTests() {
  console.log('================================================================');
  console.log(' DOCUNEXA — ALL 4 CRYPTO METHODS BACKEND & VERIFICATION TESTS   ');
  console.log('================================================================\n');

  // --- 1. SELECTOR & ASSET INTEGRITY ---
  console.log('--- 1. SELECTOR & ASSET CONFIGURATION ---');

  assert(
    'Exactly 4 methods configured in selector',
    CRYPTO_SELECTOR_OPTIONS.length === 4
  );

  const methods = ['polygon_usdt', 'aptos_usdt', 'tron_usdt', 'polygon_usdc'] as const;
  for (const mId of methods) {
    const opt = CRYPTO_SELECTOR_OPTIONS.find((o) => o.id === mId);
    assert(`Method ${mId} exists and is active`, opt?.status === 'active' && opt?.isEnabled === true);
    assert(`Method ${mId} has valid token logo`, Boolean(opt?.tokenLogoSrc && opt?.tokenLogoAlt));
    assert(`Method ${mId} has valid network logo`, Boolean(opt?.networkLogoSrc && opt?.networkLogoAlt));
  }

  // --- 2. OFFICIAL CONTRACTS & DECIMALS ---
  console.log('\n--- 2. OFFICIAL CONTRACTS & 6-DECIMAL STANDARDS ---');

  assert(
    'TRON USDT contract matches Tether official TRC20',
    OFFICIAL_TRON_USDT_TRC20 === 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
  );
  assert(
    'Polygon Native USDC contract matches Circle official',
    OFFICIAL_POLYGON_USDC_NATIVE.toLowerCase() === '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359'
  );
  assert(
    'Polygon Native USDC strictly differs from bridged USDC.e',
    OFFICIAL_POLYGON_USDC_NATIVE.toLowerCase() !== LEGACY_BRIDGED_USDC_E.toLowerCase()
  );
  assert(
    'Polygon USDT contract matches Tether official',
    OFFICIAL_CONTRACTS.POLYGON_USDT.toLowerCase() === '0xc2132d05d31c914a87c6611c10748aeb04b58e8f'
  );
  assert(
    'Aptos USDT metadata matches official Tether Fungible Asset',
    OFFICIAL_CONTRACTS.APTOS_USDT_METADATA.toLowerCase() === '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b'
  );

  // Decimals check (all 4 are 6-decimal tokens)
  const norm1 = normalizeAmount('2.000412');
  assert('normalizeAmount handles 6 decimals accurately', Math.abs(Number(norm1) - 2.000412) < 0.0000001);
  const formatted = formatPaymentAmount(2.000412);
  assert('formatPaymentAmount formats 6 decimals correctly', formatted === '2.000412');

  // --- 3. TRON TRC20 DEPOSIT VERIFICATION & MATCHING ---
  console.log('\n--- 3. TRON TRC20 VERIFICATION & MATCHING ---');

  const testTronAddress = 'TYUKGQnkBML3e3Zg8AZm6tUxP9z67v4y2Z';
  assert('testTronAddress passes isValidTronAddress', isValidTronAddress(testTronAddress));
  assert('testTronAddress fails isValidEvmAddress', !isValidEvmAddress(testTronAddress));

  const sampleTronOrder = {
    order_id: 'ord_tron_test_001',
    payment_amount_usdt: '2.000450',
    destination_address: testTronAddress,
    created_at: new Date(Date.now() - 300000).toISOString(), // 5 min ago
    expires_at: new Date(Date.now() + 900000).toISOString(), // 15 min remaining
  };

  const sampleTronTx: TronTrc20Transaction = {
    transaction_id: '7b54a32c4f828a2b53cb1c34a2e5d9c79f323a6f9911e25e982ec45f271a5c21',
    block_timestamp: Date.now() - 120000,
    from: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb',
    to: testTronAddress,
    type: 'Transfer',
    value: '2000450', // 2.000450 * 1,000,000 = 2000450 micro-USDT
    token_info: {
      symbol: 'USDT',
      address: OFFICIAL_TRON_USDT_TRC20,
      decimals: 6,
      name: 'Tether USD',
    },
  };

  const emptyTronConsumed = new Set<string>();
  const tronMatchResult = await matchTronDepositToOrder(sampleTronOrder, [sampleTronTx], emptyTronConsumed);
  assert('TRON deposit matches correct order amount and address', tronMatchResult.matched && tronMatchResult.status === 'confirmed');
  assert('TRON deposit returns txHash', tronMatchResult.txHash === sampleTronTx.transaction_id);

  // Replay prevention
  const consumedTronSet = new Set<string>([sampleTronTx.transaction_id]);
  const tronReplayResult = await matchTronDepositToOrder(sampleTronOrder, [sampleTronTx], consumedTronSet);
  assert('TRON matching blocks consumed transactions (replay protection)', !tronReplayResult.matched);

  // Wrong address rejection
  const wrongAddrTx: TronTrc20Transaction = {
    ...sampleTronTx,
    to: 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7',
  };
  const wrongAddrResult = await matchTronDepositToOrder(sampleTronOrder, [wrongAddrTx], emptyTronConsumed);
  assert('TRON matching strictly rejects deposits to wrong destination address', !wrongAddrResult.matched);

  // Amount mismatch detection
  const mismatchedTx: TronTrc20Transaction = {
    ...sampleTronTx,
    value: '3000000', // 3.000000 USDT instead of 2.000450
  };
  const mismatchResult = await matchTronDepositToOrder(sampleTronOrder, [mismatchedTx], emptyTronConsumed);
  assert('TRON matching detects amount mismatch', mismatchResult.status === 'amount_mismatch');

  // --- 4. POLYGON NATIVE USDC VERIFICATION & MATCHING ---
  console.log('\n--- 4. POLYGON NATIVE USDC VERIFICATION & MATCHING ---');

  const testEvmAddress = '0x1234567890123456789012345678901234567890';
  assert('testEvmAddress passes isValidEvmAddress', isValidEvmAddress(testEvmAddress));
  assert('testEvmAddress fails isValidTronAddress', !isValidTronAddress(testEvmAddress));

  const sampleUsdcOrder = {
    order_id: 'ord_usdc_test_001',
    payment_amount_usdt: '2.000820',
    destination_address: testEvmAddress,
    created_at: new Date(Date.now() - 200000).toISOString(),
    expires_at: new Date(Date.now() + 800000).toISOString(),
  };

  const sampleUsdcTransfer: PolygonUsdcTransfer = {
    txHash: '0x9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef',
    blockNumber: 52000000,
    blockTimestampMs: Date.now() - 60000,
    from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    to: testEvmAddress,
    value: '2000820', // 2.000820 * 1,000,000
    contractAddress: OFFICIAL_POLYGON_USDC_NATIVE,
    confirmations: 12,
  };

  const emptyUsdcConsumed = new Set<string>();
  const usdcMatchResult = await matchPolygonUsdcTransferToOrder(sampleUsdcOrder, [sampleUsdcTransfer], emptyUsdcConsumed);
  assert('Polygon USDC transfer matches correct order amount and address', usdcMatchResult.matched && usdcMatchResult.status === 'confirmed');
  assert('Polygon USDC transfer returns txHash', usdcMatchResult.txHash === sampleUsdcTransfer.txHash);

  // Replay prevention
  const consumedUsdcSet = new Set<string>([sampleUsdcTransfer.txHash.toLowerCase()]);
  const usdcReplayResult = await matchPolygonUsdcTransferToOrder(sampleUsdcOrder, [sampleUsdcTransfer], consumedUsdcSet);
  assert('Polygon USDC matching blocks consumed transactions (replay protection)', !usdcReplayResult.matched);

  // Strictly reject bridged USDC.e contract
  const bridgedTransfer: PolygonUsdcTransfer = {
    ...sampleUsdcTransfer,
    contractAddress: LEGACY_BRIDGED_USDC_E,
  };
  const bridgedResult = await matchPolygonUsdcTransferToOrder(sampleUsdcOrder, [bridgedTransfer], emptyUsdcConsumed);
  assert('Polygon USDC matching strictly rejects legacy bridged USDC.e contract', !bridgedResult.matched);

  // Amount mismatch detection
  const mismatchedUsdcTransfer: PolygonUsdcTransfer = {
    ...sampleUsdcTransfer,
    value: '5000000', // 5.000000 instead of 2.000820
  };
  const usdcMismatchResult = await matchPolygonUsdcTransferToOrder(sampleUsdcOrder, [mismatchedUsdcTransfer], emptyUsdcConsumed);
  assert('Polygon USDC matching detects amount mismatch', usdcMismatchResult.status === 'amount_mismatch');

  // --- 5. APTOS VERIFICATION INVARIANTS ---
  console.log('\n--- 5. APTOS DEPOSIT MATCHING INVARIANTS ---');

  const testAptosAddress = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const sampleAptosOrder = {
    order_id: 'ord_aptos_test_001',
    payment_amount_usdt: '2.000100',
    destination_address: testAptosAddress,
    created_at: new Date(Date.now() - 300000).toISOString(),
    expires_at: new Date(Date.now() + 600000).toISOString(),
  };

  const sampleAptosActivity: AptosFungibleActivity = {
    transaction_version: '123456789',
    transaction_timestamp: new Date(Date.now() - 60000).toISOString(),
    amount: '2000100', // 2.000100 USDT (micro-units)
    asset_type: OFFICIAL_CONTRACTS.APTOS_USDT_METADATA.toLowerCase(),
    type: '0x1::fungible_asset::Deposit',
    owner_address: testAptosAddress,
    is_transaction_success: true,
  };

  const aptosMatch = await matchAptosDepositToOrder(sampleAptosOrder, [sampleAptosActivity], new Set<string>());
  assert('Aptos deposit matching confirms valid transaction', aptosMatch.matched && aptosMatch.status === 'confirmed');

  const aptosReplay = await matchAptosDepositToOrder(sampleAptosOrder, [sampleAptosActivity], new Set<string>([String(sampleAptosActivity.transaction_version)]));
  assert('Aptos deposit matching blocks consumed transactions (replay protection)', !aptosReplay.matched);

  console.log('\n================================================================');
  console.log(` ALL 4 CRYPTO METHODS TESTS: ${passed} of ${total} passed (${Math.round((passed / total) * 100)}%)`);
  if (passed === total) {
    console.log(' ALL 4 CRYPTO METHODS VERIFIED 100% OPERATIONAL!');
    console.log('================================================================\n');
  } else {
    console.error(` FAILURES: ${total - passed}`);
    process.exitCode = 1;
  }
}

runAllCryptoTests().catch((err) => {
  console.error('Fatal error in crypto tests:', err);
  process.exit(1);
});
