import crypto from 'crypto';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

interface InMemoryBucket {
  count: number;
  resetAt: number;
}

// Fallback in-memory cache for ultra-fast local checks or database-failover
const memoryRateLimits = new Map<string, InMemoryBucket>();

// Clean up expired in-memory buckets periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of memoryRateLimits.entries()) {
      if (val.resetAt < now) {
        memoryRateLimits.delete(key);
      }
    }
  }, 60000);
}

/**
 * Generates a privacy-preserving one-way hash of client identifier without storing raw IP.
 */
export function hashClientIdentifier(ip: string, userAgent: string, action: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'docunexa-rl-salt';
  return crypto
    .createHash('sha256')
    .update(`${ip}:${userAgent}:${action}:${secret}`)
    .digest('hex')
    .slice(0, 32);
}

/**
 * Extracts client IP safely from standard reverse-proxy headers.
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

/**
 * Serverless-compatible rate limiter.
 * Checks PostgreSQL rate_limits table via RPC/SQL, falling back gracefully to memory.
 */
export async function isRateLimited(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ limited: boolean; remaining: number; resetInSeconds: number }> {
  const now = Date.now();

  try {
    const admin = createAdminSupabaseClient();
    // Try calling the atomic RPC if available
    const { data: allowed, error } = await (admin as any).rpc('check_rate_limit', {
      p_key: key,
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds,
    });

    if (!error && typeof allowed === 'boolean') {
      return {
        limited: !allowed,
        remaining: allowed ? maxRequests - 1 : 0,
        resetInSeconds: windowSeconds,
      };
    }
  } catch {
    // If DB check fails, fallback seamlessly to in-memory limiter
  }

  // In-memory fallback
  const record = memoryRateLimits.get(key);
  if (!record || record.resetAt < now) {
    memoryRateLimits.set(key, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });
    return { limited: false, remaining: maxRequests - 1, resetInSeconds: windowSeconds };
  }

  if (record.count >= maxRequests) {
    const remainingSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return { limited: true, remaining: 0, resetInSeconds: remainingSeconds };
  }

  record.count += 1;
  const remainingSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
  return {
    limited: false,
    remaining: Math.max(0, maxRequests - record.count),
    resetInSeconds: remainingSeconds,
  };
}
