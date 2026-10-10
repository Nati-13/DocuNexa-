'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  LifeBuoy,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  X,
  MessageSquare,
  Mail,
  User,
  Tag,
  Calendar,
  Send,
  ExternalLink,
} from 'lucide-react';
import { TELEGRAM_BOT_URL } from '@/lib/telegram/constants';

export default function AdminSupportInboxPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Selected ticket for modal
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string>('open');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);

      const res = await fetch(`/api/admin/support?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load tickets');
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleOpenTicket = (t: any) => {
    setSelectedTicket(t);
    setUpdateStatus(t.status || 'open');
    setAdminNotes(t.admin_notes || '');
    setActionSuccess(null);
  };

  const handleSaveTicket = async () => {
    if (!selectedTicket) return;
    setUpdating(true);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/admin/support/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: updateStatus,
          adminNotes: adminNotes.trim() || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to update ticket');

      setActionSuccess('Ticket updated successfully.');
      fetchTickets();
      setTimeout(() => {
        setSelectedTicket(null);
      }, 1000);
    } catch {
      // Error
    } finally {
      setUpdating(false);
    }
  };

  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <LifeBuoy className="text-brand-500" /> Support Inbox
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review user inquiries, textbook issues, coupon questions, and customer support tickets.
          </p>
        </div>

        <a
          href={TELEGRAM_BOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 font-bold text-xs hover:bg-sky-500/20 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Send size={13} className="rotate-45" /> Telegram Bot: @docunexa_bot <ExternalLink size={12} />
        </a>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-500">
            Open Requests
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">{openCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">
            In Progress
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">{inProgressCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">
            Resolved / Closed
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">{resolvedCount}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets by subject, email, or name..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">All Categories</option>
          <option value="Account">Account</option>
          <option value="Payments">Payments</option>
          <option value="PDF Tools">PDF Tools</option>
          <option value="Coupon">Coupon</option>
          <option value="Bug Report">Bug Report</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Tickets Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center space-y-2">
            <Loader2 className="animate-spin text-brand-500 mx-auto" size={24} />
            <p className="text-xs text-slate-400">Loading support tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No support tickets found matching the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold">
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Submitter</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {tickets.map((t) => {
                  const isOpen = t.status === 'open';
                  const isInProgress = t.status === 'in_progress';
                  const isResolved = t.status === 'resolved' || t.status === 'closed';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        {isOpen ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
                            <AlertCircle size={10} /> Open
                          </span>
                        ) : isInProgress ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                            <Clock size={10} /> In Progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                            <CheckCircle2 size={10} /> Resolved
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                          {t.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{t.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{t.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate font-medium text-slate-900 dark:text-white">
                        {t.subject}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenTicket(t)}
                          className="px-3 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200/60 dark:border-brand-900/60 text-brand-700 dark:text-brand-300 font-bold text-[11px] hover:bg-brand-100 transition-colors cursor-pointer"
                        >
                          Review Ticket
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

      {/* Review Ticket Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedTicket(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-mono text-[10px] font-bold">
                Ticket #{selectedTicket.id?.slice(0, 12)}
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {selectedTicket.subject}
              </h3>
            </div>

            {/* Submitter Info */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Submitter</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedTicket.name}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Email</span>
                <a href={`mailto:${selectedTicket.email}`} className="font-mono text-brand-600 dark:text-brand-400 hover:underline">
                  {selectedTicket.email}
                </a>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Category</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedTicket.category}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Submitted</span>
                <span className="text-slate-600 dark:text-slate-300">
                  {new Date(selectedTicket.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Message Content */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                User Message:
              </span>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {selectedTicket.message}
              </div>
            </div>

            {/* Status & Admin Notes */}
            <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Update Ticket Status:
                </label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Internal Admin Notes (Optional):
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Notes about resolutions, email replies sent, or bug tickets opened..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {actionSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={14} /> {actionSuccess}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <a
                  href={`mailto:${selectedTicket.email}?subject=Re: ${encodeURIComponent(selectedTicket.subject)}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold transition-colors cursor-pointer"
                >
                  <Mail size={13} /> Reply via Email
                </a>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 font-medium cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={handleSaveTicket}
                    className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {updating ? <Loader2 size={13} className="animate-spin" /> : null}
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
