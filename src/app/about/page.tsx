import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, Zap, BookOpen, Heart, ArrowRight, CheckCircle2 } from 'lucide-react';
import { DocuNexaLogo } from '@/components/common/DocuNexaLogo';

export const metadata = {
  title: 'About DocuNexa — Privacy-First PDF Productivity',
  description: 'Learn about DocuNexa mission, browser-side architecture, and dedication to private, accessible document tools.',
};

export default function AboutPage() {
  const values = [
    {
      title: 'Zero Server Storage',
      desc: 'We believe your documents belong to you. We do not store, view, or train models on your uploaded files.',
      icon: Lock,
    },
    {
      title: 'Built for Education',
      desc: 'Created with students and teachers in mind, making 800-page textbooks easy to digest as modular unit PDFs.',
      icon: BookOpen,
    },
    {
      title: 'Lossless Precision',
      desc: 'Our page-slicing and PDF engines preserve original vector graphics, embedded fonts, and print resolutions.',
      icon: Zap,
    },
    {
      title: 'Accessible & Free',
      desc: 'High-quality document tools should be universally accessible without paywalls on essential productivity.',
      icon: Heart,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-16 md:py-24 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 text-xs font-bold uppercase tracking-wider">
            <span>Our Mission</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Every PDF tool. One simple workspace.
          </h1>
          <p className="text-slate-700 dark:text-slate-200 text-base sm:text-lg leading-relaxed">
            DocuNexa was built to eliminate the chaos of sketchy PDF websites filled with popup ads, file size throttles, and privacy risks.
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {values.map((v, i) => (
            <div
              key={i}
              className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <v.icon size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{v.title}</h3>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>

        {/* Security & Privacy Specs */}
        <div className="p-8 md:p-12 rounded-3xl bg-slate-900 text-white space-y-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <ShieldCheck size={28} className="text-emerald-400" />
            <h3 className="text-2xl font-bold">Privacy Architecture & Security Standards</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300">
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">In-Memory Processing:</strong> Documents loaded into memory via ArrayBuffer APIs and discarded upon tab closing.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">MIME & Byte Validation:</strong> Strict file structure verification prevents binary execution or corrupted streams.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Safe Filename Sanitization:</strong> Automatic stripping of forbidden characters, preventing filesystem collisions.
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">No Tracking Pixels:</strong> Zero third-party behavioral analytics or invasive telemetry injected into documents.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Offline Capability:</strong> Web Worker based processing functions reliably even with intermittent connectivity.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">File System Access API:</strong> Direct local folder saves without double browser downloads where supported.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4 pt-4">
          <h3 className="text-xl font-bold">Ready to experience DocuNexa?</h3>
          <Link
            href="/tools"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-lg shadow-brand-500/25 transition-all hover:scale-[1.02]"
          >
            <span>Explore All 34 PDF Tools</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
