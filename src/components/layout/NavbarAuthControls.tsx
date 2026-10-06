'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { User, LogOut, CheckCircle2, ChevronDown, Sparkles, ShieldCheck } from 'lucide-react';

export const NavbarAuthControls: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetch('/api/admin/check-access')
        .then((res) => res.json())
        .then((data) => {
          if (data?.isAdmin) setIsAdmin(true);
        })
        .catch(() => {});
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return <div className="w-16 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse hidden sm:block" />;
  }

  if (!user) {
    return (
      <div className="hidden sm:flex items-center gap-1.5">
        <Link
          href="/login"
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 transition-colors"
        >
          Sign up
        </Link>
      </div>
    );
  }

  const isAdFree = user.plan === 'ad_free';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200/70 dark:border-slate-700/70 text-xs font-semibold transition-all cursor-pointer"
        aria-label="Account menu"
      >
        <div className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold">
          {user.email.charAt(0).toUpperCase()}
        </div>

        <span className="hidden md:inline max-w-[100px] truncate text-slate-800 dark:text-slate-200">
          {user.email.split('@')[0]}
        </span>

        {isAdFree ? (
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold flex items-center gap-0.5">
            <CheckCircle2 size={10} /> Ad-Free
          </span>
        ) : (
          <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
            Free
          </span>
        )}

        <ChevronDown size={13} className={`text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <p className="font-semibold text-slate-900 dark:text-white truncate">
              {user.email}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Plan:{' '}
              <strong className={isAdFree ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}>
                {isAdFree ? 'AD-FREE' : 'FREE'}
              </strong>
            </p>
          </div>

          <div className="py-1">
            <Link
              href="/account"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
            >
              <User size={14} className="text-slate-400" />
              <span>Account & Plan</span>
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 font-semibold transition-colors"
              >
                <ShieldCheck size={14} className="text-purple-500" />
                <span>Admin Panel</span>
              </Link>
            )}

            {!isAdFree && (
              <Link
                href="/account"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 font-semibold transition-colors"
              >
                <Sparkles size={14} className="text-brand-500" />
                <span>Remove Ads — $2</span>
              </Link>
            )}
          </div>

          <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => {
                setDropdownOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
