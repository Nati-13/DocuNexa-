'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ChevronDown, 
  Search, 
  Menu, 
  Scissors, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { DocuNexaLogo } from '@/components/common/DocuNexaLogo';
import { MegaMenu } from '@/components/layout/MegaMenu';
import { MobileDrawer } from '@/components/layout/MobileDrawer';
import { SearchModal } from '@/components/common/SearchModal';
import { NavbarAuthControls } from '@/components/layout/NavbarAuthControls';
import { ThemeToggle } from '@/components/common/ThemeToggle';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-surface border-b border-border transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <DocuNexaLogo size="sm" showTagline={false} />

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {/* Tools Mega Menu Trigger */}
              <div
                className="relative"
                onMouseEnter={() => setIsMegaMenuOpen(true)}
              >
                <button
                  type="button"
                  onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
                  aria-expanded={isMegaMenuOpen}
                  aria-haspopup="true"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden ${
                    isMegaMenuOpen || pathname.startsWith('/tools')
                      ? 'text-brand bg-paper border border-border'
                      : 'text-ink hover:text-brand hover:bg-paper'
                  }`}
                >
                  <span>Tools</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${
                      isMegaMenuOpen ? 'rotate-180 text-brand' : 'text-muted'
                    }`}
                  />
                </button>
              </div>

              {/* PDF Unit Cutter Featured Tab */}
              <Link
                href="/tools/pdf-unit-cutter"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden ${
                  pathname === '/tools/pdf-unit-cutter'
                    ? 'text-brand bg-paper border border-border'
                    : 'text-ink hover:text-brand hover:bg-paper'
                }`}
              >
                <Scissors size={14} className="text-brand" />
                <span>PDF Unit Cutter</span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-brand/10 text-brand border border-brand/20">
                  Flagship
                </span>
              </Link>

              {/* Document Intelligence */}
              <Link
                href="/tools/ai-summarizer"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden ${
                  pathname === '/tools/ai-summarizer'
                    ? 'text-brand bg-paper border border-border'
                    : 'text-ink hover:text-brand hover:bg-paper'
                }`}
              >
                <Sparkles size={14} className="text-brand" />
                <span>Document Intelligence</span>
              </Link>

              <Link
                href="/how-it-works"
                className="px-3 py-1.5 rounded-md text-sm font-medium text-ink hover:text-brand hover:bg-paper transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden"
              >
                How It Works
              </Link>

              <Link
                href="/about"
                className="px-3 py-1.5 rounded-md text-sm font-medium text-ink hover:text-brand hover:bg-paper transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden"
              >
                About
              </Link>

              <Link
                href="/support"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden ${
                  pathname === '/support'
                    ? 'text-brand bg-paper border border-border'
                    : 'text-ink hover:text-brand hover:bg-paper'
                }`}
              >
                Support
              </Link>
            </nav>
          </div>

          {/* Right Action Items */}
          <div className="flex items-center gap-2">
            {/* Quick Search Button */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search tools (⌘K)"
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-paper hover:bg-paper/80 text-muted hover:text-ink text-xs font-medium transition-colors border border-border cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden"
            >
              <Search size={14} />
              <span className="hidden sm:inline">Search tools...</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium bg-surface border border-border text-muted rounded">
                ⌘K
              </kbd>
            </button>

            {/* Dark / Light Mode Toggle */}
            <ThemeToggle />

            {/* Auth / Account Controls */}
            <NavbarAuthControls />

            {/* Direct CTA */}
            <Link
              href="/tools"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand hover:bg-brand/90 text-brand-fg text-xs font-semibold transition-colors"
            >
              <span>Tools</span>
              <ArrowRight size={13} />
            </Link>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              aria-label="Open mobile menu"
              className="lg:hidden p-2 rounded-md text-ink hover:bg-paper border border-border transition-colors cursor-pointer"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>

        {/* Mega Menu Container */}
        <MegaMenu
          isOpen={isMegaMenuOpen}
          onClose={() => setIsMegaMenuOpen(false)}
        />
      </header>

      {/* Global Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
      />
    </>
  );
};
