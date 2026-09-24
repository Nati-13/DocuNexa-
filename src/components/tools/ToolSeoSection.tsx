import React from 'react';
import { ToolItem } from '@/types';
import { getToolSeoData } from '@/config/seoInventory';
import { 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  FileText, 
  ShieldCheck, 
  Cpu, 
  ArrowRight,
  Layers,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

interface ToolSeoSectionProps {
  tool: ToolItem;
}

export const ToolSeoSection: React.FC<ToolSeoSectionProps> = ({ tool }) => {
  const seo = getToolSeoData(tool.slug);

  return (
    <section 
      aria-label={`${tool.name} Specifications and Documentation`}
      className="mt-16 pt-12 border-t border-slate-200 dark:border-slate-800 text-left space-y-12"
    >
      {/* 1. What the Tool Does & Overview */}
      <div className="space-y-4 max-w-4xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 text-xs font-semibold">
          <Layers size={14} />
          <span>Documentation & Specifications</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          What {tool.name} Does
        </h2>
        <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          {seo.whatItDoes}
        </p>
      </div>

      {/* 2. Key Capabilities vs Genuine Limitations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Capabilities Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={20} className="shrink-0" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Key Capabilities
            </h3>
          </div>
          <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            {seo.capabilities.map((cap, idx) => (
              <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                <span>{cap}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Limitations Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
            <AlertCircle size={20} className="shrink-0" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Technical Limitations & Considerations
            </h3>
          </div>
          <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            {seo.limitations.map((lim, idx) => (
              <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                <span>{lim}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 3. How to Use Step-by-Step */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            How to Use {tool.name}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Follow these straightforward steps to process your documents locally:
          </p>
        </div>

        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {seo.howToSteps.map((step, idx) => (
            <li
              key={idx}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2 shadow-xs"
            >
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-brand-50 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400 font-bold text-xs">
                {idx + 1}
              </span>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {step}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* 4. Technical Specifications & Privacy Table */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Supported Input
          </span>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {seo.inputFormat}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Generated Output
          </span>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {seo.outputFormat}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Processing Engine
          </span>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Cpu size={14} />
            <span>100% In-Browser</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Privacy Guarantee
          </span>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck size={14} />
            <span>Zero Cloud Uploads</span>
          </p>
        </div>
      </div>
    </section>
  );
};
