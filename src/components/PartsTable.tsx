'use client';

import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Download,
  Eye,
  AlertTriangle,
  Check,
  RefreshCw,
  Save,
  FolderOpen,
  FileText,
  Scissors,
  CheckCircle2,
  Settings2,
  HelpCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { DetectedPart, ValidationResult, ConfidenceLevel } from '@/types';
import { sanitizeFilename } from '@/lib/validator';

interface PartsTableProps {
  parts: DetectedPart[];
  originalParts: DetectedPart[];
  totalPages: number;
  originalFileName: string;
  splitMode: 'auto' | 'manual';
  setSplitMode: (mode: 'auto' | 'manual') => void;
  onUpdatePart: (id: string, updated: Partial<DetectedPart>) => void;
  onAddPart: (part: Omit<DetectedPart, 'id'>) => void;
  onDuplicatePart: (id: string) => void;
  onDeletePart: (id: string) => void;
  onMovePart: (index: number, direction: 'up' | 'down') => void;
  onResetParts: () => void;
  onApplyAll: () => void;
  onPreviewPart: (part: DetectedPart) => void;
  onDownloadSinglePart: (part: DetectedPart) => void;
  onCutPdf: () => void;
  onSaveProject: () => void;
  onLoadProject: () => void;
  validation: ValidationResult;
  hasFrontMatter: boolean;
  frontMatterRange?: { start: number; end: number };
  onHandleFrontMatter: (action: 'separate' | 'include' | 'exclude') => void;
  selectedFolderText?: string;
  onChooseFolder?: () => void;
  isFolderSupported: boolean;
  isUncertain?: boolean;
  uncertaintyReason?: string;
  overallConfidence?: ConfidenceLevel;
  isBoundariesConfirmed?: boolean;
  onConfirmBoundaries?: () => void;
}

export const PartsTable: React.FC<PartsTableProps> = ({
  parts,
  originalParts,
  totalPages,
  originalFileName,
  splitMode,
  setSplitMode,
  onUpdatePart,
  onAddPart,
  onDuplicatePart,
  onDeletePart,
  onMovePart,
  onResetParts,
  onApplyAll,
  onPreviewPart,
  onDownloadSinglePart,
  onCutPdf,
  onSaveProject,
  onLoadProject,
  validation,
  hasFrontMatter,
  frontMatterRange,
  onHandleFrontMatter,
  selectedFolderText,
  onChooseFolder,
  isFolderSupported,
  isUncertain,
  uncertaintyReason,
  overallConfidence,
  isBoundariesConfirmed,
  onConfirmBoundaries,
}) => {
  // Modal / Form state for adding custom part
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStart, setNewStart] = useState<number>(1);
  const [newEnd, setNewEnd] = useState<number>(Math.min(10, totalPages || 10));
  const [newFilename, setNewFilename] = useState('');

  // Naming format mode: custom vs automatic prefix
  const [namingMode, setNamingMode] = useState<'custom' | 'auto'>('custom');
  const [autoPrefix, setAutoPrefix] = useState(
    originalFileName.replace(/\.pdf$/i, '').trim() || 'Document'
  );

  const handleOpenAddModal = () => {
    // Smart default for next part
    const lastPart = parts[parts.length - 1];
    const defaultStart = lastPart ? Math.min(lastPart.endPage + 1, totalPages) : 1;
    const defaultEnd = Math.min(defaultStart + 19, totalPages);
    const nextIndex = parts.length + 1;

    setNewTitle(`Part ${nextIndex}`);
    setNewStart(defaultStart);
    setNewEnd(defaultEnd);
    setNewFilename(sanitizeFilename(`Part ${nextIndex}.pdf`));
    setShowAddModal(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddPart({
      title: newTitle.trim() || `Part ${parts.length + 1}`,
      startPage: Number(newStart),
      endPage: Number(newEnd),
      filename: sanitizeFilename(newFilename || `${newTitle || 'Part'}.pdf`),
      confidence: 'High',
      source: 'manual',
    });
    setShowAddModal(false);
  };

  const handleAutoRenameAll = () => {
    parts.forEach((part, index) => {
      const cleanPrefix = autoPrefix.trim();
      const cleanTitle = part.title.replace(/[:\-–—\s]+/g, ' ').trim();
      const generated = cleanPrefix
        ? `${cleanPrefix} - ${cleanTitle || `Part ${index + 1}`}.pdf`
        : `${cleanTitle || `Part ${index + 1}`}.pdf`;
      onUpdatePart(part.id, { filename: sanitizeFilename(generated) });
    });
  };

  // Compute coverage statistics
  const assignedPagesCount = parts.reduce((acc, p) => {
    return acc + Math.max(0, (p.endPage || 0) - (p.startPage || 0) + 1);
  }, 0);
  const unassignedPagesCount = Math.max(0, totalPages - assignedPagesCount);
  const computedConfidence: ConfidenceLevel = overallConfidence || (
    parts.length > 0 && parts.every((p) => p.confidence === 'High') ? 'High' : 'Medium'
  );

  const getConfidenceBadge = (confidence: ConfidenceLevel) => {
    switch (confidence) {
      case 'High':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Medium
          </span>
        );
      case 'Low':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Low
          </span>
        );
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 shadow-sm space-y-6 relative overflow-hidden">
      {/* Top Bar: Mode Selection & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1 border border-slate-200/70">
            <button
              type="button"
              onClick={() => setSplitMode('auto')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                splitMode === 'auto'
                  ? 'btn-aurora shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Auto Detect Units
            </button>
            <button
              type="button"
              onClick={() => setSplitMode('manual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                splitMode === 'manual'
                  ? 'btn-aurora shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Manual Split
            </button>
          </div>

          <span className="text-xs text-slate-500 hidden md:inline-block">
            {parts.length} {parts.length === 1 ? 'part' : 'parts'} defined
          </span>
        </div>

        {/* Project Load / Save & Reset Buttons */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onLoadProject}
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
            title="Load existing .project.json settings"
          >
            <FolderOpen className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Load Project
          </button>
          <button
            type="button"
            onClick={onSaveProject}
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
            title="Save your parts & ranges as .project.json"
          >
            <Save className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Save Project
          </button>
          <button
            type="button"
            onClick={onResetParts}
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
            title="Reset parts back to initial state"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Reset
          </button>
        </div>
      </div>

      {/* Analysis & Physical Page Coverage Summary */}
      <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Analysis &amp; Coverage Summary
            </h4>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Overall Confidence:</span>
            {getConfidenceBadge(computedConfidence)}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60">
            <span className="text-slate-500 block text-[11px]">Total Physical Pages</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">{totalPages}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60">
            <span className="text-slate-500 block text-[11px]">Units Defined</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">{parts.length}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60">
            <span className="text-slate-500 block text-[11px]">Assigned Pages</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              {assignedPagesCount} / {totalPages}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60">
            <span className="text-slate-500 block text-[11px]">Unassigned Pages</span>
            <span className={`font-bold text-sm ${unassignedPagesCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>
              {unassignedPagesCount}
            </span>
          </div>
        </div>

        {/* Warning: Single Unit in Multi-Page Document */}
        {parts.length === 1 && totalPages > 15 && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Review Recommended: Only 1 unit detected across {totalPages} pages.</span>
              <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                Textbooks usually contain multiple units or chapters. If additional units are present, please use &ldquo;+ Add Part&rdquo; or switch to &ldquo;Manual Split&rdquo; to define individual unit boundaries before cutting.
              </p>
            </div>
          </div>
        )}

        {/* Warning: Uncertain Mapping */}
        {isUncertain && (
          <div
            className={`p-3.5 rounded-xl border text-xs transition-colors ${
              isBoundariesConfirmed
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {isBoundariesConfirmed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1.5 flex-1">
                <span className="font-bold block">
                  {isBoundariesConfirmed
                    ? 'Unit Boundaries Confirmed'
                    : 'Manual Boundary Confirmation Required'}
                </span>
                <p className={isBoundariesConfirmed ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}>
                  {uncertaintyReason || 'TOC-to-physical-page mapping could not be conclusively verified against physical headings.'}
                </p>
                {!isBoundariesConfirmed ? (
                  <div className="space-y-3 pt-1">
                    {/* Unit Boundaries Review List */}
                    <div className="p-2.5 rounded-lg bg-amber-100/70 dark:bg-amber-900/30 border border-amber-200/80 dark:border-amber-800/80">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 mb-1.5 flex items-center justify-between">
                        <span>Unit Boundaries for Review ({parts.length} total):</span>
                        <span className="text-[10px] font-normal lowercase">Physical page numbers</span>
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1 text-[11px]">
                        {parts.map((p, idx) => (
                          <div
                            key={p.id || idx}
                            className="flex items-center justify-between py-1 border-b border-amber-200/40 dark:border-amber-800/40 last:border-0"
                          >
                            <span className="font-medium truncate max-w-[280px] text-slate-900 dark:text-slate-100">
                              {p.title}
                            </span>
                            <span className="font-mono font-bold text-amber-950 dark:text-amber-100 shrink-0 ml-2">
                              Pages {p.startPage} – {p.endPage} ({Math.max(0, p.endPage - p.startPage + 1)} pp)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 max-w-md">
                        Please review each unit&apos;s start and end pages above or edit them in the table below. Confirming approves these exact physical ranges for extraction.
                      </p>
                      <button
                        type="button"
                        onClick={onConfirmBoundaries}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve &amp; Confirm Displayed Page Boundaries</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-0.5 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium flex items-center justify-between">
                    <span>✓ Page boundaries reviewed and approved for all {parts.length} units. CUT PDF is unlocked.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Front Matter Suggestion Alert */}
      {hasFrontMatter && frontMatterRange && (
        <div className="p-4 bg-gradient-to-r from-indigo-500/10 via-brand-500/10 to-cyan-500/10 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl space-y-2 backdrop-blur-sm">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-950 flex-1">
              <span className="font-semibold">Introductory Pages Detected (Pages 1–{frontMatterRange.end}):</span>
              <p className="text-indigo-800 mt-0.5">
                The first detected unit begins on page {frontMatterRange.end + 1}. What would you like to do with preliminary pages (cover, copyright, preface, contents)?
              </p>
              <div className="flex flex-wrap gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={() => onHandleFrontMatter('separate')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-2xs transition-colors"
                >
                  Create &quot;Part 0 — Front Matter&quot; (Pages 1–{frontMatterRange.end})
                </button>
                <button
                  type="button"
                  onClick={() => onHandleFrontMatter('include')}
                  className="px-3 py-1.5 rounded-lg bg-white text-indigo-700 font-medium border border-indigo-300 hover:bg-indigo-50 transition-colors"
                >
                  Include in Unit 1 (Extend start to page 1)
                </button>
                <button
                  type="button"
                  onClick={() => onHandleFrontMatter('exclude')}
                  className="px-3 py-1.5 rounded-lg bg-white text-slate-600 font-medium border border-slate-300 hover:bg-slate-100 transition-colors"
                >
                  Exclude Front Matter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Feedback Banners */}
      {!validation.isValid && validation.errors.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1 text-xs text-red-700">
          <div className="flex items-center space-x-2 font-semibold text-red-900 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Please resolve the following errors:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 pl-1">
            {validation.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs text-amber-800">
          <div className="flex items-center space-x-2 font-semibold text-amber-900 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Range &amp; Filename Warnings:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 pl-1">
            {validation.warnings.map((warn, i) => (
              <li key={i}>{warn}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Output Filename Naming Pattern Toolbar */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-4">
          <span className="font-semibold text-slate-700 flex items-center">
            <Settings2 className="w-4 h-4 mr-1.5 text-indigo-600" />
            Output Filename Format:
          </span>
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="radio"
              checked={namingMode === 'custom'}
              onChange={() => setNamingMode('custom')}
              className="text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-slate-600 font-medium">Custom names</span>
          </label>
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="radio"
              checked={namingMode === 'auto'}
              onChange={() => setNamingMode('auto')}
              className="text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-slate-600 font-medium">Automatic prefix</span>
          </label>
        </div>

        {namingMode === 'auto' && (
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={autoPrefix}
              onChange={(e) => setAutoPrefix(e.target.value)}
              placeholder="e.g. Biology Grade 10"
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleAutoRenameAll}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-colors"
            >
              Apply to All Files
            </button>
          </div>
        )}
      </div>

      {/* Parts Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3 w-10 text-center">#</th>
              <th className="py-3 px-3 min-w-[180px]">Section Title</th>
              <th className="py-3 px-3 w-24 text-center">Start</th>
              <th className="py-3 px-3 w-24 text-center">End</th>
              <th className="py-3 px-3 w-20 text-center">Pages</th>
              <th className="py-3 px-3 w-28 text-center">Confidence</th>
              <th className="py-3 px-3 min-w-[220px]">Output Filename</th>
              <th className="py-3 px-3 w-36 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {parts.map((part, index) => {
              const pageCount =
                part.startPage && part.endPage
                  ? Math.max(0, part.endPage - part.startPage + 1)
                  : 0;

              return (
                <tr
                  key={part.id}
                  className="hover:bg-indigo-50/20 transition-colors group"
                >
                  {/* Number index */}
                  <td className="py-2.5 px-3 text-center text-slate-400 font-medium font-mono text-xs">
                    {index + 1}
                  </td>

                  {/* Editable Title */}
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={part.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        onUpdatePart(part.id, {
                          title: val,
                          filename: sanitizeFilename(
                            part.filename.includes('-')
                              ? part.filename
                              : `${val || 'Part'}.pdf`
                          ),
                        });
                      }}
                      placeholder="Section Title"
                      className="w-full px-2.5 py-1.5 border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded-lg bg-transparent focus:bg-white text-slate-900 font-medium focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all text-xs sm:text-sm"
                    />
                  </td>

                  {/* Start Page */}
                  <td className="py-2 px-2 text-center">
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={part.startPage || ''}
                      onChange={(e) =>
                        onUpdatePart(part.id, {
                          startPage: parseInt(e.target.value, 10) || 1,
                        })
                      }
                      className="w-18 px-2 py-1.5 text-center font-mono border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white text-xs sm:text-sm"
                    />
                  </td>

                  {/* End Page */}
                  <td className="py-2 px-2 text-center">
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={part.endPage || ''}
                      onChange={(e) =>
                        onUpdatePart(part.id, {
                          endPage: parseInt(e.target.value, 10) || 1,
                        })
                      }
                      className="w-18 px-2 py-1.5 text-center font-mono border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white text-xs sm:text-sm"
                    />
                  </td>

                  {/* Pages badge */}
                  <td className="py-2 px-3 text-center">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {pageCount}
                    </span>
                  </td>

                  {/* Confidence Badge */}
                  <td className="py-2 px-3 text-center">
                    {getConfidenceBadge(part.confidence)}
                  </td>

                  {/* Output Filename */}
                  <td className="py-2 px-3">
                    <div className="flex items-center space-x-1">
                      <input
                        type="text"
                        value={part.filename}
                        onChange={(e) =>
                          onUpdatePart(part.id, {
                            filename: sanitizeFilename(e.target.value),
                          })
                        }
                        className="w-full px-2.5 py-1.5 font-mono text-xs border border-slate-200 rounded-lg bg-slate-50/40 hover:border-slate-300 focus:border-indigo-500 focus:bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </td>

                  {/* Action Buttons */}
                  <td className="py-2 px-3 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      {/* Preview Button */}
                      <button
                        type="button"
                        onClick={() => onPreviewPart(part)}
                        title="Preview pages in this part"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Individual Download Button */}
                      <button
                        type="button"
                        disabled={Boolean(isUncertain) && !isBoundariesConfirmed}
                        onClick={() => onDownloadSinglePart(part)}
                        title={
                          Boolean(isUncertain) && !isBoundariesConfirmed
                            ? 'Please review and confirm page boundaries before downloading individual parts'
                            : 'Download this single PDF part now'
                        }
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Duplicate */}
                      <button
                        type="button"
                        onClick={() => onDuplicatePart(part.id)}
                        title="Duplicate this part (e.g. into Part A / B)"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Move Up */}
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => onMovePart(index, 'up')}
                        title="Move Up"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        disabled={index === parts.length - 1}
                        onClick={() => onMovePart(index, 'down')}
                        title="Move Down"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => onDeletePart(part.id)}
                        title="Delete part"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Prominent Add Part Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-dashed border-brand-300 dark:border-brand-700 hover:border-brand-500 bg-brand-50/40 dark:bg-brand-950/30 hover:bg-brand-50 dark:hover:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-semibold text-xs sm:text-sm transition-all shadow-xs hover:shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          + Add Part
        </button>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onApplyAll}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Apply Changes
          </button>
        </div>
      </div>

      {/* Output Destination & Execute Cut Section */}
      <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/80 dark:bg-slate-900/80 -mx-6 -mb-6 p-6 rounded-b-2xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-700">Output Folder:</span>
            {isFolderSupported ? (
              <button
                type="button"
                onClick={onChooseFolder}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline flex items-center"
              >
                <FolderOpen className="w-3.5 h-3.5 mr-1" />
                {selectedFolderText || 'Choose Folder (File System Access)'}
              </button>
            ) : (
              <span className="text-xs text-slate-500">
                Direct browser download / Universal ZIP bundle
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            Split into {parts.length} lossless high-resolution PDFs preserving all vectors, text, and images.
          </p>
        </div>

        {/* Helper message when cut is blocked due to unconfirmed uncertain boundaries */}
        {isUncertain && !isBoundariesConfirmed && (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium text-center md:text-right">
            Confirmation required: review and confirm page boundaries above to enable CUT PDF.
          </p>
        )}

        {/* The Big CUT PDF Action Button */}
        <button
          type="button"
          disabled={parts.length === 0 || !validation.isValid || (Boolean(isUncertain) && !isBoundariesConfirmed)}
          onClick={onCutPdf}
          className="btn-aurora w-full md:w-auto px-8 py-3.5 rounded-xl font-bold text-base shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 cursor-pointer"
          title={
            isUncertain && !isBoundariesConfirmed
              ? 'Please confirm the unit page boundaries above before cutting.'
              : undefined
          }
        >
          <Scissors className="w-5 h-5 -rotate-45" />
          <span>CUT PDF</span>
        </button>
      </div>

      {/* Add Custom Part Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Add New Part</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Part Name
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewTitle(val);
                    setNewFilename(sanitizeFilename(`${val || 'Part'}.pdf`));
                  }}
                  placeholder="e.g. Unit 3A – Cell Respiration"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Start Page
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    required
                    value={newStart}
                    onChange={(e) => setNewStart(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    End Page
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    required
                    value={newEnd}
                    onChange={(e) => setNewEnd(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Filename
                </label>
                <input
                  type="text"
                  required
                  value={newFilename}
                  onChange={(e) => setNewFilename(sanitizeFilename(e.target.value))}
                  placeholder="e.g. Unit 3A.pdf"
                  className="w-full px-3 py-2 font-mono text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md shadow-indigo-600/20 transition-all"
                >
                  Add Part
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
