import { getCurrentProfile } from '@/lib/supabase/server';
import { Profile } from '@/lib/supabase/types';

export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one letter and one number.' };
  }
  return { valid: true };
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Server-side helper to retrieve the authenticated user profile from Supabase Auth & DB.
 */
export async function getCurrentUser(): Promise<Profile | null> {
  return getCurrentProfile();
}
