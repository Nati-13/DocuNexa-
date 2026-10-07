/**
 * DocuNexa — Admin Bootstrap CLI
 *
 * Secure server-side initialization of the first DocuNexa administrator.
 *
 * Usage:
 *   ADMIN_EMAIL="admin@example.com" ADMIN_PASSWORD="your-strong-password" npx tsx scripts/bootstrap-admin.ts
 *
 * Or interactive prompt:
 *   npx tsx scripts/bootstrap-admin.ts
 *
 * Security rules:
 * - Passwords are NEVER printed or logged.
 * - Cannot bootstrap if an admin already exists (unless --force is passed).
 * - Authenticates directly via Supabase Service Role client.
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';

// Helper to manually load .env.local if not loaded
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnvLocal();

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

async function main() {
  console.log('\n======================================================');
  console.log('       DOCUNEXA — SECURE FIRST-ADMIN BOOTSTRAP        ');
  console.log('======================================================\n');

  const { bootstrapFirstAdmin, isBootstrapAvailable } = await import('../src/lib/admin/bootstrap');

  const isForce = process.argv.includes('--force');
  const available = await isBootstrapAvailable();

  if (!available && !isForce) {
    console.error('❌ Bootstrap Locked: An administrator account already exists in public.admin_users.');
    console.error('If you need to reconfigure the administrator, pass --force intentionally.');
    process.exit(1);
  }

  let email = process.env.ADMIN_EMAIL;
  let password = process.env.ADMIN_PASSWORD;

  if (!email) {
    email = await prompt('Enter Admin Email Address: ');
  }

  if (!password) {
    password = await prompt('Enter Admin Password (min 8 characters): ');
  }

  if (!email || !password) {
    console.error('❌ Error: Both ADMIN_EMAIL and ADMIN_PASSWORD are required.');
    process.exit(1);
  }

  console.log(`\n⏳ Bootstrapping administrator for: ${email}...`);

  const result = await bootstrapFirstAdmin({
    email,
    password,
    force: isForce,
  });

  if (!result.success) {
    console.error(`❌ Bootstrap Failed: ${result.error}`);
    process.exit(1);
  }

  console.log(`\n✅ ${result.message}`);
  console.log(`Sign in at: https://docunexa.pro.et/login?redirect=/admin\n`);
}

main().catch((err) => {
  console.error('❌ Fatal bootstrap error:', err.message || err);
  process.exit(1);
});
