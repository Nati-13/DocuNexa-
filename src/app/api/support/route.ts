import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest, secureJsonResponse } from '@/lib/security/apiGuard';
import { getCurrentProfile } from '@/lib/supabase/server';
import { validateSupportTicketInput, persistSupportTicket } from '@/lib/support';
import { notifyOwnerOfWebsiteTicket } from '@/lib/telegram/bot';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // 1. Guard against abuse & rate limit: max 5 requests per 5 minutes per IP
  const { errorResponse, requestId } = await guardApiRequest(req, {
    allowedMethods: ['POST'],
    maxBodyBytes: 32 * 1024,
    rateLimitAction: 'support-ticket-submit',
    maxRequests: 5,
    windowSeconds: 300,
  });

  if (errorResponse) {
    return errorResponse;
  }

  try {
    const body = await req.json().catch(() => ({}));

    // 2. Attach user ID if logged in
    const profile = await getCurrentProfile().catch(() => null);
    if (profile?.id) {
      body.userId = profile.id;
      if (!body.email && profile.email) {
        body.email = profile.email;
      }
    }

    // 3. Strict validation & sanitization
    const validation = validateSupportTicketInput(body);
    if (!validation.valid || !validation.sanitized) {
      return secureJsonResponse(
        { error: validation.error || 'Invalid support submission.' },
        { status: 400 },
        requestId
      );
    }

    // 4. Persist in database
    const persistence = await persistSupportTicket(validation.sanitized);

    if (!persistence.success) {
      return secureJsonResponse(
        { error: persistence.error || 'Failed to save support request. Please try again later.' },
        { status: 500 },
        requestId
      );
    }

    // 5. Notify owner via Telegram if configured (non-blocking, never fails the ticket)
    if (persistence.ticketId) {
      notifyOwnerOfWebsiteTicket({
        ticketId: persistence.ticketId,
        name: validation.sanitized.name,
        email: validation.sanitized.email,
        category: validation.sanitized.category,
        subject: validation.sanitized.subject,
        message: validation.sanitized.message,
      }).catch((err) => {
        console.error('[support-tg-notify] Non-blocking notification error:', err?.message || err);
      });
    }

    return secureJsonResponse(
      {
        success: true,
        ticketId: persistence.ticketId,
        message: 'Your support ticket has been recorded. Our team will review your request and get back to you shortly.',
      },
      { status: 200 },
      requestId
    );
  } catch (err: any) {
    return secureJsonResponse(
      { error: err.message || 'Error processing support request.' },
      { status: 500 },
      requestId
    );
  }
}
