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
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      {/* Top Bar: Mode Selection & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1 border border-slate-200/70">
            <button
              type="button"
              onClick={() => setSplitMode('auto')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                splitMode === 'auto'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Auto Detect Units
            </button>
            <button
              type="button"
              onClick={() => setSplitMode('manual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                splitMode === 'manual'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
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

      {/* Front Matter Suggestion Alert */}
      {hasFrontMatter && frontMatterRange && (
        <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
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
                        onClick={() => onDownloadSinglePart(part)}
                        title="Download this single PDF part now"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
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
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 font-semibold text-xs sm:text-sm transition-all"
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
      <div className="pt-6 border-t border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/60 -mx-6 -mb-6 p-6 rounded-b-2xl">
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

        {/* The Big CUT PDF Action Button */}
        <button
          type="button"
          disabled={parts.length === 0 || !validation.isValid}
          onClick={onCutPdf}
          className="w-full md:w-auto px-8 py-3.5 rounded-xl font-bold text-base text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 transition-all transform active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
