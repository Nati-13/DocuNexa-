import {
  normalizeCountryCode,
  getCountryName,
  getCountryFlag,
} from '../src/lib/countryNames';
import {
  recordAnalyticsEvent,
  getAnalyticsSummary,
} from '../src/lib/analytics/tracker';

async function runCountryAnalyticsTests() {
  console.log('--- Testing Country Code Normalization & English Name Mapping ---');

  // Test 1: Normalization of valid and invalid country codes
  console.log('Test 1: normalizeCountryCode validation');
  if (normalizeCountryCode('ye') !== 'YE') throw new Error('Expected "ye" to normalize to "YE"');
  if (normalizeCountryCode('VN') !== 'VN') throw new Error('Expected "VN" to normalize to "VN"');
  if (normalizeCountryCode(' et ') !== 'ET') throw new Error('Expected " et " to normalize to "ET"');
  if (normalizeCountryCode('us') !== 'US') throw new Error('Expected "us" to normalize to "US"');

  // Non-geographic / proxy codes
  if (normalizeCountryCode('XX') !== null) throw new Error('Expected "XX" to normalize to null');
  if (normalizeCountryCode('T1') !== null) throw new Error('Expected "T1" to normalize to null');
  if (normalizeCountryCode('ZZ') !== null) throw new Error('Expected "ZZ" to normalize to null');
  if (normalizeCountryCode('Unknown') !== null) throw new Error('Expected "Unknown" to normalize to null');
  if (normalizeCountryCode('') !== null) throw new Error('Expected "" to normalize to null');
  if (normalizeCountryCode(null) !== null) throw new Error('Expected null to normalize to null');
  if (normalizeCountryCode(undefined) !== null) throw new Error('Expected undefined to normalize to null');
  console.log('✅ Country normalization correctly filters proxy codes and normalizes alpha-2 codes');

  // Test 2: Full English country names
  console.log('Test 2: getCountryName English conversions');
  if (getCountryName('YE') !== 'Yemen') throw new Error(`Expected "Yemen", got "${getCountryName('YE')}"`);
  if (getCountryName('VN') !== 'Vietnam') throw new Error(`Expected "Vietnam", got "${getCountryName('VN')}"`);
  if (getCountryName('ET') !== 'Ethiopia') throw new Error(`Expected "Ethiopia", got "${getCountryName('ET')}"`);
  if (getCountryName('US') !== 'United States') throw new Error(`Expected "United States", got "${getCountryName('US')}"`);
  if (getCountryName('GB') !== 'United Kingdom') throw new Error(`Expected "United Kingdom", got "${getCountryName('GB')}"`);

  // Unknown location handling
  if (getCountryName('Unknown') !== 'Unknown location') throw new Error(`Expected "Unknown location", got "${getCountryName('Unknown')}"`);
  if (getCountryName(null) !== 'Unknown location') throw new Error(`Expected "Unknown location", got "${getCountryName(null)}"`);
  if (getCountryName('XX') !== 'Unknown location') throw new Error(`Expected "Unknown location", got "${getCountryName('XX')}"`);
  console.log('✅ getCountryName properly resolves Yemen, Vietnam, Ethiopia, and Unknown location');

  // Test 3: Country Flag Generation
  console.log('Test 3: getCountryFlag emojis');
  if (getCountryFlag('YE') !== '🇾🇪') throw new Error(`Expected 🇾🇪, got ${getCountryFlag('YE')}`);
  if (getCountryFlag('VN') !== '🇻🇳') throw new Error(`Expected 🇻🇳, got ${getCountryFlag('VN')}`);
  if (getCountryFlag('ET') !== '🇪🇹') throw new Error(`Expected 🇪🇹, got ${getCountryFlag('ET')}`);
  if (getCountryFlag(null) !== '🌐') throw new Error(`Expected 🌐, got ${getCountryFlag(null)}`);
  if (getCountryFlag('XX') !== '🌐') throw new Error(`Expected 🌐, got ${getCountryFlag('XX')}`);
  console.log('✅ getCountryFlag properly generates flag emojis and globe fallback');

  // Test 4: Record events and verify summary aggregation
  console.log('Test 4: Aggregation in getAnalyticsSummary');
  await recordAnalyticsEvent({ eventType: 'pageview', path: '/', countryCode: 'ye', ip: '1.2.3.4' });
  await recordAnalyticsEvent({ eventType: 'pageview', path: '/tools', countryCode: 'VN', ip: '5.6.7.8' });
  await recordAnalyticsEvent({ eventType: 'pageview', path: '/tools/pdf-unit-cutter', countryCode: 'ET', ip: '9.10.11.12' });
  await recordAnalyticsEvent({ eventType: 'pageview', path: '/about', countryCode: 'XX', ip: '13.14.15.16' });
  await recordAnalyticsEvent({ eventType: 'pageview', path: '/pricing', countryCode: null, ip: '17.18.19.20' });

  const summary = await getAnalyticsSummary(1);
  const yemen = summary.countries.find((c) => c.countryCode === 'YE');
  const vietnam = summary.countries.find((c) => c.countryCode === 'VN');
  const ethiopia = summary.countries.find((c) => c.countryCode === 'ET');
  const unknown = summary.countries.find((c) => c.countryCode === 'Unknown');

  if (!yemen || yemen.countryName !== 'Yemen') throw new Error('Yemen missing or named incorrectly');
  if (!vietnam || vietnam.countryName !== 'Vietnam') throw new Error('Vietnam missing or named incorrectly');
  if (!ethiopia || ethiopia.countryName !== 'Ethiopia') throw new Error('Ethiopia missing or named incorrectly');
  if (!unknown || unknown.countryName !== 'Unknown location') throw new Error('Unknown location missing or named incorrectly');

  console.log('Summary countries verified:');
  for (const c of summary.countries) {
    console.log(`  ${c.flag} ${c.countryName} [${c.countryCode}]: ${c.pageViews} views`);
  }

  console.log('\n🎉 ALL COUNTRY ANALYTICS TESTS PASSED!');
}

runCountryAnalyticsTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

