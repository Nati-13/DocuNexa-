import { NextResponse } from 'next/server';
import { getClientIp, hashClientIdentifier, isRateLimited } from './rateLimit';

export interface GuardOptions {
  allowedMethods?: string[];
  maxBodyBytes?: number;
  rateLimitAction?: string;
  maxRequests?: number;
  windowSeconds?: number;
}

const DEFAULT_MAX_BODY_BYTES = 64 * 1024; // 64 KB

/**
 * Standard security guard for Next.js Route Handlers.
 * Enforces:
 * 1. Allowed HTTP methods
 * 2. Content-Length & JSON body size constraints
 * 3. Abuse prevention & rate limiting
 * 4. Automatic Request-ID attachment
 * 5. Private, non-cacheable security response headers
 */
export async function guardApiRequest(
  req: Request,
  options: GuardOptions = {}
): Promise<{
  errorResponse: NextResponse | null;
  requestId: string;
}> {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  // 1. Method verification
  const allowed = options.allowedMethods || ['POST'];
  if (!allowed.includes(req.method)) {
    return {
      errorResponse: NextResponse.json(
        { error: `Method ${req.method} not allowed.` },
        {
          status: 405,
          headers: {
            Allow: allowed.join(', '),
            'x-request-id': requestId,
            'Cache-Control': 'no-store, max-age=0',
          },
        }
      ),
      requestId,
    };
  }

  // 2. Request body size check
  const contentLength = req.headers.get('content-length');
  const maxBytes = options.maxBodyBytes || DEFAULT_MAX_BODY_BYTES;
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Payload too large.' },
        {
          status: 413,
          headers: {
            'x-request-id': requestId,
            'Cache-Control': 'no-store, max-age=0',
          },
        }
      ),
      requestId,
    };
  }

  // 3. Rate limiting check
  if (options.rateLimitAction) {
    const ip = getClientIp(req);
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const key = hashClientIdentifier(ip, userAgent, options.rateLimitAction);
    const maxReqs = options.maxRequests || 20;
    const windowSecs = options.windowSeconds || 60;

    const limitStatus = await isRateLimited(key, maxReqs, windowSecs);
    if (limitStatus.limited) {
      return {
        errorResponse: NextResponse.json(
          {
            error: 'Too many requests. Please slow down and try again later.',
            retryAfter: limitStatus.resetInSeconds,
          },
          {
            status: 429,
            headers: {
              'Retry-After': limitStatus.resetInSeconds.toString(),
              'x-request-id': requestId,
              'Cache-Control': 'no-store, max-age=0',
            },
          }
        ),
        requestId,
      };
    }
  }

  return {
    errorResponse: null,
    requestId,
  };
}

/**
 * Helper to construct standardized secure JSON responses with security headers and request-id.
 */
export function secureJsonResponse(
  data: any,
  init?: ResponseInit,
  requestId?: string
): NextResponse {
  const headers = new Headers(init?.headers);
  if (requestId) {
    headers.set('x-request-id', requestId);
  }
  headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
  return NextResponse.json(data, { ...init, headers });
}
