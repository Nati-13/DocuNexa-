'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  KeyRound,
  Ban,
  RotateCcw,
  CreditCard,
  Tag,
  Clock,
  History,
  Check,
  Copy,
} from 'lucide-react';
import { formatPaymentAmount } from '@/lib/payments/format';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // User Detail Drawer State
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Modal State for Actions: 'grant' | 'revoke' | 'suspend' | 'restore' | 'recover_pwd'
  const [modalUser, setModalUser] = useState<any | null>(null);
  const [modalAction, setModalAction] = useState<
    'grant' | 'revoke' | 'suspend' | 'restore' | 'recover_pwd'
  >('grant');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (search.trim()) params.set('search', search.trim());
      if (planFilter !== 'all') params.set('plan', planFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(data.users || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  }, [page, search, planFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Open Details Modal and fetch comprehensive record
  const handleOpenDetail = async (userId: string) => {
    setDetailUserId(userId);
    setDetailLoading(true);
    setDetailError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (!res.ok) throw new Error('Failed to load user details');
      const data = await res.json();
      setDetailData(data);
    } catch (err: any) {
      setDetailError(err.message || 'Error loading user details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenActionModal = (
    user: any,
    action: 'grant' | 'revoke' | 'suspend' | 'restore' | 'recover_pwd'
  ) => {
    setModalUser(user);
    setModalAction(action);
    setReason('');
    setConfirmed(false);
    setActionError(null);
    setActionSuccess(null);
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalUser || !confirmed) return;

    // Reason required for grant, revoke, suspend, restore
    if (modalAction !== 'recover_pwd' && reason.trim().length < 5) {
      setActionError('A justification of at least 5 characters is required.');
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      let endpoint = '';
      let body: any = { confirm: true };

      if (modalAction === 'grant') {
        endpoint = `/api/admin/users/${modalUser.id}/grant-ad-free`;
        body.reason = reason.trim();
      } else if (modalAction === 'revoke') {
        endpoint = `/api/admin/users/${modalUser.id}/revoke-ad-free`;
        body.reason = reason.trim();
      } else if (modalAction === 'suspend' || modalAction === 'restore') {
        endpoint = `/api/admin/users/${modalUser.id}/status`;
        body.action = modalAction;
        body.reason = reason.trim();
      } else if (modalAction === 'recover_pwd') {
        endpoint = `/api/admin/users/${modalUser.id}/recover-password`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to execute administrative action');

      setActionSuccess(data.message || 'Action executed successfully.');
      setTimeout(() => {
        setModalUser(null);
        fetchUsers();
        if (detailUserId === modalUser.id) {
          handleOpenDetail(modalUser.id);
        }
      }, 1200);
    } catch (err: any) {
      setActionError(err.message || 'Error executing action');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Title & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            User Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Authoritative user records, activity history, account suspension, and password recovery.
          </p>
        </div>
        <div className="text-xs text-slate-500">
          Showing <strong className="text-slate-900 dark:text-white">{users.length}</strong> of{' '}
          <strong className="text-slate-900 dark:text-white">{totalCount}</strong> registered users
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search users by email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Plans</option>
            <option value="free">FREE Plan</option>
            <option value="ad_free">AD-FREE Plan</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center space-y-2">
            <Loader2 className="animate-spin text-brand-500 mx-auto" size={24} />
            <p className="text-xs text-slate-400">Loading user records...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No users found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold">
                <tr>
                  <th className="py-3 px-4">User Email / ID</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Entitlement</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {users.map((u) => {
                  const isAdFree = u.plan === 'ad_free';
                  const isSuspended = u.status === 'suspended';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 dark:text-white">{u.email}</div>
                        <div className="font-mono text-[10px] text-slate-400 truncate max-w-[140px]">
                          {u.id}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {isAdFree ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                            <CheckCircle2 size={10} /> AD-FREE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[10px]">
                            FREE
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {u.entitlementExpiry}
                      </td>
                      <td className="py-3 px-4">
                        {isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 font-bold text-[10px]">
                            <Ban size={10} /> Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-medium text-[10px]">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                        <button
                          onClick={() => handleOpenDetail(u.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                          title="View complete user details"
                        >
                          <Eye size={12} /> View
                        </button>

                        <button
                          onClick={() => handleOpenActionModal(u, 'recover_pwd')}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-[11px] font-medium transition-colors cursor-pointer"
                          title="Send secure password recovery email"
                        >
                          <KeyRound size={12} /> Reset
                        </button>

                        {isSuspended ? (
                          <button
                            onClick={() => handleOpenActionModal(u, 'restore')}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-[11px] font-medium transition-colors cursor-pointer"
                            title="Restore account"
                          >
                            <RotateCcw size={12} /> Restore
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenActionModal(u, 'suspend')}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-[11px] font-medium transition-colors cursor-pointer"
                            title="Suspend account"
                          >
                            <Ban size={12} /> Suspend
                          </button>
                        )}

                        {isAdFree ? (
                          <button
                            onClick={() => handleOpenActionModal(u, 'revoke')}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-[11px] font-medium transition-colors cursor-pointer"
                            title="Revoke Ad-Free entitlement"
                          >
                            <ShieldAlert size={12} /> Revoke
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenActionModal(u, 'grant')}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-[11px] font-medium transition-colors cursor-pointer"
                            title="Grant Ad-Free entitlement"
                          >
                            <ShieldCheck size={12} /> Grant
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-slate-200 dark:border-slate-800 text-xs">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <ChevronLeft size={13} /> Previous
            </button>
            <span className="text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>

      {/* User Detail Drawer / Modal */}
      {detailUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-brand-600 dark:text-brand-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  User Account Dossier
                </h3>
              </div>
              <button
                onClick={() => setDetailUserId(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-12 text-center space-y-2">
                <Loader2 className="animate-spin text-brand-500 mx-auto" size={24} />
                <p className="text-xs text-slate-400">Loading dossier details...</p>
              </div>
            ) : detailError || !detailData ? (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 text-xs">
                {detailError || 'Failed to load details'}
              </div>
            ) : (
              <div className="space-y-6 text-xs">
                {/* User Identity Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {detailData.user.email}
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400 mt-0.5">
                        <span>ID: {detailData.user.id}</span>
                        <button
                          onClick={() => copyToClipboard(detailData.user.id)}
                          className="text-slate-500 hover:text-white"
                          title="Copy UUID"
                        >
                          {copiedId ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      {detailData.user.isSuspended ? (
                        <span className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 font-bold text-[10px]">
                          SUSPENDED
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 font-bold text-[10px]">
                          ACTIVE
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/60 text-[11px]">
                    <div>
                      <span className="text-slate-400">Current Plan:</span>
                      <div className="font-semibold text-slate-900 dark:text-white uppercase mt-0.5">
                        {detailData.user.plan}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Entitlement:</span>
                      <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                        {detailData.user.entitlementExpiry}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Registered:</span>
                      <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                        {new Date(detailData.user.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Last Sign-in:</span>
                      <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                        {detailData.user.auth?.lastSignInAt
                          ? new Date(detailData.user.auth.lastSignInAt).toLocaleString()
                          : 'Never'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment History Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <CreditCard size={14} className="text-purple-500" />
                    <span>Payment Orders History ({detailData.payments.length})</span>
                  </div>

                  {detailData.payments.length === 0 ? (
                    <p className="text-slate-400 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl text-center">
                      No payment orders on record.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      {detailData.payments.map((p: any) => (
                        <div key={p.id} className="p-3 flex items-center justify-between">
                          <div>
                            <div className="font-mono font-bold text-slate-900 dark:text-white">
                              {p.order_id}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(p.created_at).toLocaleString()} • {p.network} ({p.currency})
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {formatPaymentAmount(p.payment_amount_usdt)} USDT
                            </span>
                            <div>
                              <span
                                className={`text-[10px] font-bold uppercase ${
                                  p.status === 'confirmed'
                                    ? 'text-emerald-500'
                                    : p.status === 'pending'
                                    ? 'text-amber-500'
                                    : 'text-slate-400'
                                }`}
                              >
                                {p.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Audit & Administrative Events */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <History size={14} className="text-brand-500" />
                    <span>Administrative Audit History ({detailData.auditEvents.length})</span>
                  </div>

                  {detailData.auditEvents.length === 0 ? (
                    <p className="text-slate-400 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl text-center">
                      No admin modifications logged for this account.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      {detailData.auditEvents.map((a: any) => (
                        <div key={a.id} className="p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-semibold text-brand-600 dark:text-brand-400">
                              {a.action}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(a.created_at).toLocaleString()}
                            </span>
                          </div>
                          {a.reason && (
                            <p className="text-[11px] text-slate-500 mt-1 italic">
                              Reason: &quot;{a.reason}&quot;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      {modalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {modalAction === 'suspend' || modalAction === 'revoke' ? (
                  <AlertTriangle className="text-rose-500" size={20} />
                ) : modalAction === 'recover_pwd' ? (
                  <KeyRound className="text-indigo-500" size={20} />
                ) : (
                  <CheckCircle2 className="text-emerald-500" size={20} />
                )}
                <h3 className="text-base font-bold text-slate-900 dark:text-white capitalize">
                  {modalAction === 'grant' && 'Grant Ad-Free Entitlement'}
                  {modalAction === 'revoke' && 'Revoke Ad-Free Entitlement'}
                  {modalAction === 'suspend' && 'Suspend User Account'}
                  {modalAction === 'restore' && 'Restore User Account'}
                  {modalAction === 'recover_pwd' && 'Send Password Recovery Email'}
                </h3>
              </div>
              <button
                onClick={() => setModalUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Target User: <strong className="text-slate-900 dark:text-white">{modalUser.email}</strong>
            </p>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600 dark:text-rose-400">
                {actionError}
              </div>
            )}

            {actionSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-600 dark:text-emerald-400">
                {actionSuccess}
              </div>
            )}

            <form onSubmit={handleExecuteAction} className="space-y-4 pt-2">
              {modalAction !== 'recover_pwd' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Documented Justification (Audit Log) *
                  </label>
                  <textarea
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder="Enter reason for this action (min 5 characters)..."
                    className="w-full p-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}

              {modalAction === 'recover_pwd' && (
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-[11px] text-indigo-700 dark:text-indigo-300">
                  This will dispatch a cryptographically secure password reset link to the user&apos;s registered email address. Plaintext passwords are never revealed or stored.
                </div>
              )}

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
                <span className="text-[11px] text-slate-600 dark:text-slate-300">
                  I understand this action modifies account state and creates an immutable administrative audit record.
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalUser(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!confirmed || actionLoading || (modalAction !== 'recover_pwd' && reason.trim().length < 5)}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white shadow-xs disabled:opacity-50 cursor-pointer ${
                    modalAction === 'suspend' || modalAction === 'revoke'
                      ? 'bg-rose-600 hover:bg-rose-500'
                      : modalAction === 'recover_pwd'
                      ? 'bg-indigo-600 hover:bg-indigo-500'
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {actionLoading ? <Loader2 size={13} className="animate-spin" /> : null}
                  Confirm & Execute
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
