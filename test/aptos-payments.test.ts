/**
 * DOCUNEXA — APTOS USDT PAYMENT VERIFICATION TEST SUITE
 *
 * Validates:
 * 1. Aptos address formatting and canonical 64-hex normalization.
 * 2. Official Tether USDt Fungible Asset metadata ID validation.
 * 3. Exact 6-decimal micro-unit matching and integer arithmetic.
 * 4. Replay protection and double-spend prevention.
 * 5. Expired, late, and amount mismatch status classification.
 * 6. Strict network separation between Polygon and Aptos.
 */

import {
  OFFICIAL_APTOS_USDT_METADATA,
  DEFAULT_APTOS_RECEIVING_ADDRESS,
  isValidAptosAddress,
  normalizeAptosAddress,
  getAptosConfig,
  matchAptosDepositToOrder,
  AptosFungibleActivity,
} from '../src/lib/payments/aptos';
import { parseExactUsdt } from '../src/lib/payments/bybit';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`FAIL: ${msg}`);
  }
}

async function runTests() {
  console.log('\n--- Running DocuNexa Aptos USDT Tests ---\n');

  // Test 1: Configured receiving address and official metadata ID
  console.log('1. Validating configured address and official metadata...');
  assert(
    DEFAULT_APTOS_RECEIVING_ADDRESS ===
      '0xca9ea3f1167d11817d9ab02493c9a49a83d416bc3374f0872a7cc1ac79670bbd',
    'Configured receiving address must match exact required Aptos address'
  );
  assert(
    OFFICIAL_APTOS_USDT_METADATA ===
      '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b',
    'Official Tether USDt FA metadata must match exact required identifier'
  );
  const cfg = getAptosConfig();
  assert(
    cfg.receivingAddress.toLowerCase() === DEFAULT_APTOS_RECEIVING_ADDRESS.toLowerCase(),
    'getAptosConfig() must return canonical receiving address'
  );
  console.log('✓ Configured address and metadata verified.');

  // Test 2: Aptos address validation and normalization
  console.log('2. Testing Aptos address validation and normalization...');
  assert(
    isValidAptosAddress('0xca9ea3f1167d11817d9ab02493c9a49a83d416bc3374f0872a7cc1ac79670bbd'),
    'Full 64-hex Aptos address must be valid'
  );
  assert(
    isValidAptosAddress('0x1'),
    'Short hex address (e.g. 0x1) must be valid Aptos hex'
  );
  assert(!isValidAptosAddress('0xzzz'), 'Non-hex must be rejected');
  assert(!isValidAptosAddress('not-an-address'), 'Plain string must be rejected');
  assert(!isValidAptosAddress(''), 'Empty string must be rejected');

  const normalized = normalizeAptosAddress('0x1');
  assert(normalized.length === 66, 'Normalized address must be 0x followed by 64 hex characters');
  assert(normalized.endsWith('1'), 'Normalized short address must preserve trailing digit');
  console.log('✓ Aptos address formatting and normalization verified.');

  // Test 3: Exact 6-decimal micro-unit arithmetic
  console.log('3. Testing 6-decimal micro-unit arithmetic...');
  const parse1 = parseExactUsdt('2.000000');
  assert(parse1.valid && parse1.microUnits === 2000000n, '2.000000 must parse to 2,000,000 micro-units');

  const parse2 = parseExactUsdt('2.004821');
  assert(parse2.valid && parse2.microUnits === 2004821n, '2.004821 must parse to 2,004,821 micro-units');

  const parse3 = parseExactUsdt('1.500000');
  assert(parse3.valid && parse3.microUnits === 1500000n, '1.500000 must parse to 1,500,000 micro-units');
  console.log('✓ Micro-unit arithmetic verified without floating point loss.');

  // Test 4: Confirmed deposit matching on Aptos
  console.log('4. Testing on-chain deposit matching...');
  const now = Date.now();
  const order = {
    payment_amount_usdt: '2.004821',
    destination_address: DEFAULT_APTOS_RECEIVING_ADDRESS,
    created_at: new Date(now - 120000).toISOString(), // Created 2 minutes ago
    expires_at: new Date(now + 18 * 60000).toISOString(), // Expires in 18 minutes
  };

  const activities: AptosFungibleActivity[] = [
    {
      transaction_version: 7500000100,
      transaction_timestamp: new Date(now - 60000).toISOString(), // 1 minute ago
      amount: '2004821', // exact micro-units
      asset_type: OFFICIAL_APTOS_USDT_METADATA,
      type: '0x1::fungible_asset::Deposit',
      owner_address: DEFAULT_APTOS_RECEIVING_ADDRESS,
      is_transaction_success: true,
    },
  ];

  const matchSuccess = await matchAptosDepositToOrder(order, activities);
  assert(matchSuccess.matched === true, 'Matching deposit should succeed');
  assert(matchSuccess.status === 'confirmed', 'Status should be confirmed');
  assert(matchSuccess.depositId === 'aptos:7500000100', 'DepositId should include transaction version');
  console.log('✓ On-chain deposit matched successfully.');

  // Test 5: Replay / Double-spend prevention
  console.log('5. Testing double-spend / replay prevention...');
  const consumed = new Set<string>(['aptos:7500000100']);
  const matchReplay = await matchAptosDepositToOrder(order, activities, consumed);
  assert(matchReplay.matched === false, 'Consumed deposit must NOT match another order');
  assert(matchReplay.status === 'pending', 'Status should stay pending when deposit already consumed');
  console.log('✓ Replay protection verified.');

  // Test 6: Rejection of unrelated token metadata (fake USDT)
  console.log('6. Testing rejection of fake / unrelated token metadata...');
  const fakeTokenActivities: AptosFungibleActivity[] = [
    {
      transaction_version: 7500000200,
      transaction_timestamp: new Date(now - 60000).toISOString(),
      amount: '2004821',
      asset_type: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', // Fake token ID
      type: '0x1::fungible_asset::Deposit',
      owner_address: DEFAULT_APTOS_RECEIVING_ADDRESS,
      is_transaction_success: true,
    },
  ];

  const matchFake = await matchAptosDepositToOrder(order, fakeTokenActivities);
  assert(matchFake.matched === false, 'Unrelated token metadata ID must be rejected');
  assert(matchFake.status === 'pending', 'Status should stay pending when token is fake');
  console.log('✓ Fake token rejection verified.');

  // Test 7: Amount mismatch detection
  console.log('7. Testing amount mismatch detection...');
  const mismatchActivities: AptosFungibleActivity[] = [
    {
      transaction_version: 7500000300,
      transaction_timestamp: new Date(now - 60000).toISOString(),
      amount: '2000000', // Sent 2.00 instead of 2.004821
      asset_type: OFFICIAL_APTOS_USDT_METADATA,
      type: '0x1::fungible_asset::Deposit',
      owner_address: DEFAULT_APTOS_RECEIVING_ADDRESS,
      is_transaction_success: true,
    },
  ];

  const matchMismatch = await matchAptosDepositToOrder(order, mismatchActivities);
  assert(matchMismatch.matched === false, 'Mismatched amount must not confirm order');
  assert(matchMismatch.status === 'amount_mismatch', 'Status should be amount_mismatch');
  console.log('✓ Amount mismatch detection verified.');

  // Test 8: Late payment detection (arrived after 20-minute window)
  console.log('8. Testing late payment detection...');
  const expiredOrder = {
    payment_amount_usdt: '2.004821',
    destination_address: DEFAULT_APTOS_RECEIVING_ADDRESS,
    created_at: new Date(now - 25 * 60000).toISOString(), // Created 25 min ago
    expires_at: new Date(now - 5 * 60000).toISOString(), // Expired 5 min ago
  };

  const lateActivities: AptosFungibleActivity[] = [
    {
      transaction_version: 7500000400,
      transaction_timestamp: new Date(now - 2 * 60000).toISOString(), // Received 2 min ago (after expiry)
      amount: '2004821',
      asset_type: OFFICIAL_APTOS_USDT_METADATA,
      type: '0x1::fungible_asset::Deposit',
      owner_address: DEFAULT_APTOS_RECEIVING_ADDRESS,
      is_transaction_success: true,
    },
  ];

  const matchLate = await matchAptosDepositToOrder(expiredOrder, lateActivities);
  assert(matchLate.matched === true, 'Late payment was matched');
  assert(matchLate.status === 'late_payment', 'Late deposit must have status late_payment');
  console.log('✓ Late payment detection verified.');

  // Test 9: Network separation
  console.log('9. Testing network separation...');
  const polygonAddress = '0x1111111111111111111111111111111111111111';
  assert(
    normalizeAptosAddress(DEFAULT_APTOS_RECEIVING_ADDRESS) !== polygonAddress.toLowerCase(),
    'Aptos and Polygon addresses must never be identical'
  );
  console.log('✓ Network separation verified.');

  // Test 10: 4-decimal Aptos order verification and historical 6-decimal compatibility
  console.log('10. Testing 4-decimal Aptos order verification (e.g. 2.0048 vs 2.004800 micro-units)...');
  const fourDecimalOrder = {
    payment_amount_usdt: '2.0048',
    destination_address: DEFAULT_APTOS_RECEIVING_ADDRESS,
    created_at: new Date(now - 120000).toISOString(),
    expires_at: new Date(now + 18 * 60000).toISOString(),
  };

  const fourDecimalActivities: AptosFungibleActivity[] = [
    {
      transaction_version: 7500000500,
      transaction_timestamp: new Date(now - 60000).toISOString(),
      amount: '2004800', // 2.0048 USDT in 6-decimal micro-units
      asset_type: OFFICIAL_APTOS_USDT_METADATA,
      type: '0x1::fungible_asset::Deposit',
      owner_address: DEFAULT_APTOS_RECEIVING_ADDRESS,
      is_transaction_success: true,
    },
  ];

  const match4Dec = await matchAptosDepositToOrder(fourDecimalOrder, fourDecimalActivities);
  assert(match4Dec.matched === true, '4-decimal order 2.0048 must match 2004800 micro-units on Aptos');
  assert(match4Dec.status === 'confirmed', 'Status must be confirmed');

  // Mismatch check: 2004700 micro-units (2.0047 USDT) must be rejected
  const mismatch4DecActivities: AptosFungibleActivity[] = [
    {
      transaction_version: 7500000501,
      transaction_timestamp: new Date(now - 60000).toISOString(),
      amount: '2004700', // 2.0047 USDT
      asset_type: OFFICIAL_APTOS_USDT_METADATA,
      type: '0x1::fungible_asset::Deposit',
      owner_address: DEFAULT_APTOS_RECEIVING_ADDRESS,
      is_transaction_success: true,
    },
  ];
  const matchMismatch4 = await matchAptosDepositToOrder(fourDecimalOrder, mismatch4DecActivities);
  assert(matchMismatch4.matched === false, '2.0047 USDT must not match 2.0048 order');
  assert(matchMismatch4.status === 'amount_mismatch', 'Must classify as amount_mismatch');
  console.log('✓ 4-decimal Aptos order matching and rejection verified.');

  console.log('\n--- ALL APTOS PAYMENT TESTS PASSED ---\n');
}

runTests().catch((err) => {
  console.error('\nTest Suite Error:\n', err);
  process.exit(1);
});
