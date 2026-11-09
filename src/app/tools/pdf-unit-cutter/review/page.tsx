'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  FolderOpen,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  Trash2,
  Upload,
  ArrowLeft,
  RefreshCw,
  Plus,
  ShieldCheck,
  Check,
  Edit3,
  Archive,
  Info
} from 'lucide-react';
import { ToolLayout } from '@/components/tools/ToolLayout';
import { getToolBySlug } from '@/config/tools';
import {
  processPdfForReview,
  BatchItemResult,
} from '@/lib/batchReviewProcessor';
import {
  saveFeedbackRecord,
  getAllFeedbackRecords,
  deleteFeedbackRecord,
  exportFeedbackJson,
  importFeedbackJson,
  FeedbackRecord,
  DETECTOR_VERSION,
} from '@/lib/feedbackDb';
import { downloadFile } from '@/lib/cutter';

interface EditableUnit {
  id: string;
  title: string;
  startPage: number;
  endPage: number;
}

export default function PdfDetectorReviewPage() {
  const tool = getToolBySlug('pdf-unit-cutter')!;

  const [filesToProcess, setFilesToProcess] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [results, setResults] = useState<BatchItemResult[]>([]);
  const [activeCorrectionId, setActiveCorrectionId] = useState<string | null>(null);
  const [correctionUnits, setCorrectionUnits] = useState<Record<string, EditableUnit[]>>({});
  const [correctionErrors, setCorrectionErrors] = useState<Record<string, string[]>>({});
  const [datasetRecords, setDatasetRecords] = useState<FeedbackRecord[]>([]);
  const [datasetMessage, setDatasetMessage] = useState<string | null>(null);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const jsonImportRef = useRef<HTMLInputElement>(null);
  const isCancelledRef = useRef<boolean>(false);

  // Load local IndexedDB records on mount
  useEffect(() => {
    loadDataset();
  }, []);

  async function loadDataset() {
    try {
      const records = await getAllFeedbackRecords();
      setDatasetRecords(records);
    } catch (err: any) {
      console.error('Failed to load feedback records:', err);
    }
  }

  // Handle Directory Picker API (Modern Edge/Chrome)
  const handleDirectoryPicker = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        const collectedFiles: File[] = [];

        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.pdf')) {
            const file = await entry.getFile();
            collectedFiles.push(file);
          }
        }

        if (collectedFiles.length === 0) {
          alert('No PDF files found in the selected directory.');
          return;
        }

        startBatchProcessing(collectedFiles);
      } else if (folderInputRef.current) {
        folderInputRef.current.click();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Directory picker error:', err);
        folderInputRef.current?.click();
      }
    }
  };

  // Handle Standard Folder Input Fallback
  const handleFolderInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const pdfs: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.name.toLowerCase().endsWith('.pdf')) {
        pdfs.push(file);
      }
    }

    if (pdfs.length === 0) {
      alert('No PDF files found in selected folder.');
      return;
    }

    startBatchProcessing(pdfs);
  };

  // Sequential Batch Processing (Client-Side)
  const startBatchProcessing = async (files: File[]) => {
    setFilesToProcess(files);
    setIsProcessing(true);
    isCancelledRef.current = false;
    setResults([]);

    const batchResults: BatchItemResult[] = [];

    for (let i = 0; i < files.length; i++) {
      if (isCancelledRef.current) break;

      setCurrentFileIndex(i);
      const file = files[i];

      try {
        const itemResult = await processPdfForReview(file, (msg) => {
          setStatusMessage(`File ${i + 1} of ${files.length} (${file.name}): ${msg}`);
        });

        // Initialize editable units in case user selects INCORRECT
        setCorrectionUnits((prev) => ({
          ...prev,
          [itemResult.id]: itemResult.parts.map((p, idx) => ({
            id: `unit_${idx}_${Date.now()}`,
            title: p.title,
            startPage: p.startPage,
            endPage: p.endPage,
          })),
        }));

        batchResults.push(itemResult);
        setResults([...batchResults]);
      } catch (fileErr: any) {
        console.error(`Error processing ${file.name}:`, fileErr);
        batchResults.push({
          id: `err_${i}_${Date.now()}`,
          filename: file.name,
          fileSize: file.size,
          fingerprint: 'error',
          pageCount: 0,
          language: 'unknown',
          detection: {
            parts: [],
            hasFrontMatter: false,
            isUncertain: true,
            assignedPagesCount: 0,
            unassignedPagesCount: 0,
            overallConfidence: 'Low',
          },
          evidence: [],
          parts: [],
          unitSlices: [],
          zipBlob: null,
          zipValid: false,
          zipEntryCount: 0,
          status: 'error',
          errorMessage: fileErr.message || 'Failed to parse PDF',
        });
        setResults([...batchResults]);
      }
    }

    setIsProcessing(false);
    setStatusMessage(`Completed processing ${batchResults.length} PDFs.`);
  };

  // Mark document as CORRECT
  const handleMarkCorrect = async (item: BatchItemResult) => {
    const feedback: FeedbackRecord = {
      id: item.fingerprint,
      documentFingerprint: item.fingerprint,
      filename: item.filename,
      pageCount: item.pageCount,
      language: item.language,
      extractedHeadingEvidence: item.evidence,
      detectorVersion: DETECTOR_VERSION,
      originalBoundaries: item.parts.map((p) => ({
        title: p.title,
        startPage: p.startPage,
        endPage: p.endPage,
        confidence: p.confidence,
      })),
      decision: 'CORRECT',
      timestamp: new Date().toISOString(),
    };

    await saveFeedbackRecord(feedback);

    setResults((prev) =>
      prev.map((r) => (r.id === item.id ? { ...r, status: 'correct', feedbackRecord: feedback } : r))
    );

    await loadDataset();
  };

  // Open correction view for INCORRECT
  const handleOpenCorrection = (item: BatchItemResult) => {
    setActiveCorrectionId(item.id);
  };

  // Add unit in correction editor
  const handleAddUnit = (itemId: string, pageCount: number) => {
    const current = correctionUnits[itemId] || [];
    const lastUnit = current[current.length - 1];
    const newStart = lastUnit ? Math.min(pageCount, lastUnit.endPage + 1) : 1;
    const newEnd = Math.min(pageCount, newStart + 10);

    const updated: EditableUnit[] = [
      ...current,
      {
        id: `unit_new_${Date.now()}`,
        title: `Unit ${current.length + 1}`,
        startPage: newStart,
        endPage: newEnd,
      },
    ];

    setCorrectionUnits((prev) => ({ ...prev, [itemId]: updated }));
    validateUnitRanges(itemId, updated, pageCount);
  };

  // Remove unit in correction editor
  const handleRemoveUnit = (itemId: string, unitId: string, pageCount: number) => {
    const current = correctionUnits[itemId] || [];
    const updated = current.filter((u) => u.id !== unitId);
    setCorrectionUnits((prev) => ({ ...prev, [itemId]: updated }));
    validateUnitRanges(itemId, updated, pageCount);
  };

  // Update unit values
  const handleUpdateUnit = (
    itemId: string,
    unitId: string,
    field: 'title' | 'startPage' | 'endPage',
    val: string | number,
    pageCount: number
  ) => {
    const current = correctionUnits[itemId] || [];
    const updated = current.map((u) => {
      if (u.id === unitId) {
        return { ...u, [field]: val };
      }
      return u;
    });

    setCorrectionUnits((prev) => ({ ...prev, [itemId]: updated }));
    validateUnitRanges(itemId, updated, pageCount);
  };

  // Range validation for boundaries
  const validateUnitRanges = (itemId: string, units: EditableUnit[], totalPages: number): boolean => {
    const errors: string[] = [];

    if (units.length === 0) {
      errors.push('At least one unit must be defined.');
    }

    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      if (!u.title.trim()) {
        errors.push(`Unit ${i + 1}: Title cannot be empty.`);
      }
      if (u.startPage < 1) {
        errors.push(`"${u.title}": Start page cannot be less than 1.`);
      }
      if (u.endPage > totalPages) {
        errors.push(`"${u.title}": End page exceeds total pages (${totalPages}).`);
      }
      if (u.endPage < u.startPage) {
        errors.push(`"${u.title}": End page cannot be less than start page.`);
      }
    }

    // Overlap check
    const sorted = [...units].sort((a, b) => a.startPage - b.startPage);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].endPage >= sorted[i + 1].startPage) {
        errors.push(
          `Overlap detected: "${sorted[i].title}" (ends p.${sorted[i].endPage}) overlaps with "${sorted[i + 1].title}" (starts p.${sorted[i + 1].startPage}).`
        );
      }
    }

    setCorrectionErrors((prev) => ({ ...prev, [itemId]: errors }));
    return errors.length === 0;
  };

  // Save INCORRECT feedback with corrections
  const handleSaveCorrection = async (item: BatchItemResult) => {
    const units = correctionUnits[item.id] || [];
    const isValid = validateUnitRanges(item.id, units, item.pageCount);
    if (!isValid) return;

    const feedback: FeedbackRecord = {
      id: item.fingerprint,
      documentFingerprint: item.fingerprint,
      filename: item.filename,
      pageCount: item.pageCount,
      language: item.language,
      extractedHeadingEvidence: item.evidence,
      detectorVersion: DETECTOR_VERSION,
      originalBoundaries: item.parts.map((p) => ({
        title: p.title,
        startPage: p.startPage,
        endPage: p.endPage,
        confidence: p.confidence,
      })),
      correctedBoundaries: units.map((u) => ({
        title: u.title.trim(),
        startPage: Number(u.startPage),
        endPage: Number(u.endPage),
      })),
      decision: 'INCORRECT',
      timestamp: new Date().toISOString(),
    };

    await saveFeedbackRecord(feedback);

    setResults((prev) =>
      prev.map((r) => (r.id === item.id ? { ...r, status: 'incorrect', feedbackRecord: feedback } : r))
    );

    setActiveCorrectionId(null);
    await loadDataset();
  };

  // Export JSON
  const handleExportJson = async () => {
    const json = await exportFeedbackJson();
    const blob = new Blob([json], { type: 'application/json' });
    const filename = `docunexa-detector-feedback-${new Date().toISOString().slice(0, 10)}.json`;
    downloadFile(blob, filename);
  };

  // Import JSON
  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const res = await importFeedbackJson(text);
      if (res.errors.length > 0) {
        setDatasetMessage(`Imported ${res.importedCount} records with ${res.errors.length} warnings.`);
      } else {
        setDatasetMessage(`Successfully imported ${res.importedCount} records.`);
      }
      await loadDataset();
    } catch (err: any) {
      setDatasetMessage(`Import error: ${err.message}`);
    }
  };

  // Delete single record
  const handleDeleteRecord = async (id: string) => {
    await deleteFeedbackRecord(id);
    await loadDataset();
  };

  return (
    <ToolLayout tool={tool}>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Link
                href="/tools/pdf-unit-cutter"
                className="inline-flex items-center text-xs text-muted hover:text-ink transition-colors font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Back to PDF Unit Cutter
              </Link>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink mt-1 flex items-center">
              <ShieldCheck className="w-6 h-6 text-brand mr-2" />
              Detector Review & Supervised Learning Mode
            </h1>
            <p className="text-xs text-muted mt-1 max-w-2xl">
              Client-side evaluation suite for evaluating PDF Unit Cutter across folders of real textbooks.
              Validates physical page slicing, ZIP output integrity, and captures verified corrections into your local regression dataset.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleDirectoryPicker}
              disabled={isProcessing}
              className="inline-flex items-center px-4 py-2 rounded-md bg-brand text-brand-fg text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Select PDF Folder
            </button>
            <input
              ref={folderInputRef}
              type="file"
              // @ts-ignore
              webkitdirectory=""
              directory=""
              multiple
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFolderInputChange}
            />
          </div>
        </div>

        {/* Informational Disclaimer */}
        <div className="bg-paper border border-border rounded-md p-4 flex items-start space-x-3 text-xs text-muted">
          <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-ink">Strict Client-Side & Deterministic Rules: </span>
            This mode operates 100% locally in your browser. Source textbooks are never uploaded to any server.
            Feedback records are stored in local IndexedDB to build regression test suites for improving the deterministic rule engine.
          </div>
        </div>

        {/* Processing State Bar */}
        {isProcessing && (
          <div className="bg-surface border border-border rounded-md p-4 shadow-subtle space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink flex items-center">
                <RefreshCw className="w-4 h-4 mr-2 text-brand animate-spin" />
                Processing Sequentially: {currentFileIndex + 1} of {filesToProcess.length}
              </span>
              <button
                type="button"
                onClick={() => {
                  isCancelledRef.current = true;
                  setIsProcessing(false);
                }}
                className="text-xs text-accent hover:underline font-medium"
              >
                Cancel Batch
              </button>
            </div>
            <div className="w-full bg-paper rounded-full h-2 overflow-hidden border border-border">
              <div
                className="bg-brand h-2 transition-all duration-200"
                style={{
                  width: `${Math.round(((currentFileIndex + 1) / Math.max(1, filesToProcess.length)) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted truncate">{statusMessage}</p>
          </div>
        )}

        {/* Batch Results List */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted">
              Batch Evaluation Results ({results.length} Documents)
            </h2>

            <div className="space-y-4">
              {results.map((item, idx) => {
                const isCorrect = item.status === 'correct';
                const isIncorrect = item.status === 'incorrect';
                const isEditingCorrection = activeCorrectionId === item.id;
                const units = correctionUnits[item.id] || [];
                const errors = correctionErrors[item.id] || [];

                return (
                  <div
                    key={item.id}
                    className="bg-surface border border-border rounded-md shadow-subtle overflow-hidden"
                  >
                    {/* Item Summary Bar */}
                    <div className="p-4 bg-paper/50 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <FileText className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-ink text-sm">{item.filename}</h3>
                            <span className="text-2xs uppercase px-1.5 py-0.5 rounded-sm bg-surface border border-border text-muted font-mono">
                              {item.pageCount} Pages
                            </span>
                            <span className="text-2xs uppercase px-1.5 py-0.5 rounded-sm bg-surface border border-border text-muted font-mono">
                              Lang: {item.language.toUpperCase()}
                            </span>
                            <span
                              className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${
                                item.detection.overallConfidence === 'High'
                                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                  : item.detection.overallConfidence === 'Medium'
                                  ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                              }`}
                            >
                              {item.detection.overallConfidence} Confidence
                            </span>
                          </div>
                          <p className="text-xs text-muted mt-1">
                            Detected {item.parts.length} top-level units • Physical slice validation:{' '}
                            {item.unitSlices.every((s) => s.isValid) ? (
                              <span className="text-emerald-600 font-semibold">100% Verified</span>
                            ) : (
                              <span className="text-rose-600 font-semibold">Verification Mismatch</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Top Action Buttons */}
                      <div className="flex items-center flex-wrap gap-2">
                        {item.zipBlob && item.zipValid && (
                          <button
                            type="button"
                            onClick={() =>
                              downloadFile(item.zipBlob!, `${item.filename.replace(/\.pdf$/i, '')}_Units.zip`)
                            }
                            className="inline-flex items-center px-3 py-1.5 rounded-md border border-border bg-surface text-ink text-xs font-medium hover:bg-paper transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5 mr-1 text-brand" />
                            Download ZIP ({item.zipEntryCount})
                          </button>
                        )}

                        {/* CORRECT / INCORRECT Evaluation Buttons */}
                        {isCorrect ? (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs font-semibold">
                            <Check className="w-3.5 h-3.5 mr-1" />
                            Verified Correct
                          </span>
                        ) : isIncorrect ? (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 text-xs font-semibold">
                            <Edit3 className="w-3.5 h-3.5 mr-1" />
                            Correction Saved
                          </span>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleMarkCorrect(item)}
                              className="inline-flex items-center px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                              CORRECT
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenCorrection(item)}
                              className="inline-flex items-center px-3 py-1.5 rounded-md bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors cursor-pointer shadow-xs"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1.5" />
                              INCORRECT
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Detected Units Table */}
                    <div className="p-4 overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border text-muted font-medium">
                            <th className="pb-2 font-medium">Unit / Chapter Title</th>
                            <th className="pb-2 font-medium">Requested Range</th>
                            <th className="pb-2 font-medium">Physical Sliced Pages</th>
                            <th className="pb-2 font-medium">Output Validation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {item.parts.map((p, pIdx) => {
                            const slice = item.unitSlices[pIdx];
                            return (
                              <tr key={pIdx} className="hover:bg-paper/30 transition-colors">
                                <td className="py-2.5 font-medium text-ink">{p.title}</td>
                                <td className="py-2.5 font-mono text-muted">
                                  Pages {p.startPage}–{p.endPage} ({p.endPage - p.startPage + 1} pages)
                                </td>
                                <td className="py-2.5 font-mono text-muted">
                                  {slice ? `${slice.physicalCount} pages` : 'Pending'}
                                </td>
                                <td className="py-2.5">
                                  {slice?.isValid ? (
                                    <span className="inline-flex items-center text-emerald-600 font-semibold">
                                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                      Valid PDF
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-rose-600 font-semibold">
                                      <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                                      {slice?.error || 'Validation error'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Interactive Correction Form (shown when INCORRECT is clicked) */}
                    {isEditingCorrection && (
                      <div className="p-4 bg-amber-500/5 border-t border-amber-500/20 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-xs text-ink flex items-center">
                            <Edit3 className="w-4 h-4 text-amber-600 mr-1.5" />
                            Specify Correct Boundaries for &ldquo;{item.filename}&rdquo;
                          </h4>
                          <button
                            type="button"
                            onClick={() => handleAddUnit(item.id, item.pageCount)}
                            className="inline-flex items-center px-2.5 py-1 rounded-md bg-surface border border-border text-xs font-medium text-ink hover:bg-paper transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Unit
                          </button>
                        </div>

                        {/* Errors */}
                        {errors.length > 0 && (
                          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-md text-xs text-rose-700 space-y-1">
                            {errors.map((err, eIdx) => (
                              <p key={eIdx}>• {err}</p>
                            ))}
                          </div>
                        )}

                        {/* Editable Unit Rows */}
                        <div className="space-y-2">
                          {units.map((u, uIdx) => (
                            <div
                              key={u.id}
                              className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 bg-surface rounded-md border border-border text-xs"
                            >
                              <span className="text-muted font-mono w-6 text-center">#{uIdx + 1}</span>
                              <input
                                type="text"
                                value={u.title}
                                onChange={(e) =>
                                  handleUpdateUnit(item.id, u.id, 'title', e.target.value, item.pageCount)
                                }
                                placeholder="Unit title..."
                                className="flex-1 px-2.5 py-1.5 border border-border rounded-md bg-surface text-ink text-xs focus:outline-hidden focus:ring-1 focus:ring-brand"
                              />
                              <div className="flex items-center space-x-2">
                                <label className="text-muted text-2xs">From:</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={item.pageCount}
                                  value={u.startPage}
                                  onChange={(e) =>
                                    handleUpdateUnit(
                                      item.id,
                                      u.id,
                                      'startPage',
                                      parseInt(e.target.value, 10) || 1,
                                      item.pageCount
                                    )
                                  }
                                  className="w-16 px-2 py-1.5 border border-border rounded-md bg-surface text-ink text-xs font-mono text-center"
                                />
                                <label className="text-muted text-2xs">To:</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={item.pageCount}
                                  value={u.endPage}
                                  onChange={(e) =>
                                    handleUpdateUnit(
                                      item.id,
                                      u.id,
                                      'endPage',
                                      parseInt(e.target.value, 10) || 1,
                                      item.pageCount
                                    )
                                  }
                                  className="w-16 px-2 py-1.5 border border-border rounded-md bg-surface text-ink text-xs font-mono text-center"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveUnit(item.id, u.id, item.pageCount)}
                                  className="p-1.5 rounded-md text-muted hover:text-accent hover:bg-paper transition-colors"
                                  title="Delete Unit"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Save / Cancel Correction Buttons */}
                        <div className="flex items-center justify-end space-x-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setActiveCorrectionId(null)}
                            className="px-3 py-1.5 rounded-md border border-border bg-surface text-muted text-xs hover:text-ink hover:bg-paper transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveCorrection(item)}
                            className="px-4 py-1.5 rounded-md bg-brand text-brand-fg text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                          >
                            Save Correction to Dataset
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dataset Management Section */}
        <div className="bg-surface border border-border rounded-md shadow-subtle p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 className="text-base font-bold text-ink">Supervised Feedback Dataset (IndexedDB)</h2>
              <p className="text-xs text-muted mt-0.5">
                {datasetRecords.length} stored evaluations (
                {datasetRecords.filter((r) => r.decision === 'CORRECT').length} Verified Correct,{' '}
                {datasetRecords.filter((r) => r.decision === 'INCORRECT').length} Corrected)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleExportJson}
                disabled={datasetRecords.length === 0}
                className="inline-flex items-center px-3 py-1.5 rounded-md border border-border bg-surface text-ink text-xs font-medium hover:bg-paper transition-colors disabled:opacity-40 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 mr-1 text-brand" />
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => jsonImportRef.current?.click()}
                className="inline-flex items-center px-3 py-1.5 rounded-md border border-border bg-surface text-ink text-xs font-medium hover:bg-paper transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 mr-1 text-brand" />
                Import JSON
              </button>
              <input
                ref={jsonImportRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImportJson}
              />
            </div>
          </div>

          {datasetMessage && (
            <div className="p-3 bg-brand/10 border border-brand/20 rounded-md text-xs text-brand font-medium">
              {datasetMessage}
            </div>
          )}

          {datasetRecords.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted">
              No feedback records yet. Select a folder of PDFs above to run batch evaluation and capture feedback.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-surface">
                  <tr className="border-b border-border text-muted font-medium">
                    <th className="pb-2">Filename</th>
                    <th className="pb-2">Decision</th>
                    <th className="pb-2">Units</th>
                    <th className="pb-2">Version</th>
                    <th className="pb-2">Date</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {datasetRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-paper/30 transition-colors">
                      <td className="py-2.5 font-medium text-ink max-w-[200px] truncate" title={rec.filename}>
                        {rec.filename}
                      </td>
                      <td className="py-2.5">
                        {rec.decision === 'CORRECT' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                            CORRECT
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/20">
                            CORRECTED
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-muted font-mono">
                        {rec.decision === 'CORRECT'
                          ? `${rec.originalBoundaries.length} units`
                          : `${rec.correctedBoundaries?.length || 0} units`}
                      </td>
                      <td className="py-2.5 text-muted font-mono">{rec.detectorVersion}</td>
                      <td className="py-2.5 text-muted font-mono">
                        {new Date(rec.timestamp).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(rec.id)}
                          className="p-1 rounded-md text-muted hover:text-accent transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
