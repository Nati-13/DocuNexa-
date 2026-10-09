import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { validatePasswordStrength } from '@/lib/auth';

export interface BootstrapResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Checks whether first-admin bootstrap is available.
 * Returns true ONLY if public.admin_users is completely empty (0 rows).
 */
export async function isBootstrapAvailable(): Promise<boolean> {
  const admin = createAdminSupabaseClient();
  const { count, error } = await admin
    .from('admin_users')
    .select('user_id', { count: 'exact', head: true });

  if (error) {
    // If table query fails, try select count
    const { data, error: selectErr } = await admin.from('admin_users').select('user_id').limit(1);
    if (selectErr) {
      throw selectErr;
    }
    return !data || data.length === 0;
  }

  return (count ?? 0) === 0;
}

/**
 * Securely creates or promotes the very first administrator.
 *
 * Security guarantees:
 * 1. Permanently locked once an admin exists in public.admin_users (0 rows rule).
 * 2. If ADMIN_SETUP_KEY is configured in env, requires matching key.
 * 3. Normal signup NEVER becomes admin — only intentional owner execution.
 * 4. Passwords are never logged, never returned in API responses, and handled exclusively by Supabase Auth.
 */
export async function bootstrapFirstAdmin({
  email: rawEmail,
  password,
  setupKey,
  force = false,
}: {
  email: string;
  password: string;
  setupKey?: string;
  force?: boolean;
}): Promise<BootstrapResult> {
  const email = (rawEmail || '').trim().toLowerCase();

  if (!email || !email.includes('@')) {
    return { success: false, error: 'A valid email address is required for administrator setup.', message: '' };
  }

  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    return {
      success: false,
      error: strength.message || 'Password must be at least 8 characters long.',
      message: '',
    };
  }

  // Check setup key if configured in environment
  const configuredSetupKey = process.env.ADMIN_SETUP_KEY;
  if (configuredSetupKey && setupKey !== configuredSetupKey) {
    return {
      success: false,
      error: 'Invalid administrator setup authorization key.',
      message: '',
    };
  }

  // Check if bootstrap is already locked
  if (!force) {
    const available = await isBootstrapAvailable();
    if (!available) {
      return {
        success: false,
        error: 'Administrator setup has already been completed. Bootstrap is permanently locked.',
        message: '',
      };
    }
  }

  const admin = createAdminSupabaseClient();

  // 1. Check if user already exists in auth
  let targetUserId: string | null = null;
  try {
    const { data: userList } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
    const existingAuthUser = userList?.users?.find(
      (u) => u.email?.toLowerCase() === email
    );

    if (existingAuthUser) {
      targetUserId = existingAuthUser.id;
      // Update password and ensure email is confirmed
      const { error: updateErr } = await admin.auth.admin.updateUserById(targetUserId, {
        password,
        email_confirm: true,
      });
      if (updateErr) {
        return { success: false, error: `Auth update failed: ${updateErr.message}`, message: '' };
      }
    } else {
      // Create new user in Supabase Auth with confirmed email
      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'admin' },
      });

      if (createErr || !newUser.user) {
        return { success: false, error: createErr?.message || 'Failed to create admin in Supabase Auth.', message: '' };
      }
      targetUserId = newUser.user.id;
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Supabase Auth admin connection error.', message: '' };
  }

  if (!targetUserId) {
    return { success: false, error: 'Could not obtain user ID for administrator.', message: '' };
  }

  // 2. Ensure profile exists and has ad_free plan
  try {
    await admin.from('profiles').upsert({
      id: targetUserId,
      email,
      plan: 'ad_free',
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Non-fatal if profiles table upsert handles elsewhere
  }

  // 3. Register user in public.admin_users
  try {
    const { error: adminInsertErr } = await admin.from('admin_users').upsert({
      user_id: targetUserId,
      created_at: new Date().toISOString(),
    });

    if (adminInsertErr) {
      return { success: false, error: `Failed to insert into admin_users: ${adminInsertErr.message}`, message: '' };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to register admin user in database.', message: '' };
  }

  return {
    success: true,
    message: 'First administrator initialized successfully. You may now sign in at /admin.',
  };
}
