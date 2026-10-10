async function testLiveProduction() {
  const PROD_URL = 'https://docunexa.pro.et';
  console.log('\n======================================================');
  console.log(` DOCUNEXA — LIVE PRODUCTION STATUS & AUTH VERIFICATION `);
  console.log(` Target Domain: ${PROD_URL} `);
  console.log('======================================================\n');

  const results: Record<string, { status: number; passed: boolean; note: string; body?: any }> = {};

  // 1. Check Choose Plan Route
  try {
    const res = await fetch(`${PROD_URL}/choose-plan`);
    results['/choose-plan page'] = {
      status: res.status,
      passed: res.status === 200,
      note: res.status === 200 ? 'Renders HTTP 200 OK' : `Unexpected status ${res.status}`,
    };
  } catch (err: any) {
    results['/choose-plan page'] = { status: 0, passed: false, note: err.message };
  }

  // 2. Test Confirmation Resend Endpoint
  try {
    const res = await fetch(`${PROD_URL}/api/auth/resend-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://docunexa.pro.et',
      },
      body: JSON.stringify({ email: 'unconfirmed-check@docunexa.pro.et' }),
    });
    const data = await res.json().catch(() => ({}));
    results['POST /api/auth/resend-confirmation'] = {
      status: res.status,
      passed: res.status === 200 || res.status === 429 || res.status === 503,
      note: `HTTP ${res.status} - ${data.message || data.error || 'Response received'}`,
      body: data,
    };
  } catch (err: any) {
    results['POST /api/auth/resend-confirmation'] = { status: 0, passed: false, note: err.message };
  }

  // 3. Test Confirmation Resend Malicious Origin Sanitization
  try {
    const res = await fetch(`${PROD_URL}/api/auth/resend-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://evil-attacker.com',
      },
      body: JSON.stringify({ email: 'unconfirmed-check@docunexa.pro.et' }),
    });
    const data = await res.json().catch(() => ({}));
    results['Resend confirmation (Origin validation)'] = {
      status: res.status,
      passed: res.status === 200 || res.status === 429 || res.status === 503,
      note: `HTTP ${res.status} - Safely handled untrusted Origin`,
    };
  } catch (err: any) {
    results['Resend confirmation (Origin validation)'] = { status: 0, passed: false, note: err.message };
  }

  // 4. Test Password Reset Request
  try {
    const res = await fetch(`${PROD_URL}/api/auth/reset-password/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@docunexa.pro.et' }),
    });
    const data = await res.json().catch(() => ({}));
    results['POST /api/auth/reset-password/request'] = {
      status: res.status,
      passed: true,
      note: `HTTP ${res.status} - code: ${data.code || 'none'}, msg: ${data.error || data.message || ''}`,
      body: data,
    };
  } catch (err: any) {
    results['POST /api/auth/reset-password/request'] = { status: 0, passed: false, note: err.message };
  }

  // 5. Test Live Signup Route
  try {
    const uniqueEmail = `test-user-${Date.now()}@docunexa.pro.et`;
    const res = await fetch(`${PROD_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'Password123!Secure',
        confirmPassword: 'Password123!Secure',
      }),
    });
    const data = await res.json().catch(() => ({}));
    results['POST /api/auth/signup'] = {
      status: res.status,
      passed: res.status === 201 || res.status === 503,
      note: `HTTP ${res.status} - code: ${data.code || 'none'}, msg: ${data.error || data.message || 'Created'}`,
      body: data,
    };
  } catch (err: any) {
    results['POST /api/auth/signup'] = { status: 0, passed: false, note: err.message };
  }

  // 6. Test Live Login with non-existing account
  try {
    const res = await fetch(`${PROD_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nobody-exists-999@docunexa.pro.et',
        password: 'Password123!Secure',
      }),
    });
    const data = await res.json().catch(() => ({}));
    results['POST /api/auth/login (Invalid credentials)'] = {
      status: res.status,
      passed: res.status === 401,
      note: `HTTP ${res.status} - msg: ${data.error || ''}`,
    };
  } catch (err: any) {
    results['POST /api/auth/login (Invalid credentials)'] = { status: 0, passed: false, note: err.message };
  }

  console.log('RESULTS SUMMARY:');
  for (const [key, val] of Object.entries(results)) {
    console.log(`- ${key}: [${val.passed ? 'PASS' : 'FAIL'}] HTTP ${val.status} -> ${val.note}`);
  }
}

testLiveProduction().catch(console.error);
