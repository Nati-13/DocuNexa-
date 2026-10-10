'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Scissors,
  Tag,
  CreditCard,
  HelpCircle,
  LifeBuoy,
} from 'lucide-react';
import { SUPPORT_CATEGORIES } from '@/lib/support/constants';
import { TELEGRAM_BOT_HANDLE, TELEGRAM_BOT_URL } from '@/lib/telegram/bot';

export function SupportClient() {
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<string>('PDF Tools');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<{ ticketId: string; message: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pre-fill user email if authenticated
  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessResult(null);

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          category,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit support request');
      }

      setSuccessResult({
        ticketId: data.ticketId || 'Recorded',
        message: data.message || 'Your support request has been submitted successfully.',
      });

      // Clear form
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Top Banner / Channel Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Telegram Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-sky-500/10 via-brand-500/5 to-slate-900/40 border-2 border-sky-500/30 dark:border-sky-500/20 shadow-lg flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-400 font-bold text-xs uppercase tracking-wider">
                <Send size={13} className="rotate-45" /> Telegram Support
              </div>
              <span className="text-[11px] font-mono font-bold text-sky-600 dark:text-sky-400">
                {TELEGRAM_BOT_HANDLE}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Instant Chat via Telegram
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Prefer direct messaging? Connect directly with our support bot on Telegram for answers about the PDF Unit Cutter, coupons, plan upgrades, and quick assistance.
            </p>

            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-sky-500 shrink-0" />
                <span>Instant automated answers for tools & FAQs</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-sky-500 shrink-0" />
                <span>Direct escalation for urgent account assistance</span>
              </li>
            </ul>
          </div>

          <div>
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-sky-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Open @docunexa_bot in Telegram</span>
              <ExternalLink size={15} />
            </a>
            <p className="text-[11px] text-center text-slate-400 mt-2">
              Opens the official @docunexa_bot Telegram client
            </p>
          </div>
        </div>

        {/* Website Ticket Card Intro */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-bold text-xs uppercase tracking-wider">
              <LifeBuoy size={13} /> Official Web Ticket
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              DocuNexa Support Form
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Have an issue with PDF extraction, payment verification, coupon redemption, or want to suggest a new tool? Submit a formal ticket below and we will investigate.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="text-brand-600 dark:text-brand-400 font-bold text-xs flex items-center gap-1">
                  <Scissors size={14} /> PDF Tools
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Unit cutter & conversion questions
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="text-brand-600 dark:text-brand-400 font-bold text-xs flex items-center gap-1">
                  <Tag size={14} /> Coupons & Billing
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Ad-Free crypto orders & discount codes
                </p>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
            <span>All inquiries are reviewed directly by the maintainer.</span>
          </div>
        </div>
      </div>

      {/* Main Support Form */}
      <div className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        <div className="space-y-1 pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare size={22} className="text-brand-500" /> Submit a Support Ticket
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Please provide as much detail as possible so we can assist you promptly.
          </p>
        </div>

        {/* Success Alert */}
        {successResult && (
          <div
            role="status"
            className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in"
          >
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">{successResult.message}</p>
              <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                Ticket Reference: #{successResult.ticketId}
              </p>
            </div>
          </div>
        )}

        {/* Failure Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 text-xs text-rose-600 dark:text-rose-400 animate-in fade-in"
          >
            <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label htmlFor="support-name" className="block font-semibold text-slate-700 dark:text-slate-300">
                Your Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="support-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Taylor"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="support-email" className="block font-semibold text-slate-700 dark:text-slate-300">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                id="support-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-1.5">
              <label htmlFor="support-category" className="block font-semibold text-slate-700 dark:text-slate-300">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                id="support-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {SUPPORT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label htmlFor="support-subject" className="block font-semibold text-slate-700 dark:text-slate-300">
                Subject <span className="text-rose-500">*</span>
              </label>
              <input
                id="support-subject"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your question or issue"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <label htmlFor="support-message" className="block font-semibold text-slate-700 dark:text-slate-300">
              Message <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="support-message"
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what happened, error messages, textbook format details, or coupon code..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[11px] text-slate-400">
              Or chat via Telegram: <a href={TELEGRAM_BOT_URL} target="_blank" rel="noopener noreferrer" className="text-sky-600 dark:text-sky-400 font-bold hover:underline">@docunexa_bot</a>
            </div>

            <button
              type="submit"
              disabled={submitting || !name || !email || !subject || !message}
              className="py-3 px-6 rounded-xl bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Send size={16} /> Submit Ticket
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Frequently Asked Questions */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <HelpCircle size={18} className="text-brand-500" /> Frequently Asked Questions
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Quick solutions to common questions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white">
              Why was only part of my textbook detected in PDF Unit Cutter?
            </h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              PDF Unit Cutter searches for Table of Contents bookmarks, roman-numeral headers, and unit titles. If a textbook uses non-standard chapter naming, you can manually adjust start and end page boundaries directly in the interface.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white">
              How do 100% coupon codes work?
            </h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              When entering a valid 100% discount coupon (e.g. DOCUNEXA100well), your final total is reduced to $0.00. No cryptocurrency payment is required, and Ad-Free status is activated instantly upon server verification.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white">
              Are my uploaded PDFs stored on your servers?
            </h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              No. DocuNexa uses client-side WebAssembly and JavaScript engines. All splitting, cutting, compressing, and merging run locally inside your browser sandbox.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white">
              How long does payment confirmation take?
            </h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Polygon PoS deposits and Aptos transfers typically confirm in 15 to 90 seconds. Once detected, your account is upgraded to Ad-Free automatically without page refresh.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
