async function verifyLiveFlow() {
  const PROD_URL = 'https://docunexa.pro.et';
  console.log('\n======================================================');
  console.log(` DOCUNEXA — LIVE USER SIGNUP, DUPLICATE, AND LOGIN `);
  console.log(` Target Domain: ${PROD_URL} `);
  console.log('======================================================\n');

  const testEmail = `qa-user-${Date.now()}@docunexa.pro.et`;
  const testPassword = 'SecurePassword2026!';

  // Step 1: Create fresh account
  console.log(`1. Testing live signup for: ${testEmail}`);
  const signupRes = await fetch(`${PROD_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      confirmPassword: testPassword,
    }),
  });
  const signupData = await signupRes.json();
  console.log(`   Status: HTTP ${signupRes.status}`);
  console.log(`   Response redirect: ${signupData.redirect}`);
  console.log(`   User ID: ${signupData.user?.id ? 'Present' : 'None'}`);

  if (signupRes.status !== 201) {
    console.error('   Signup failed:', signupData);
    process.exit(1);
  }

  // Step 2: Test duplicate signup with identical email
  console.log('\n2. Testing duplicate signup detection...');
  const dupRes = await fetch(`${PROD_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      confirmPassword: testPassword,
    }),
  });
  const dupData = await dupRes.json();
  console.log(`   Status: HTTP ${dupRes.status} (Expected 409)`);
  console.log(`   Message: ${dupData.error}`);

  // Step 3: Test live login with newly created user
  console.log('\n3. Testing live login with created user credentials...');
  const loginRes = await fetch(`${PROD_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  const loginData = await loginRes.json();
  console.log(`   Status: HTTP ${loginRes.status} (Expected 200)`);
  console.log(`   User plan: ${loginData.user?.plan}`);

  // Step 4: Test confirmation resend for unconfirmed / existing account
  console.log('\n4. Testing confirmation resend endpoint with existing account...');
  const resendRes = await fetch(`${PROD_URL}/api/auth/resend-confirmation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://docunexa.pro.et',
    },
    body: JSON.stringify({ email: testEmail }),
  });
  const resendData = await resendRes.json();
  console.log(`   Status: HTTP ${resendRes.status}`);
  console.log(`   Response: ${resendData.message || resendData.error}`);

  // Step 5: Test password reset request
  console.log('\n5. Testing password reset request...');
  const resetRes = await fetch(`${PROD_URL}/api/auth/reset-password/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail }),
  });
  const resetData = await resetRes.json();
  console.log(`   Status: HTTP ${resetRes.status}`);
  console.log(`   Response: ${resetData.message || resetData.error}`);

  console.log('\n======================================================');
  console.log(' LIVE VERIFICATION COMPLETE');
  console.log('======================================================\n');
}

verifyLiveFlow().catch((err) => {
  console.error('Fatal live test error:', err);
  process.exit(1);
});
