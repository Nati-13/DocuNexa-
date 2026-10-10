'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Tag,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  X,
  AlertTriangle,
  Power,
  Edit2,
  Sparkles,
} from 'lucide-react';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Modal State for New Coupon
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed_usdt'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [maxRedemptionsPerUser, setMaxRedemptionsPerUser] = useState('1');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleGenerateRandomCode = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const array = new Uint8Array(6);
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < 6; i++) array[i] = Math.floor(Math.random() * 256);
    }
    let codeStr = '';
    for (let i = 0; i < 6; i++) {
      codeStr += chars[array[i] % chars.length];
    }
    setCode(`DOCU-${codeStr}`);
  };

  // Edit / Toggle State
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (activeFilter === 'active') params.set('active', 'true');
      if (activeFilter === 'inactive') params.set('active', 'false');

      const res = await fetch(`/api/admin/coupons?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load coupons');
      const data = await res.json();
      setCoupons(data.coupons || []);
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  }, [search, activeFilter]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          discountType,
          discountValue: discountValue.trim(),
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          maxRedemptions: maxRedemptions.trim() ? parseInt(maxRedemptions, 10) : null,
          maxRedemptionsPerUser: parseInt(maxRedemptionsPerUser, 10) || 1,
          active: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create coupon');

      setCreateModalOpen(false);
      setCode('');
      setDiscountValue('');
      setStartsAt('');
      setExpiresAt('');
      setMaxRedemptions('');
      fetchCoupons();
    } catch (err: any) {
      setCreateError(err.message || 'Error creating coupon');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleActive = async (coupon: any) => {
    setActionLoadingId(coupon.id);
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !coupon.active }),
      });
      if (res.ok) {
        fetchCoupons();
      }
    } catch {
      // Error
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Coupon Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create promotional codes, configure percentage or fixed USDT discounts, and inspect usage.
          </p>
        </div>

        <button
          onClick={() => {
            setCreateModalOpen(true);
            setCreateError(null);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus size={15} /> Create Coupon
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search coupon code..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase font-mono"
          />
        </div>

        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">All Coupons</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Coupons Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center space-y-2">
            <Loader2 className="animate-spin text-brand-500 mx-auto" size={24} />
            <p className="text-xs text-slate-400">Loading coupons...</p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No coupons found. Click &quot;Create Coupon&quot; to configure your first discount code.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold">
                <tr>
                  <th className="py-3 px-4">Coupon Code</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Payable on $2.00</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Redemptions</th>
                  <th className="py-3 px-4">Per User</th>
                  <th className="py-3 px-4">Expires</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {coupons.map((c) => {
                  const isPercent = c.discount_type === 'percent';
                  const discountFormatted = isPercent
                    ? `${Number(c.discount_value).toFixed(0)}%`
                    : `${Number(c.discount_value).toFixed(2)} USDT`;

                  const payableCalculated = isPercent
                    ? (2 * (1 - Number(c.discount_value) / 100)).toFixed(2)
                    : (2 - Number(c.discount_value)).toFixed(2);

                  const isExpired = c.expires_at && new Date() >= new Date(c.expires_at);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-950/60 border border-brand-200/60 dark:border-brand-900/60 text-brand-700 dark:text-brand-300 font-mono font-bold text-xs">
                          <Tag size={12} /> {c.code}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 capitalize">
                        {isPercent ? 'Percentage' : 'Fixed USDT'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {discountFormatted} off
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                        ${payableCalculated} USD
                      </td>
                      <td className="py-3 px-4">
                        {c.active && !isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                            <CheckCircle2 size={10} /> Active
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold text-[10px]">
                            <Clock size={10} /> Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-semibold text-[10px]">
                            <XCircle size={10} /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className="font-bold text-slate-900 dark:text-white">{c.redemption_count}</span>
                        <span className="text-slate-400"> / {c.max_redemptions ?? '∞'}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {c.max_redemptions_per_user || 1}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          disabled={actionLoadingId === c.id}
                          onClick={() => handleToggleActive(c)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                            c.active
                              ? 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 hover:bg-rose-100'
                              : 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 hover:bg-emerald-100'
                          }`}
                        >
                          {actionLoadingId === c.id ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <Power size={11} />
                          )}
                          {c.active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Coupon Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600">
                <Tag size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Coupon</h3>
                <p className="text-xs text-slate-500">Configure discount code for Ad-Free ($2.00 USD).</p>
              </div>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4 pt-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">
                      Coupon Code (Uppercase)
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateRandomCode}
                      className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles size={11} /> Generate Random
                    </button>
                  </div>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                    placeholder="e.g. DOCU-8K2N9X"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Discount Type
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="percent">Percentage Discount (%)</option>
                    <option value="fixed_usdt">Fixed USDT Discount ($)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    {discountType === 'percent' ? 'Discount Percentage (1–99)' : 'Discount Amount (0.01–1.99 USDT)'}
                  </label>
                  <input
                    type="number"
                    step={discountType === 'percent' ? '1' : '0.01'}
                    min={discountType === 'percent' ? '1' : '0.01'}
                    max={discountType === 'percent' ? '99' : '1.99'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'percent' ? '25' : '0.50'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400">
                    {discountType === 'percent'
                      ? 'e.g. 25 reduces $2.00 to $1.50'
                      : 'e.g. 0.50 reduces $2.00 to $1.50'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Per-User Redemption Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxRedemptionsPerUser}
                    onChange={(e) => setMaxRedemptionsPerUser(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400">Default: 1 use per account.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Total Redemptions Cap (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxRedemptions}
                    onChange={(e) => setMaxRedemptions(e.target.value)}
                    placeholder="Leave blank for unlimited"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Expiration Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {createError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs">
                  {createError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !code.trim() || !discountValue.trim()}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {createLoading ? <Loader2 size={13} className="animate-spin" /> : null}
                  Create Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
