import type { SupportCategory } from '@/lib/supabase/types';

export const SUPPORT_CATEGORIES: readonly SupportCategory[] = [
  'Account',
  'Payments',
  'PDF Tools',
  'Coupon',
  'Bug Report',
  'Other',
] as const;

export interface SupportTicketInput {
  name: string;
  email: string;
  category: SupportCategory;
  subject: string;
  message: string;
  userId?: string | null;
}

export interface SupportValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: SupportTicketInput;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validates and sanitizes a support ticket submission.
 */
export function validateSupportTicketInput(input: any): SupportValidationResult {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Invalid submission data.' };
  }

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const category = input.category as SupportCategory;
  const subject = typeof input.subject === 'string' ? input.subject.trim() : '';
  const message = typeof input.message === 'string' ? input.message.trim() : '';
  const userId = typeof input.userId === 'string' ? input.userId : null;

  if (!name || name.length < 2 || name.length > 100) {
    return { valid: false, error: 'Please enter a name between 2 and 100 characters.' };
  }

  if (!email || !isValidEmail(email)) {
    return { valid: false, error: 'Please provide a valid email address so we can reply.' };
  }

  if (!SUPPORT_CATEGORIES.includes(category)) {
    return {
      valid: false,
      error: `Invalid category. Please select one of: ${SUPPORT_CATEGORIES.join(', ')}.`,
    };
  }

  if (!subject || subject.length < 3 || subject.length > 200) {
    return { valid: false, error: 'Please enter a subject between 3 and 200 characters.' };
  }

  if (!message || message.length < 10 || message.length > 5000) {
    return { valid: false, error: 'Message must be between 10 and 5,000 characters.' };
  }

  return {
    valid: true,
    sanitized: {
      name,
      email,
      category,
      subject,
      message,
      userId,
    },
  };
}
