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
  Sparkles,
  Info,
  BookOpen
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
  onPreviewPart: (part: DetectedPart, initialPage?: number) => void;
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
  const assignedPagesSet = new Set<number>();
  parts.forEach((p) => {
    const start = Math.max(1, p.startPage);
    const end = Math.min(totalPages, p.endPage);
    for (let pg = start; pg <= end; pg++) {
      assignedPagesSet.add(pg);
    }
  });

  const assignedPagesCount = assignedPagesSet.size;
  const unassignedPagesCount = Math.max(0, totalPages - assignedPagesCount);

  // Compute unassigned page ranges for user summary
  const unassignedRanges: string[] = [];
  let rangeStart: number | null = null;
  for (let pg = 1; pg <= totalPages; pg++) {
    if (!assignedPagesSet.has(pg)) {
      if (rangeStart === null) rangeStart = pg;
    } else {
      if (rangeStart !== null) {
        unassignedRanges.push(rangeStart === pg - 1 ? `p. ${rangeStart}` : `pp. ${rangeStart}–${pg - 1}`);
        rangeStart = null;
      }
    }
  }
  if (rangeStart !== null) {
    unassignedRanges.push(rangeStart === totalPages ? `p. ${rangeStart}` : `pp. ${rangeStart}–${totalPages}`);
  }

  const computedConfidence: ConfidenceLevel =
    overallConfidence ||
    (parts.length > 0 && parts.every((p) => p.confidence === 'High') ? 'High' : 'Medium');

  const getConfidenceBadge = (confidence: ConfidenceLevel) => {
    switch (confidence) {
      case 'High':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-brand/10 text-brand border border-brand/20">
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            Medium
          </span>
        );
      case 'Low':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-paper text-muted border border-border">
            Low
          </span>
        );
    }
  };

  return (
    <div className="bg-surface rounded-md border border-border p-6 shadow-subtle space-y-6 relative overflow-hidden text-ink">
      {/* Top Bar: Mode Selection & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="bg-paper p-1 rounded-md flex items-center space-x-1 border border-border">
            <button
              type="button"
              onClick={() => setSplitMode('auto')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                splitMode === 'auto'
                  ? 'bg-brand text-brand-fg font-bold shadow-subtle'
                  : 'text-muted hover:text-ink hover:bg-surface'
              }`}
            >
              Auto Detect Units
            </button>
            <button
              type="button"
              onClick={() => setSplitMode('manual')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                splitMode === 'manual'
                  ? 'bg-brand text-brand-fg font-bold shadow-subtle'
                  : 'text-muted hover:text-ink hover:bg-surface'
              }`}
            >
              Manual Split
            </button>
          </div>

          <span className="text-xs text-muted hidden md:inline-block">
            {parts.length} {parts.length === 1 ? 'part' : 'parts'} defined
          </span>
        </div>

        {/* Project Load / Save & Reset Buttons */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onLoadProject}
            className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-ink bg-surface hover:bg-paper border border-border transition-colors cursor-pointer"
            title="Load existing .project.json settings"
          >
            <FolderOpen className="w-3.5 h-3.5 mr-1 text-muted" />
            Load Project
          </button>
          <button
            type="button"
            onClick={onSaveProject}
            className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-ink bg-surface hover:bg-paper border border-border transition-colors cursor-pointer"
            title="Save your parts & ranges as .project.json"
          >
            <Save className="w-3.5 h-3.5 mr-1 text-muted" />
            Save Project
          </button>
          <button
            type="button"
            onClick={onResetParts}
            className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-ink bg-surface hover:bg-paper border border-border transition-colors cursor-pointer"
            title="Reset parts back to initial state"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1 text-muted" />
            Reset
          </button>
        </div>
      </div>

      {/* Analysis & Physical Page Coverage Summary */}
      <div className="p-4 rounded-md bg-paper border border-border space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
              Detection Review &amp; Page Coverage Summary
            </h4>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted">Overall Confidence:</span>
            {getConfidenceBadge(computedConfidence)}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-md bg-surface border border-border">
            <span className="text-muted block text-[11px]">Total Physical Pages</span>
            <span className="font-bold text-ink text-sm">{totalPages}</span>
          </div>
          <div className="p-2.5 rounded-md bg-surface border border-border">
            <span className="text-muted block text-[11px]">Units Defined</span>
            <span className="font-bold text-ink text-sm">{parts.length}</span>
          </div>
          <div className="p-2.5 rounded-md bg-surface border border-border">
            <span className="text-muted block text-[11px]">Included in Cut</span>
            <span className="font-bold text-brand text-sm">
              {assignedPagesCount} / {totalPages} pages
            </span>
          </div>
          <div className="p-2.5 rounded-md bg-surface border border-border">
            <span className="text-muted block text-[11px]">Excluded Pages</span>
            <span
              className={`font-bold text-sm ${
                unassignedPagesCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted'
              }`}
            >
              {unassignedPagesCount} {unassignedPagesCount > 0 ? `(${unassignedRanges.join(', ')})` : ''}
            </span>
          </div>
        </div>

        {/* Warning: Single Unit in Multi-Page Document */}
        {parts.length === 1 && totalPages > 15 && (
          <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Review Recommended: Only 1 unit detected across {totalPages} pages.</span>
              <p className="mt-0.5 text-muted">
                Textbooks usually contain multiple units or chapters. If additional units are present, please use &ldquo;+ Add Part&rdquo; or switch to &ldquo;Manual Split&rdquo; to define individual unit boundaries before cutting.
              </p>
            </div>
          </div>
        )}

        {/* Warning: Uncertain Mapping */}
        {isUncertain && (
          <div
            className={`p-3.5 rounded-md border text-xs transition-colors ${
              isBoundariesConfirmed
                ? 'bg-brand/10 border-brand/30 text-ink'
                : 'bg-amber-500/10 border-amber-500/30 text-ink'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {isBoundariesConfirmed ? (
                <CheckCircle2 className="w-4 h-4 text-brand shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1.5 flex-1">
                <span className="font-bold block">
                  {isBoundariesConfirmed
                    ? 'Unit Boundaries Confirmed'
                    : 'Manual Boundary Confirmation Required'}
                </span>
                <p className="text-muted">
                  {uncertaintyReason ||
                    'TOC-to-physical-page mapping could not be conclusively verified against physical headings.'}
                </p>
                {!isBoundariesConfirmed ? (
                  <div className="space-y-3 pt-1">
                    {/* Unit Boundaries Review List */}
                    <div className="p-2.5 rounded-md bg-surface border border-border">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5 flex items-center justify-between">
                        <span>Unit Boundaries for Review ({parts.length} total):</span>
                        <span className="text-[10px] font-normal lowercase">Physical page numbers</span>
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1 text-[11px]">
                        {parts.map((p, idx) => (
                          <div
                            key={p.id || idx}
                            className="flex items-center justify-between py-1 border-b border-border last:border-0"
                          >
                            <span className="font-medium truncate max-w-[280px] text-ink">
                              {p.title}
                            </span>
                            <span className="font-mono font-bold text-ink shrink-0 ml-2">
                              Pages {p.startPage} – {p.endPage} ({Math.max(0, p.endPage - p.startPage + 1)} pp)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
                      <p className="text-[11px] text-muted max-w-md">
                        Please review each unit&apos;s start and end pages above or edit them in the table below. Confirming approves these exact physical ranges for extraction.
                      </p>
                      <button
                        type="button"
                        onClick={onConfirmBoundaries}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-brand hover:bg-brand/90 text-brand-fg font-semibold text-xs shadow-subtle transition-colors cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve &amp; Confirm Displayed Page Boundaries</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-0.5 text-[11px] text-brand font-medium flex items-center justify-between">
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
        <div className="p-4 bg-paper border border-border rounded-md space-y-2 text-ink">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-brand shrink-0 mt-0.5" />
            <div className="text-xs text-ink flex-1">
              <span className="font-semibold">Introductory Pages Detected (Pages 1–{frontMatterRange.end}):</span>
              <p className="text-muted mt-0.5">
                The first detected unit begins on page {frontMatterRange.end + 1}. What would you like to do with preliminary pages (cover, copyright, preface, contents)?
              </p>
              <div className="flex flex-wrap gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={() => onHandleFrontMatter('separate')}
                  className="px-3 py-1.5 rounded-md bg-brand hover:bg-brand/90 text-brand-fg font-medium transition-colors cursor-pointer"
                >
                  Create &quot;Part 0 — Front Matter&quot; (Pages 1–{frontMatterRange.end})
                </button>
                <button
                  type="button"
                  onClick={() => onHandleFrontMatter('include')}
                  className="px-3 py-1.5 rounded-md bg-surface text-ink font-medium border border-border hover:bg-paper transition-colors cursor-pointer"
                >
                  Include in Unit 1 (Extend start to page 1)
                </button>
                <button
                  type="button"
                  onClick={() => onHandleFrontMatter('exclude')}
                  className="px-3 py-1.5 rounded-md bg-surface text-muted font-medium border border-border hover:bg-paper transition-colors cursor-pointer"
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
        <div className="p-4 bg-accent/10 border border-accent/30 rounded-md space-y-1 text-xs text-accent">
          <div className="flex items-center space-x-2 font-semibold mb-1">
            <AlertTriangle className="w-4 h-4 shrink-0" />
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
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-md space-y-2 text-xs text-amber-800 dark:text-amber-200">
          <div className="flex items-center space-x-2 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Range &amp; Filename Warnings:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 pl-1">
            {validation.warnings.map((warn, i) => (
              <li key={i}>{warn}</li>
            ))}
          </ul>

          {/* Quick Resolution Actions for Unassigned Page Gaps */}
          {validation.gaps.length > 0 && (
            <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-ink">Quick Fix:</span>
              {validation.gaps.some((g) => g.startPage === 1) && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const firstGap = validation.gaps.find((g) => g.startPage === 1);
                      if (firstGap) {
                        onAddPart({
                          title: 'Part 0 — Front Matter',
                          startPage: 1,
                          endPage: firstGap.endPage,
                          filename: sanitizeFilename(
                            `${originalFileName.replace(/\.pdf$/i, '')} - Front Matter.pdf`
                          ),
                          confidence: 'High',
                          source: 'manual',
                        });
                      }
                    }}
                    className="px-2.5 py-1 rounded-md bg-brand text-brand-fg font-medium hover:bg-brand/90 transition-colors cursor-pointer text-[11px]"
                  >
                    Add &quot;Front Matter&quot; for Pages 1–{validation.gaps.find((g) => g.startPage === 1)?.endPage}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (parts.length > 0) {
                        onUpdatePart(parts[0].id, { startPage: 1 });
                      }
                    }}
                    className="px-2.5 py-1 rounded-md bg-surface border border-border text-ink font-medium hover:bg-paper transition-colors cursor-pointer text-[11px]"
                  >
                    Extend Unit 1 to start at Page 1
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Output Filename Naming Pattern Toolbar */}
      <div className="bg-paper border border-border rounded-md p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-4">
          <span className="font-semibold text-ink flex items-center">
            <Settings2 className="w-4 h-4 mr-1.5 text-brand" />
            Output Filename Format:
          </span>
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="radio"
              checked={namingMode === 'custom'}
              onChange={() => setNamingMode('custom')}
              className="text-brand focus:ring-brand"
            />
            <span className="text-muted font-medium">Custom names</span>
          </label>
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="radio"
              checked={namingMode === 'auto'}
              onChange={() => setNamingMode('auto')}
              className="text-brand focus:ring-brand"
            />
            <span className="text-muted font-medium">Automatic prefix</span>
          </label>
        </div>

        {namingMode === 'auto' && (
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={autoPrefix}
              onChange={(e) => setAutoPrefix(e.target.value)}
              placeholder="e.g. Biology Grade 10"
              className="px-2.5 py-1.5 border border-border rounded-md text-xs bg-surface text-ink focus:outline-hidden focus:border-brand"
            />
            <button
              type="button"
              onClick={handleAutoRenameAll}
              className="px-3 py-1.5 rounded-md bg-brand text-brand-fg hover:bg-brand/90 font-medium text-xs transition-colors cursor-pointer"
            >
              Apply to All Files
            </button>
          </div>
        )}
      </div>

      {/* Parts Table */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-paper border-b border-border text-ink/80 dark:text-ink/80 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3 w-10 text-center">#</th>
              <th className="py-3 px-3 min-w-[180px]">Section Title</th>
              <th className="py-3 px-3 w-24 text-center">Start</th>
              <th className="py-3 px-3 w-24 text-center">End</th>
              <th className="py-3 px-3 w-20 text-center">Pages</th>
              <th className="py-3 px-3 w-28 text-center">Confidence</th>
              <th className="py-3 px-3 min-w-[200px]">Output Filename</th>
              <th className="py-3 px-3 w-48 text-center">Boundary Preview &amp; Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {parts.map((part, index) => {
              const pageCount =
                part.startPage && part.endPage
                  ? Math.max(0, part.endPage - part.startPage + 1)
                  : 0;

              return (
                <tr
                  key={part.id}
                  className="hover:bg-paper/80 dark:hover:bg-paper/60 focus-within:bg-paper/90 dark:focus-within:bg-paper/50 transition-colors group"
                >
                  {/* Number index */}
                  <td className="py-2.5 px-3 w-10 text-center text-ink font-semibold font-mono text-xs">
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
                      className="w-full px-2.5 py-1.5 border border-transparent hover:border-border focus:border-brand rounded-md bg-transparent focus:bg-surface text-ink placeholder:text-muted font-medium focus:outline-hidden transition-all text-xs sm:text-sm"
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
                      className="w-18 px-2 py-1.5 text-center font-mono border border-border rounded-md text-ink font-medium focus:outline-hidden focus:border-brand bg-paper/60 hover:bg-paper focus:bg-surface text-xs sm:text-sm"
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
                      className="w-18 px-2 py-1.5 text-center font-mono border border-border rounded-md text-ink font-medium focus:outline-hidden focus:border-brand bg-paper/60 hover:bg-paper focus:bg-surface text-xs sm:text-sm"
                    />
                  </td>

                  {/* Pages badge */}
                  <td className="py-2 px-3 text-center">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-sm bg-paper text-ink border border-border">
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
                        className="w-full px-2.5 py-1.5 font-mono text-xs border border-border rounded-md bg-paper/40 hover:bg-paper focus:border-brand focus:bg-surface text-ink placeholder:text-muted focus:outline-hidden transition-all"
                      />
                    </div>
                  </td>

                  {/* Boundary Preview & Action Buttons */}
                  <td className="py-2 px-3 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      {/* Preview First Page */}
                      <button
                        type="button"
                        onClick={() => onPreviewPart(part, part.startPage)}
                        title={`Preview first page of "${part.title}" (Page ${part.startPage})`}
                        className="px-1.5 py-1 rounded-md text-[11px] font-medium text-muted hover:text-brand hover:bg-paper border border-transparent hover:border-border transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 inline mr-0.5" />
                        p.{part.startPage}
                      </button>

                      {/* Preview Last Page */}
                      <button
                        type="button"
                        onClick={() => onPreviewPart(part, part.endPage)}
                        title={`Preview last page of "${part.title}" (Page ${part.endPage})`}
                        className="px-1.5 py-1 rounded-md text-[11px] font-medium text-muted hover:text-brand hover:bg-paper border border-transparent hover:border-border transition-colors cursor-pointer"
                      >
                        p.{part.endPage}
                      </button>

                      {/* Individual Download Button */}
                      <button
                        type="button"
                        onClick={() => onDownloadSinglePart(part)}
                        title={`Download "${part.title}" (Pages ${part.startPage}–${part.endPage})`}
                        className="p-1.5 rounded-md text-muted hover:text-brand hover:bg-paper transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Duplicate */}
                      <button
                        type="button"
                        onClick={() => onDuplicatePart(part.id)}
                        title="Duplicate this part (e.g. into Part A / B)"
                        className="p-1.5 rounded-md text-muted hover:text-brand hover:bg-paper transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Move Up */}
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => onMovePart(index, 'up')}
                        title="Move Up"
                        className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-paper disabled:opacity-30 transition-colors cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        disabled={index === parts.length - 1}
                        onClick={() => onMovePart(index, 'down')}
                        title="Move Down"
                        className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-paper disabled:opacity-30 transition-colors cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => onDeletePart(part.id)}
                        title="Delete part"
                        className="p-1.5 rounded-md text-muted hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
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
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-md border border-dashed border-border hover:border-brand bg-paper hover:bg-paper/80 text-ink font-semibold text-xs sm:text-sm transition-colors shadow-subtle cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5 text-brand" />
          + Add Part
        </button>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onApplyAll}
            className="px-4 py-2 rounded-md text-xs font-semibold text-ink bg-surface hover:bg-paper border border-border transition-colors cursor-pointer"
          >
            Apply Changes
          </button>
        </div>
      </div>

      {/* Output Destination & Execute Cut Section */}
      <div className="pt-6 border-t border-border flex flex-col md:flex-row md:items-center justify-between gap-6 bg-paper -mx-6 -mb-6 p-6 rounded-b-md">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-ink">Output Folder:</span>
            {isFolderSupported ? (
              <button
                type="button"
                onClick={onChooseFolder}
                className="text-xs font-medium text-brand hover:underline flex items-center cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 mr-1" />
                {selectedFolderText || 'Choose Folder (File System Access)'}
              </button>
            ) : (
              <span className="text-xs text-muted">
                Direct browser download / Universal ZIP bundle
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted">
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
          className="w-full md:w-auto px-7 py-3 rounded-md bg-brand hover:bg-brand/90 text-brand-fg font-semibold text-base shadow-subtle disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 cursor-pointer transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40">
          <div className="bg-surface rounded-md p-6 max-w-md w-full shadow-subtle border border-border text-ink space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-ink text-base">Add New Part</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-muted hover:text-ink text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-ink font-medium mb-1">
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
                  className="w-full px-3 py-2 border border-border rounded-md bg-paper text-ink focus:outline-hidden focus:border-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink font-medium mb-1">
                    Start Page
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    required
                    value={newStart}
                    onChange={(e) => setNewStart(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-border rounded-md font-mono bg-paper text-ink focus:outline-hidden focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-ink font-medium mb-1">
                    End Page
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    required
                    value={newEnd}
                    onChange={(e) => setNewEnd(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-border rounded-md font-mono bg-paper text-ink focus:outline-hidden focus:border-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block text-ink font-medium mb-1">
                  Filename
                </label>
                <input
                  type="text"
                  required
                  value={newFilename}
                  onChange={(e) => setNewFilename(sanitizeFilename(e.target.value))}
                  placeholder="e.g. Unit 3A.pdf"
                  className="w-full px-3 py-2 font-mono text-xs border border-border rounded-md bg-paper text-ink focus:outline-hidden focus:border-brand"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-md text-muted hover:text-ink hover:bg-paper font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-md bg-brand text-brand-fg hover:bg-brand/90 font-semibold shadow-subtle transition-colors cursor-pointer"
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
