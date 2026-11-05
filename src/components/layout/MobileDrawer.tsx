'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { X, ChevronDown, ChevronRight, Scissors, LogOut, CheckCircle2 } from 'lucide-react';
import { TOOL_CATEGORIES, ALL_TOOLS } from '@/config/tools';
import { DynamicIcon } from '@/components/common/DynamicIcon';
import { DocuNexaLogo } from '@/components/common/DocuNexaLogo';
import { ToolCategory } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/common/ThemeToggle';

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
        className="fixed inset-0 bg-ink/40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-xs bg-surface h-full flex flex-col z-10 border-r border-border animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <DocuNexaLogo size="sm" />
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-paper transition-colors"
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
            className="flex items-center gap-3 p-3 rounded-md bg-paper border border-border text-ink font-semibold text-sm hover:border-brand/40 transition-colors"
          >
            <div className="w-8 h-8 rounded-md bg-brand text-brand-fg flex items-center justify-center shrink-0">
              <Scissors size={16} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-ink">PDF Unit Cutter</span>
                <span className="px-1.5 py-0.5 text-[9px] uppercase font-bold rounded bg-brand/10 text-brand border border-brand/20">
                  Flagship
                </span>
              </div>
              <p className="text-[11px] font-normal text-muted">
                Split textbooks into units
              </p>
            </div>
          </Link>

          {/* Theme Toggle (Mobile Drawer) */}
          <div className="px-1">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
              Visual Theme
            </span>
            <ThemeToggle className="w-full justify-start py-2 px-3" showLabel={true} />
          </div>

          {/* Direct Navigation Links */}
          <div className="space-y-1">
            <Link
              href="/tools"
              onClick={onClose}
              className="block px-3 py-2 rounded-md text-sm font-medium text-ink hover:bg-paper hover:text-brand transition-colors"
            >
              All 34 PDF Tools
            </Link>
            <Link
              href="/how-it-works"
              onClick={onClose}
              className="block px-3 py-2 rounded-md text-sm font-medium text-ink hover:bg-paper hover:text-brand transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="/about"
              onClick={onClose}
              className="block px-3 py-2 rounded-md text-sm font-medium text-ink hover:bg-paper hover:text-brand transition-colors"
            >
              About DocuNexa
            </Link>
            <Link
              href="/privacy"
              onClick={onClose}
              className="block px-3 py-2 rounded-md text-sm font-medium text-ink hover:bg-paper hover:text-brand transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/security"
              onClick={onClose}
              className="block px-3 py-2 rounded-md text-sm font-medium text-ink hover:bg-paper hover:text-brand transition-colors"
            >
              Security Architecture
            </Link>
            <Link
              href="/terms"
              onClick={onClose}
              className="block px-3 py-2 rounded-md text-sm font-medium text-ink hover:bg-paper hover:text-brand transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/support"
              onClick={onClose}
              className="block px-3 py-2 rounded-md text-sm font-medium text-brand hover:bg-paper transition-colors"
            >
              Support Center
            </Link>
            <a
              href="https://t.me/docunexa_bot"
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium text-accent hover:bg-paper transition-colors"
            >
              <span>Telegram Support</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent font-bold">@docunexa_bot</span>
            </a>
            <Link
              href="/contact"
              onClick={onClose}
              className="block px-3 py-2 rounded-md text-sm font-medium text-ink hover:bg-paper hover:text-brand transition-colors"
            >
              Contact Us
            </Link>
          </div>

          {/* Account / Membership Section */}
          <MobileDrawerAuth onClose={onClose} />

          <div className="pt-2 border-t border-border">
            <h4 className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted mb-2">
              Categories
            </h4>
            <div className="space-y-1">
              {TOOL_CATEGORIES.map((cat) => {
                const isExpanded = expandedCategory === cat.id;
                const categoryTools = ALL_TOOLS.filter((t) => t.category === cat.id);

                return (
                  <div key={cat.id} className="rounded-md border border-border overflow-hidden">
                    <button
                      onClick={() => toggleCategory(cat.id)}
                      className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-ink hover:bg-paper transition-colors"
                    >
                      <span>{cat.name}</span>
                      {isExpanded ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />}
                    </button>

                    {isExpanded && (
                      <div className="p-2 pt-0 space-y-0.5 bg-paper/50">
                        {categoryTools.map((tool) => (
                          <Link
                            key={tool.id}
                            href={`/tools/${tool.slug}`}
                            onClick={onClose}
                            className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs text-ink hover:bg-surface hover:text-brand font-medium transition-colors"
                          >
                            <DynamicIcon name={tool.iconName} size={14} className="text-brand shrink-0" />
                            <span className="truncate">{tool.name}</span>
                            {tool.badge && (
                              <span className="ml-auto px-1.5 py-0.5 text-[9px] font-bold rounded bg-surface border border-border text-muted">
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
        <div className="p-3 border-t border-border bg-paper text-[11px] text-muted">
          <p className="font-semibold text-brand">✓ Client-Side Document Privacy</p>
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
      <div className="pt-2 border-t border-border space-y-1">
        <h4 className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
          Account
        </h4>
        <div className="grid grid-cols-2 gap-2 px-3">
          <Link
            href="/login"
            onClick={onClose}
            className="flex items-center justify-center py-2 px-3 rounded-md border border-border text-xs font-semibold text-ink hover:bg-paper text-center transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            onClick={onClose}
            className="flex items-center justify-center py-2 px-3 rounded-md bg-brand hover:bg-brand/90 text-brand-fg text-xs font-semibold text-center transition-colors"
          >
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  const isAdFree = user.plan === 'ad_free';

  return (
    <div className="pt-2 border-t border-border space-y-2 px-3">
      <div className="p-3 rounded-md bg-paper border border-border space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-xs text-ink truncate max-w-[140px]">
            {user.email}
          </span>
          {isAdFree ? (
            <span className="px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold flex items-center gap-0.5">
              <CheckCircle2 size={10} /> Ad-Free
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-surface border border-border text-muted text-[10px] font-bold">
              Free
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Link
            href="/account"
            onClick={onClose}
            className="flex-1 py-1.5 px-2.5 rounded-md bg-surface text-ink text-xs font-semibold text-center border border-border hover:bg-paper transition-colors"
          >
            Account
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              onClick={onClose}
              className="py-1.5 px-2.5 rounded-md bg-surface text-brand text-xs font-semibold text-center border border-border hover:bg-paper transition-colors"
            >
              Admin
            </Link>
          )}
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            aria-label="Log out"
            className="py-1.5 px-2.5 rounded-md bg-surface text-muted hover:text-accent text-xs font-semibold border border-border hover:bg-paper transition-colors flex items-center gap-1 cursor-pointer"
          >
            <LogOut size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};
