import React from 'react';
import Link from 'next/link';
import { 
  Scissors, 
  UploadCloud, 
  Search, 
  Sparkles, 
  Download, 
  ShieldCheck, 
  ArrowRight,
  Cpu,
  Layers,
  FileCheck
} from 'lucide-react';

export const metadata = {
  title: 'How It Works — DocuNexa All-In-One PDF Workspace',
  description: 'Understand how DocuNexa processes documents 100% in your browser and how our automatic Unit Cutter engine slices textbooks.',
};

export default function HowItWorksPage() {
  const steps = [
    {
      step: '01',
      title: 'Choose Any PDF Tool',
      description: 'Select from 34 specialized tools across Organize, Optimize, Convert, Edit, Security, and AI Intelligence.',
      icon: Search,
    },
    {
      step: '02',
      title: 'Drop Your Files Locally',
      description: 'Select or drag your PDF documents into the workspace. Your files are loaded into memory on your device.',
      icon: UploadCloud,
    },
    {
      step: '03',
      title: 'Process & Download Instantly',
      description: 'PDF manipulations run in WebAssembly and Web Workers. Download as standalone PDFs, ZIP, or direct to local folder.',
      icon: Download,
    },
  ];

  const unitCutterSteps = [
    { num: '1', title: 'Upload Textbook', desc: 'Drag in your full multi-chapter or multi-unit PDF book.' },
    { num: '2', title: 'Automatic Analysis', desc: 'Our engine extracts text baselines and Table of Contents.' },
    { num: '3', title: 'Detect Units & Chapters', desc: 'Identifies Unit 1, Unit 2, Chapter 3, and front matter ranges.' },
    { num: '4', title: 'Interactive Review', desc: 'Inspect confidence scores, adjust page boundaries, or add unlimited parts.' },
    { num: '5', title: 'Custom Filenames', desc: 'Apply custom naming patterns with automatic filesystem character sanitization.' },
    { num: '6', title: 'Lossless Slicing', desc: 'Extracts exact vector pages without rasterization or degradation.' },
    { num: '7', title: 'Download Bundle', desc: 'Export as organized individual files, a single ZIP, or save to your folder.' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-16 md:py-24 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 text-xs font-bold uppercase tracking-wider">
            <span>Seamless Workflow</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            How DocuNexa Works
          </h1>
          <p className="text-slate-700 dark:text-slate-200 text-base sm:text-lg leading-relaxed">
            A revolutionary privacy-first architecture that executes military-grade PDF algorithms directly in your browser.
          </p>
        </div>

        {/* 3 Core Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute top-4 right-4 text-4xl font-extrabold text-slate-100 dark:text-slate-800/80 pointer-events-none">
                {s.step}
              </div>
              <div className="space-y-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-xs">
                  <s.icon size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{s.title}</h3>
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{s.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Specialized Unit Cutter Deep Dive */}
        <div className="p-8 md:p-12 rounded-3xl bg-gradient-to-br from-brand-50/80 via-white to-indigo-50/80 dark:from-brand-950/40 dark:via-slate-900 dark:to-indigo-950/40 border border-brand-200 dark:border-brand-800 shadow-xl space-y-8 max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Scissors size={20} className="text-brand-600 dark:text-brand-400" />
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  The PDF Unit Cutter Workflow
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                How our intelligent algorithm parses educational textbooks and divides them into modular units.
              </p>
            </div>
            <Link
              href="/tools/pdf-unit-cutter"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition-all self-start md:self-auto shrink-0"
            >
              <span>Launch Unit Cutter</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {unitCutterSteps.map((uc, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <span className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 font-bold text-xs flex items-center justify-center">
                    {uc.num}
                  </span>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">{uc.title}</h4>
                  <p className="text-[11px] text-slate-700 dark:text-slate-200 leading-relaxed">{uc.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Client-Side Architecture Section */}
        <div className="max-w-4xl mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Cpu size={24} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Why Browser-Side Processing Matters
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 max-w-2xl mx-auto leading-relaxed">
              Traditional online PDF splitters require uploading gigabytes of sensitive student textbooks, confidential financial records, or medical scans to unknown servers. DocuNexa operates entirely in your browser using modern WebAssembly and JavaScript — your files never touch the internet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
