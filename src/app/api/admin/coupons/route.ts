import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { logAdminAction } from '@/lib/admin/audit';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { normalizeCouponCode, isValidCouponCodeFormat, calculateCouponDiscount } from '@/lib/coupons';
import { CouponDiscountType } from '@/lib/supabase/types';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const admin = createAdminSupabaseClient();

    const searchParams = req.nextUrl.searchParams;
    const search = (searchParams.get('search') || '').trim();
    const active = searchParams.get('active');

    let query = admin
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (active === 'true') {
      query = query.eq('active', true);
    } else if (active === 'false') {
      query = query.eq('active', false);
    }

    if (search) {
      query = query.ilike('code', `%${search}%`);
    }

    const { data: coupons, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      coupons: coupons || [],
    });
  } catch (err: any) {
    const s = err.statusCode || 500;
    return NextResponse.json(
      { error: err.message || 'Error fetching coupons' },
      { status: s }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { profile: adminProfile } = await requireAdmin();
    const body = await req.json().catch(() => ({}));

    const rawCode = body?.code;
    const discountType: CouponDiscountType = body?.discountType;
    const rawDiscountValue = body?.discountValue;
    const startsAt = body?.startsAt ? new Date(body.startsAt).toISOString() : null;
    const expiresAt = body?.expiresAt ? new Date(body.expiresAt).toISOString() : null;
    const maxRedemptions =
      body?.maxRedemptions !== undefined && body?.maxRedemptions !== null && body?.maxRedemptions !== ''
        ? parseInt(body.maxRedemptions, 10)
        : null;
    const maxRedemptionsPerUser =
      body?.maxRedemptionsPerUser !== undefined && body?.maxRedemptionsPerUser !== null
        ? Math.max(1, parseInt(body.maxRedemptionsPerUser, 10))
        : 1;
    const active = body?.active !== undefined ? Boolean(body.active) : true;

    // 1. Code normalization & format validation
    const code = normalizeCouponCode(rawCode);
    if (!code || !isValidCouponCodeFormat(code)) {
      return NextResponse.json(
        { error: 'Coupon code must be 2-30 characters with only letters, numbers, hyphens, and underscores.' },
        { status: 400 }
      );
    }

    // 2. Discount type validation
    if (!['percent', 'fixed_usdt'].includes(discountType)) {
      return NextResponse.json(
        { error: "Discount type must be 'percent' or 'fixed_usdt'." },
        { status: 400 }
      );
    }

    // 3. Discount calculation & range validation
    const calculation = calculateCouponDiscount(discountType, rawDiscountValue);
    if (!calculation.valid) {
      return NextResponse.json(
        { error: calculation.error || 'Invalid discount configuration.' },
        { status: 400 }
      );
    }

    // 4. Date validation
    if (startsAt && expiresAt && new Date(startsAt) >= new Date(expiresAt)) {
      return NextResponse.json(
        { error: 'Expiration date must be strictly after the start date.' },
        { status: 400 }
      );
    }

    // 5. Max redemptions validation
    if (maxRedemptions !== null && (isNaN(maxRedemptions) || maxRedemptions <= 0)) {
      return NextResponse.json(
        { error: 'Max redemptions must be a positive integer or left empty for unlimited.' },
        { status: 400 }
      );
    }

    const admin = createAdminSupabaseClient();

    // 6. Duplicate code protection
    const { data: existingCoupon } = await admin
      .from('coupons')
      .select('id')
      .eq('code', code)
      .single();

    if (existingCoupon) {
      return NextResponse.json(
        { error: `Coupon code '${code}' already exists. Coupon codes must be unique.` },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();

    // 7. Insert coupon
    const { data: newCoupon, error: insertError } = await admin
      .from('coupons')
      .insert({
        code,
        discount_type: discountType,
        discount_value: calculation.discountValue,
        active,
        starts_at: startsAt,
        expires_at: expiresAt,
        max_redemptions: maxRedemptions,
        max_redemptions_per_user: maxRedemptionsPerUser,
        redemption_count: 0,
        created_by: adminProfile.id,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('*')
      .single();

    if (insertError || !newCoupon) {
      return NextResponse.json(
        { error: insertError?.message || 'Failed to create coupon.' },
        { status: 500 }
      );
    }

    // 8. Write audit log
    await logAdminAction({
      adminUserId: adminProfile.id,
      action: 'coupon_created',
      targetCouponId: newCoupon.id,
      metadata: {
        code: newCoupon.code,
        discountType: newCoupon.discount_type,
        discountValue: newCoupon.discount_value,
        maxRedemptions: newCoupon.max_redemptions,
        expiresAt: newCoupon.expires_at,
        adminEmail: adminProfile.email,
      },
    });

    return NextResponse.json({
      success: true,
      coupon: newCoupon,
      message: `Coupon ${newCoupon.code} created successfully.`,
    });
  } catch (err: any) {
    const s = err.statusCode || 500;
    return NextResponse.json(
      { error: err.message || 'Error creating coupon' },
      { status: s }
    );
  }
}
