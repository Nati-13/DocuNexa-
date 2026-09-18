'use client';

import React from 'react';
import { ShieldCheck, GraduationCap, Laptop, Sparkles, FolderSync, Heart } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-10 py-6 animate-in fade-in duration-200">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
          <GraduationCap className="w-6 h-6" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          About PDF Unit Cutter
        </h1>
        <p className="text-base text-slate-600 max-w-2xl mx-auto">
          A modern tool built for educators, students, and curriculum planners who need to decompose massive textbooks into focused modular lessons.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Mission Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <GraduationCap className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg">Designed for Education</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            School textbooks often span hundreds of pages. Sharing a 300MB PDF with students for a single week&apos;s homework is cumbersome. PDF Unit Cutter empowers teachers and students to split books into clean, manageable unit files in seconds.
          </p>
        </div>

        {/* Privacy Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg">Strict Client-Side Privacy</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Many educational materials, exams, and instructor guides are copyright-protected or confidential. We never transmit your document to any cloud server. Everything executes locally in your browser sandbox using WebAssembly and JavaScript.
          </p>
        </div>

        {/* Folder Saving & Browser APIs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <FolderSync className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg">Folder Saving &amp; Browser Support</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Chromium browsers (Google Chrome, Microsoft Edge, Brave, Opera) support the standard <em>File System Access API</em>, allowing you to select a local directory on your drive and save all files directly into it. In Firefox, Safari, and mobile browsers, the application provides an instant ZIP download containing all output PDFs.
          </p>
        </div>

        {/* Compatibility */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Laptop className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg">Cross-Platform Compatibility</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Works across Windows, macOS, Linux, ChromeOS, and modern mobile browsers. Output filenames are automatically sanitized to prevent invalid character errors on Windows and Unix filesystems.
          </p>
        </div>
      </div>

      <div className="text-center pt-4 text-xs text-slate-400 flex items-center justify-center space-x-1">
        <span>Built with</span>
        <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 inline" />
        <span>for educators and students everywhere.</span>
      </div>
    </div>
  );
};
