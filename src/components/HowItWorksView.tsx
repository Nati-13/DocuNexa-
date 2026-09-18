'use client';

import React from 'react';
import { 
  FileSearch, 
  Cpu, 
  Layers, 
  Scissors, 
  ShieldCheck, 
  FolderDown, 
  Sparkles, 
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export const HowItWorksView: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => {
  const steps = [
    {
      icon: <FileSearch className="w-6 h-6 text-indigo-600" />,
      title: '1. Select or Drop Your PDF',
      description:
        'Upload your textbook, reader, or syllabus. The file is read directly in your browser using standard Web APIs. No network requests are made with your document.',
    },
    {
      icon: <Cpu className="w-6 h-6 text-indigo-600" />,
      title: '2. Smart Unit & Chapter Analysis',
      description:
        'PDF.js scans the document structure and text baseline. Our heuristic engine detects headings (e.g. "UNIT 1", "Chapter 2", "Module 3", Roman numerals), examines Table of Contents entries, and automatically rejects regular sentences like "In Unit 2 we learned...".',
    },
    {
      icon: <Layers className="w-6 h-6 text-indigo-600" />,
      title: '3. Review, Customize & Add Parts',
      description:
        'Inspect detected page ranges. Easily tweak start/end pages, rename output files, duplicate parts into sub-sections (e.g., Unit 3A and Unit 3B), or configure introductory front matter.',
    },
    {
      icon: <Scissors className="w-6 h-6 text-indigo-600" />,
      title: '4. Lossless PDF Splitting',
      description:
        'Using pdf-lib, the app extracts exact native PDF pages containing all vector typography, embedded images, and annotations. We never convert pages into low-resolution screenshots.',
    },
    {
      icon: <FolderDown className="w-6 h-6 text-indigo-600" />,
      title: '5. Direct Save or ZIP Download',
      description:
        'Save directly into a selected local folder using the modern File System Access API, or download a clean ZIP archive with all organized unit files in one click.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-6 animate-in fade-in duration-200">
      {/* Hero */}
      <div className="text-center space-y-3">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
          <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-500" />
          Engineered for Educational Textbooks
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          How PDF Unit Cutter Works
        </h1>
        <p className="text-base text-slate-600 max-w-2xl mx-auto">
          Split multi-hundred page textbooks into modular, bite-sized units and chapters entirely on your own computer.
        </p>
      </div>

      {/* Step by Step Cards */}
      <div className="grid gap-6 sm:grid-cols-1">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex items-start space-x-5 hover:border-indigo-300 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              {step.icon}
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Technical Highlights */}
      <div className="bg-slate-900 text-white rounded-2xl p-8 space-y-4 shadow-xl">
        <h3 className="text-xl font-bold flex items-center">
          <ShieldCheck className="w-6 h-6 text-emerald-400 mr-2" />
          Technical Guarantees
        </h3>
        <div className="grid sm:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-300">
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>Never Modifies Original:</strong> Your input PDF remains untouched. Output files are freshly created sub-documents.</span>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>Vector &amp; Text Preservation:</strong> All fonts, vector diagrams, and bookmarks are preserved without loss.</span>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>Zero Cloud Uploads:</strong> Safe for proprietary textbooks, university materials, and student records.</span>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>Project Persistence:</strong> Export lightweight <code>.project.json</code> to reload your setup without reprocessing.</span>
          </div>
        </div>

        <div className="pt-4 text-center">
          <button
            type="button"
            onClick={onGetStarted}
            className="inline-flex items-center px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all"
          >
            Try PDF Unit Cutter Now
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
};
