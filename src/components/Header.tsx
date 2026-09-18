'use client';

import React from 'react';
import { Scissors, ShieldCheck, BookOpen, Info, Sparkles } from 'lucide-react';

interface HeaderProps {
  activeTab: 'cutter' | 'how-it-works' | 'about';
  setActiveTab: (tab: 'cutter' | 'how-it-works' | 'about') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Brand */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group select-none"
            onClick={() => setActiveTab('cutter')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Scissors className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg sm:text-xl tracking-tight text-slate-900">
                  PDF Unit Cutter
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <Sparkles className="w-3 h-3 mr-1 text-indigo-500" />
                  Local & Private
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Automatically detect, split, rename, and save PDF units
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('cutter')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'cutter'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              Cutter
            </button>
            <button
              onClick={() => setActiveTab('how-it-works')}
              className={`inline-flex items-center px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'how-it-works'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <BookOpen className="w-4 h-4 mr-1.5 opacity-70" />
              How It Works
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`inline-flex items-center px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'about'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <Info className="w-4 h-4 mr-1.5 opacity-70" />
              About
            </button>
          </nav>
        </div>
      </div>

      {/* Privacy guarantee micro-bar */}
      <div className="bg-slate-50/90 border-t border-slate-100 px-4 py-1.5 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>
          <strong className="text-slate-700 font-medium">100% Client-Side Privacy:</strong> Your PDF is processed locally in your browser. Document files are never uploaded to any remote server.
        </span>
      </div>
    </header>
  );
};
