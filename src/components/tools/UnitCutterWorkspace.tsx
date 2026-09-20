'use client';

import React, { useState, useEffect } from 'react';
import {
  DocumentSection,
  DocumentStructure,
  StructureValidationResult,
} from '@/types/structure';
import {
  validateSectionInvariants,
  splitSection,
  mergeSections,
  createManualSection,
} from '@/lib/structureDetector';
import { PdfPageViewer } from '@/components/pdf/PdfPageViewer';
import { PdfThumbnailRail } from '@/components/pdf/PdfThumbnailRail';
import { PdfWorkspaceToolbar } from '@/components/pdf/PdfWorkspaceToolbar';
import {
  BookOpen,
  Layers,
  Scissors,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  ArrowRight,
  RotateCcw,
  Sliders,
  FileText,
  Merge,
  Split,
  ChevronRight,
  Info,
  ShieldAlert,
} from 'lucide-react';

export interface UnitCutterWorkspaceProps {
  structure: DocumentStructure;
  pdfBuffer: ArrayBuffer;
  filename: string;
  totalPages: number;
  onReset: () => void;
  onProceedToCut?: (sections: DocumentSection[]) => void;
}

export const UnitCutterWorkspace: React.FC<UnitCutterWorkspaceProps> = ({
  structure: initialStructure,
  pdfBuffer,
  filename,
  totalPages,
  onReset,
  onProceedToCut,
}) => {
  const [sections, setSections] = useState<DocumentSection[]>(initialStructure.sections);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    initialStructure.sections[0]?.id || null
  );
  const [currentPage, setCurrentPage] = useState<number>(
    initialStructure.sections[0]?.startPage || 1
  );
  const [zoom, setZoom] = useState<number>(1.0);
  const [mobileTab, setMobileTab] = useState<'structure' | 'preview' | 'inspector'>('preview');

  // Split dialog state
  const [splitPageInput, setSplitPageInput] = useState<number>(currentPage);

  // Selected section reference
  const selectedSection = sections.find((s) => s.id === selectedSectionId) || sections[0] || null;

  // Real-time validation
  const validation: StructureValidationResult = validateSectionInvariants(sections, totalPages);

  // Synchronize preview page when selecting a section
  const handleSelectSection = (s: DocumentSection) => {
    setSelectedSectionId(s.id);
    if (s.startPage >= 1 && s.startPage <= totalPages) {
      setCurrentPage(s.startPage);
    }
  };

  // Section mutations
  const handleUpdateSelected = (updated: Partial<DocumentSection>) => {
    if (!selectedSection) return;
    setSections((prev) =>
      prev.map((s) => (s.id === selectedSection.id ? { ...s, ...updated, isUserModified: true } : s))
    );
  };

  const handleDeleteSelected = () => {
    if (!selectedSection) return;
    const remaining = sections.filter((s) => s.id !== selectedSection.id);
    setSections(remaining);
    if (remaining.length > 0) {
      setSelectedSectionId(remaining[0].id);
      setCurrentPage(remaining[0].startPage);
    } else {
      setSelectedSectionId(null);
    }
  };

  const handleSplitSelected = () => {
    if (!selectedSection || selectedSection.startPage >= selectedSection.endPage) return;
    const [partA, partB] = splitSection(selectedSection, splitPageInput, totalPages);
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === selectedSection.id);
      const next = [...prev];
      next.splice(idx, 1, partA, partB);
      return next;
    });
    setSelectedSectionId(partB.id);
    setCurrentPage(partB.startPage);
  };

  const handleMergeWithNext = () => {
    if (!selectedSection) return;
    const idx = sections.findIndex((s) => s.id === selectedSection.id);
    if (idx < 0 || idx >= sections.length - 1) return;
    const nextSection = sections[idx + 1];
    const merged = mergeSections(selectedSection, nextSection);
    setSections((prev) => {
      const copy = [...prev];
      copy.splice(idx, 2, merged);
      return copy;
    });
    setSelectedSectionId(merged.id);
  };

  const handleAddManualSection = () => {
    const lastSection = sections[sections.length - 1];
    const start = lastSection ? Math.min(totalPages, lastSection.endPage + 1) : 1;
    const end = Math.min(totalPages, start + 9);
    const newSection = createManualSection(start, end, sections.length + 1, totalPages);
    setSections((prev) => [...prev, newSection]);
    setSelectedSectionId(newSection.id);
    setCurrentPage(newSection.startPage);
  };

  // Confidence color pill helper
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 90) {
      return (
        <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
          High {confidence}%
        </span>
      );
    }
    if (confidence >= 70) {
      return (
        <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
          Med {confidence}%
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-[10px] font-bold border border-rose-200 dark:border-rose-800 flex items-center gap-1">
        <AlertTriangle size={10} /> Review {confidence}%
      </span>
    );
  };

  const getSourceBadge = (source: string) => {
    const map: Record<string, string> = {
      outline: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200',
      toc: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200',
      heading: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200',
      manual: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300',
      heuristic: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200',
    };
    return (
      <span
        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
          map[source] || map.manual
        }`}
      >
        {source}
      </span>
    );
  };

  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 shadow-inner">
            <BookOpen size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                PDF Unit Cutter 2.0 — Structure Workspace
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300">
                {sections.length} Units Detected
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
              <span className="truncate">{filename}</span>
              <span>•</span>
              <span>{totalPages} page(s)</span>
              <span>•</span>
              <span className="capitalize font-semibold text-slate-700 dark:text-slate-300">
                {initialStructure.classification} document
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
          >
            <RotateCcw size={13} />
            <span>Upload New PDF</span>
          </button>
        </div>
      </div>

      {/* Detection Summary Banner */}
      {initialStructure.detectionSummary && (
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Sparkles size={16} className="text-brand-500 shrink-0" />
            <span>{initialStructure.detectionSummary}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleAddManualSection}
              className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 flex items-center gap-1"
            >
              <Plus size={13} /> Add Section
            </button>
          </div>
        </div>
      )}

      {/* Scanned Document Alert if Applicable */}
      {initialStructure.classification === 'scanned-only' && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-3">
          <ShieldAlert size={18} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Scanned Document Detected (No Digital Text Stream)</p>
            <p className="text-slate-600 dark:text-slate-400">
              No digital headings or outline bookmarks could be extracted because this PDF contains flat images.
              You can run OCR to make the document searchable or manually define unit page boundaries below.
            </p>
            {sections.length === 0 && (
              <button
                type="button"
                onClick={handleAddManualSection}
                className="mt-2 px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 inline-flex items-center gap-1.5"
              >
                <Plus size={13} /> Create Sections Manually
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Tab Navigator (Hidden on Desktop) */}
      <div className="flex lg:hidden rounded-2xl bg-slate-100 dark:bg-slate-800 p-1">
        <button
          type="button"
          onClick={() => setMobileTab('structure')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
            mobileTab === 'structure'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Structure ({sections.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
            mobileTab === 'preview'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          PDF Preview
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('inspector')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
            mobileTab === 'inspector'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Edit Selected
        </button>
      </div>

      {/* Main 3-Column Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* COLUMN 1: Document Structure Navigator (Tree / Section List) */}
        <div
          className={`lg:col-span-3 xl:col-span-3 flex flex-col h-[700px] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm ${
            mobileTab !== 'structure' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Document Hierarchy
            </span>
            <button
              type="button"
              onClick={handleAddManualSection}
              className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              <Plus size={12} /> Add
            </button>
          </div>

          {sections.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-3">
              <BookOpen size={32} className="text-slate-400" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No reliable unit structure was detected.
                </p>
                <p className="text-[11px] text-slate-500">
                  You can define custom chapter or unit page boundaries manually.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddManualSection}
                className="px-3.5 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold shadow-sm hover:bg-brand-700"
              >
                Create Sections Manually
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {sections.map((sec, idx) => {
                const isSelected = sec.id === selectedSectionId;
                const isCurrentPageInSection =
                  currentPage >= sec.startPage && currentPage <= sec.endPage;

                return (
                  <div
                    key={sec.id}
                    onClick={() => handleSelectSection(sec)}
                    style={{ paddingLeft: `${Math.max(8, sec.level * 12)}px` }}
                    className={`p-2.5 rounded-2xl cursor-pointer transition-all border text-left ${
                      isSelected
                        ? 'bg-brand-50/90 dark:bg-brand-950/40 border-brand-500 shadow-sm ring-1 ring-brand-500/20'
                        : isCurrentPageInSection
                        ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5 mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                        {sec.title}
                      </span>
                      {getConfidenceBadge(sec.confidence)}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-mono">
                        pp. {sec.startPage}–{sec.endPage}
                        {sec.printedStartPage && (
                          <span className="text-slate-400 ml-1">[{sec.printedStartPage}]</span>
                        )}
                      </span>
                      {getSourceBadge(sec.source)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMN 2: Central Genuine PDF Preview */}
        <div
          className={`lg:col-span-6 xl:col-span-6 flex flex-col gap-3 ${
            mobileTab !== 'preview' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Toolbar */}
          <PdfWorkspaceToolbar
            currentPage={currentPage}
            totalPages={totalPages}
            zoom={zoom}
            onPageChange={setCurrentPage}
            onZoomChange={setZoom}
            onFitWidth={() => setZoom(1.2)}
            onFitPage={() => setZoom(0.85)}
          />

          {/* Genuine PDF Canvas Viewer */}
          <div className="h-[640px] rounded-3xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 shadow-inner overflow-auto flex items-center justify-center relative scrollbar-thin">
            <PdfPageViewer
              pdfBuffer={pdfBuffer}
              currentPage={currentPage}
              scale={zoom}
              mode="none"
            />
          </div>
        </div>

        {/* COLUMN 3: Selected Section Inspector & Structure Editor */}
        <div
          className={`lg:col-span-3 xl:col-span-3 flex flex-col gap-4 ${
            mobileTab !== 'inspector' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {selectedSection ? (
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Section Details
                </span>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  title="Delete this section"
                  className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Title Rename */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Section Title
                </label>
                <input
                  type="text"
                  value={selectedSection.title}
                  onChange={(e) => handleUpdateSelected({ title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-brand-500 outline-hidden"
                />
              </div>

              {/* Hierarchy Level */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Heading Level
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { lvl: 1, label: 'Unit (L1)' },
                    { lvl: 2, label: 'Section (L2)' },
                    { lvl: 3, label: 'Topic (L3)' },
                  ].map((l) => (
                    <button
                      key={l.lvl}
                      type="button"
                      onClick={() => handleUpdateSelected({ level: l.lvl })}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center ${
                        selectedSection.level === l.lvl
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page Boundaries with Invariant Constraints */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Start Page
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={selectedSection.startPage}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(totalPages, parseInt(e.target.value, 10) || 1));
                      handleUpdateSelected({ startPage: val });
                      setCurrentPage(val);
                    }}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    End Page
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={selectedSection.endPage}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(totalPages, parseInt(e.target.value, 10) || 1));
                      handleUpdateSelected({ endPage: val });
                    }}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Quick Split / Merge Action Buttons */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Structural Operations
                </label>
                <div className="flex flex-col gap-2">
                  {selectedSection.endPage > selectedSection.startPage && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        <span>Split at page:</span>
                        <input
                          type="number"
                          min={selectedSection.startPage}
                          max={selectedSection.endPage - 1}
                          value={splitPageInput}
                          onChange={(e) => setSplitPageInput(parseInt(e.target.value, 10) || selectedSection.startPage)}
                          className="w-16 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-center font-bold text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSplitSelected}
                        className="w-full py-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 text-xs font-bold hover:bg-brand-100 flex items-center justify-center gap-1.5"
                      >
                        <Split size={12} /> Split into 2 Sections
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleMergeWithNext}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5"
                  >
                    <Merge size={12} /> Merge with Next Section
                  </button>
                </div>
              </div>

              {/* Confidence & Source Diagnostic Note */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                  <span>Source: {selectedSection.source}</span>
                  <span>{selectedSection.confidence}% confidence</span>
                </div>
                {selectedSection.notes && (
                  <p className="leading-relaxed">{selectedSection.notes}</p>
                )}
              </div>

              {/* Validation Warnings */}
              {!validation.isValid && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-700 dark:text-rose-300 space-y-1">
                  <span className="font-bold block flex items-center gap-1">
                    <AlertTriangle size={12} /> Boundary Validation Error:
                  </span>
                  {validation.issues.map((iss, i) => (
                    <p key={i}>{iss.message}</p>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
