import { createServerSupabaseClient } from '@/lib/supabase/server';
import { guardApiRequest, secureJsonResponse } from '@/lib/security/apiGuard';

export async function POST(req: Request) {
  const { errorResponse, requestId } = await guardApiRequest(req, {
    allowedMethods: ['POST'],
  });

  if (errorResponse) {
    return errorResponse;
  }

  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
    return secureJsonResponse({ success: true }, { status: 200 }, requestId);
  } catch (err: any) {
    return secureJsonResponse({ success: true, message: err.message }, { status: 200 }, requestId);
  }
}
