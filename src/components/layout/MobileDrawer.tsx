'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { X, ChevronDown, ChevronRight, Scissors, Sparkles, User, LogOut, CheckCircle2 } from 'lucide-react';
import { TOOL_CATEGORIES, ALL_TOOLS } from '@/config/tools';
import { DynamicIcon } from '@/components/common/DynamicIcon';
import { DocuNexaLogo } from '@/components/common/DocuNexaLogo';
import { ToolCategory } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  const [expandedCategory, setExpandedCategory] = useState<ToolCategory | null>('organize');

  if (!isOpen) return null;

  const toggleCategory = (cat: ToolCategory) => {
    setExpandedCategory(expandedCategory === cat ? null : cat);
  };

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-xs bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 border-r border-slate-200 dark:border-slate-800 animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <DocuNexaLogo size="sm" />
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Flagship Direct Button */}
          <Link
            href="/tools/pdf-unit-cutter"
            onClick={onClose}
            className="flex items-center gap-3 p-3 rounded-xl bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800/60 text-brand-700 dark:text-brand-300 font-semibold text-sm shadow-xs"
          >
            <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center shrink-0">
              <Scissors size={16} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span>PDF Unit Cutter</span>
                <span className="px-1.5 py-0.2 text-[9px] uppercase font-bold rounded bg-brand-600 text-white">
                  Flagship
                </span>
              </div>
              <p className="text-[11px] font-normal text-slate-700 dark:text-slate-200">
                Split textbooks into units
              </p>
            </div>
          </Link>

          {/* Direct Navigation Links */}
          <div className="space-y-1">
            <Link
              href="/tools"
              onClick={onClose}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              All 34 PDF Tools
            </Link>
            <Link
              href="/how-it-works"
              onClick={onClose}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              How It Works
            </Link>
            <Link
              href="/about"
              onClick={onClose}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              About DocuNexa
            </Link>
            <Link
              href="/privacy"
              onClick={onClose}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Privacy Policy
            </Link>
            <Link
              href="/security"
              onClick={onClose}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Security Architecture
            </Link>
            <Link
              href="/terms"
              onClick={onClose}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Terms of Service
            </Link>
            <Link
              href="/contact"
              onClick={onClose}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Contact Us
            </Link>
          </div>

          {/* Account / Membership Section */}
          <MobileDrawerAuth onClose={onClose} />

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <h4 className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Categories
            </h4>
            <div className="space-y-1">
              {TOOL_CATEGORIES.map((cat) => {
                const isExpanded = expandedCategory === cat.id;
                const categoryTools = ALL_TOOLS.filter((t) => t.category === cat.id);

                return (
                  <div key={cat.id} className="rounded-xl border border-slate-100 dark:border-slate-800/60 overflow-hidden">
                    <button
                      onClick={() => toggleCategory(cat.id)}
                      className="w-full flex items-center justify-between p-3 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <span>{cat.name}</span>
                      {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>

                    {isExpanded && (
                      <div className="p-2 pt-0 space-y-0.5 bg-slate-50/50 dark:bg-slate-900/40">
                        {categoryTools.map((tool) => (
                          <Link
                            key={tool.id}
                            href={`/tools/${tool.slug}`}
                            onClick={onClose}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:text-brand-600 dark:hover:text-brand-400 font-medium transition-colors"
                          >
                            <DynamicIcon name={tool.iconName} size={14} className="text-slate-500 shrink-0" />
                            <span className="truncate">{tool.name}</span>
                            {tool.badge && (
                              <span className="ml-auto px-1.5 py-0.2 text-[9px] font-bold rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {tool.badge}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-[11px] text-slate-600 dark:text-slate-300">
          <p className="font-semibold text-emerald-700 dark:text-emerald-300">✓ Client-Side Document Privacy</p>
          <p className="mt-0.5">Files are processed locally in your browser.</p>
        </div>
      </div>
    </div>
  );
};

const MobileDrawerAuth: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user, loading, logout } = useAuth();
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
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

  if (loading) return null;

  if (!user) {
    return (
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
        <h4 className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
          Account
        </h4>
        <div className="grid grid-cols-2 gap-2 px-3">
          <Link
            href="/login"
            onClick={onClose}
            className="flex items-center justify-center py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-center"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            onClick={onClose}
            className="flex items-center justify-center py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold text-center shadow-xs"
          >
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  const isAdFree = user.plan === 'ad_free';

  return (
    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2 px-3">
      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-xs text-slate-900 dark:text-white truncate max-w-[140px]">
            {user.email}
          </span>
          {isAdFree ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-0.5">
              <CheckCircle2 size={10} /> Ad-Free
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
              Free
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Link
            href="/account"
            onClick={onClose}
            className="flex-1 py-1.5 px-2.5 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold text-center border border-slate-200 dark:border-slate-600 hover:bg-slate-100 transition-colors"
          >
            Account
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              onClick={onClose}
              className="py-1.5 px-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-semibold text-center border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors"
            >
              Admin
            </Link>
          )}
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="py-1.5 px-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <LogOut size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

