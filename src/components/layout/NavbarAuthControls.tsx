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
    return <div className="w-16 h-8 rounded-lg bg-paper animate-pulse hidden sm:block" />;
  }

  if (!user) {
    return (
      <div className="hidden sm:flex items-center gap-1.5">
        <Link
          href="/login"
          className="px-2.5 py-1.5 rounded-md text-xs font-semibold text-ink hover:text-brand hover:bg-paper transition-colors"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="px-3 py-1.5 rounded-md text-xs font-semibold bg-brand hover:bg-brand/90 text-brand-fg transition-all shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 active:scale-95"
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
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-paper hover:bg-surface border border-border text-xs font-semibold transition-all cursor-pointer"
        aria-label="Account menu"
      >
        <div className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold">
          {user.email.charAt(0).toUpperCase()}
        </div>

        <span className="hidden md:inline max-w-[100px] truncate text-ink">
          {user.email.split('@')[0]}
        </span>

        {isAdFree ? (
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold flex items-center gap-0.5">
            <CheckCircle2 size={10} /> Ad-Free
          </span>
        ) : (
          <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-ink text-[10px] font-bold">
            Free
          </span>
        )}

        <ChevronDown size={13} className={`text-muted transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md bg-surface border border-border shadow-subtle p-2 z-50 animate-in fade-in slide-in- duration-150 text-xs">
          <div className="p-2 border-b border-border">
            <p className="font-semibold text-ink truncate">
              {user.email}
            </p>
            <p className="text-[11px] text-muted mt-0.5">
              Plan:{' '}
              <strong className={isAdFree ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink'}>
                {isAdFree ? 'AD-FREE' : 'FREE'}
              </strong>
            </p>
          </div>

          <div className="py-1">
            <Link
              href="/account"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-ink hover:bg-paper font-medium transition-colors"
            >
              <User size={14} className="text-muted" />
              <span>Account & Plan</span>
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-brand hover:bg-brand/10 font-semibold transition-colors"
              >
                <ShieldCheck size={14} className="text-brand" />
                <span>Admin Panel</span>
              </Link>
            )}

            {!isAdFree && (
              <Link
                href="/account"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-brand hover:bg-brand-50 dark:hover:bg-brand-950/40 font-semibold transition-colors"
              >
                <Sparkles size={14} className="text-brand" />
                <span>Remove Ads — $2</span>
              </Link>
            )}
          </div>

          <div className="pt-1 border-t border-border">
            <button
              onClick={() => {
                setDropdownOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium transition-colors cursor-pointer"
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
