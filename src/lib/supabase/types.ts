export type UserPlan = 'free' | 'ad_free';

export type Profile = {
  id: string; // uuid
  email: string;
  plan: UserPlan;
  created_at: string;
  updated_at: string;
};

export type PaymentOrderStatus =
  | 'pending'
  | 'detected'
  | 'confirmed'
  | 'expired'
  | 'amount_mismatch'
  | 'late_payment'
  | 'cancelled';

export type CouponDiscountType = 'percent' | 'fixed_usdt';

export type DbPaymentOrder = {
  id: string; // uuid
  user_id: string; // uuid
  order_id: string;
  product: 'ad_free';
  base_amount_usd: number | string;
  payment_amount_usdt: number | string;
  currency: 'USDT';
  network: 'Polygon';
  destination_address: string;
  status: PaymentOrderStatus;
  expires_at: string;
  created_at: string;
  detected_at: string | null;
  confirmed_at: string | null;
  bybit_deposit_id: string | null;
  tx_id: string | null;
  block_hash: string | null;
  confirmations: number | null;
  received_amount: number | string | null;
  failure_reason: string | null;
  updated_at: string;
  coupon_id?: string | null;
  coupon_code?: string | null;
  discount_type?: CouponDiscountType | null;
  discount_amount_usdt?: number | string;
  original_amount_usd?: number | string;
  final_amount_usdt?: number | string;
};

export type DbCoupon = {
  id: string; // uuid
  code: string;
  discount_type: CouponDiscountType;
  discount_value: number | string;
  active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  max_redemptions: number | null;
  max_redemptions_per_user: number;
  redemption_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DbCouponRedemption = {
  id: string; // uuid
  coupon_id: string;
  user_id: string;
  payment_order_id: string;
  discount_amount_usdt: number | string;
  redeemed_at: string;
};

export type DbAdminUser = {
  user_id: string;
  created_at: string;
};

export type DbAdminAuditLog = {
  id: string; // uuid
  admin_user_id: string | null;
  action: string;
  target_user_id: string | null;
  target_payment_id: string | null;
  target_coupon_id: string | null;
  metadata: Json;
  reason: string | null;
  created_at: string;
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          email: string;
          plan?: UserPlan;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          plan?: UserPlan;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_orders: {
        Row: DbPaymentOrder;
        Insert: {
          id?: string;
          user_id: string;
          order_id: string;
          product?: 'ad_free';
          base_amount_usd?: number | string;
          payment_amount_usdt: number | string;
          currency?: 'USDT';
          network?: 'Polygon';
          destination_address: string;
          status?: PaymentOrderStatus;
          expires_at: string;
          created_at?: string;
          detected_at?: string | null;
          confirmed_at?: string | null;
          bybit_deposit_id?: string | null;
          tx_id?: string | null;
          block_hash?: string | null;
          confirmations?: number | null;
          received_amount?: number | string | null;
          failure_reason?: string | null;
          updated_at?: string;
          coupon_id?: string | null;
          coupon_code?: string | null;
          discount_type?: CouponDiscountType | null;
          discount_amount_usdt?: number | string;
          original_amount_usd?: number | string;
          final_amount_usdt?: number | string;
        };
        Update: {
          id?: string;
          user_id?: string;
          order_id?: string;
          product?: 'ad_free';
          base_amount_usd?: number | string;
          payment_amount_usdt?: number | string;
          currency?: 'USDT';
          network?: 'Polygon';
          destination_address?: string;
          status?: PaymentOrderStatus;
          expires_at?: string;
          created_at?: string;
          detected_at?: string | null;
          confirmed_at?: string | null;
          bybit_deposit_id?: string | null;
          tx_id?: string | null;
          block_hash?: string | null;
          confirmations?: number | null;
          received_amount?: number | string | null;
          failure_reason?: string | null;
          updated_at?: string;
          coupon_id?: string | null;
          coupon_code?: string | null;
          discount_type?: CouponDiscountType | null;
          discount_amount_usdt?: number | string;
          original_amount_usd?: number | string;
          final_amount_usdt?: number | string;
        };
        Relationships: [];
      };
      coupons: {
        Row: DbCoupon;
        Insert: {
          id?: string;
          code: string;
          discount_type: CouponDiscountType;
          discount_value: number | string;
          active?: boolean;
          starts_at?: string | null;
          expires_at?: string | null;
          max_redemptions?: number | null;
          max_redemptions_per_user?: number;
          redemption_count?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          discount_type?: CouponDiscountType;
          discount_value?: number | string;
          active?: boolean;
          starts_at?: string | null;
          expires_at?: string | null;
          max_redemptions?: number | null;
          max_redemptions_per_user?: number;
          redemption_count?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      coupon_redemptions: {
        Row: DbCouponRedemption;
        Insert: {
          id?: string;
          coupon_id: string;
          user_id: string;
          payment_order_id: string;
          discount_amount_usdt: number | string;
          redeemed_at?: string;
        };
        Update: {
          id?: string;
          coupon_id?: string;
          user_id?: string;
          payment_order_id?: string;
          discount_amount_usdt?: number | string;
          redeemed_at?: string;
        };
        Relationships: [];
      };
      admin_users: {
        Row: DbAdminUser;
        Insert: {
          user_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      admin_audit_logs: {
        Row: DbAdminAuditLog;
        Insert: {
          id?: string;
          admin_user_id?: string | null;
          action: string;
          target_user_id?: string | null;
          target_payment_id?: string | null;
          target_coupon_id?: string | null;
          metadata?: Json;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_user_id?: string | null;
          action?: string;
          target_user_id?: string | null;
          target_payment_id?: string | null;
          target_coupon_id?: string | null;
          metadata?: Json;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      password_resets: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          code_hash: string;
          expires_at: string;
          attempts: number;
          max_attempts: number;
          used_at: string | null;
          created_at: string;
          request_ip_hash: string | null;
          verification_token_hash: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          code_hash: string;
          expires_at: string;
          attempts?: number;
          max_attempts?: number;
          used_at?: string | null;
          created_at?: string;
          request_ip_hash?: string | null;
          verification_token_hash?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          code_hash?: string;
          expires_at?: string;
          attempts?: number;
          max_attempts?: number;
          used_at?: string | null;
          created_at?: string;
          request_ip_hash?: string | null;
          verification_token_hash?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      confirm_payment_order: {
        Args: {
          p_order_id: string;
          p_bybit_deposit_id: string;
          p_tx_id: string;
          p_block_hash?: string | null;
          p_confirmations?: number | null;
          p_received_amount?: number | string | null;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
