'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  Scissors, 
  Sparkles, 
  BookOpen, 
  FolderDown, 
  Download, 
  UploadCloud, 
  Plus, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  RotateCcw,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { 
  PdfFileInfo, 
  DetectedPart, 
  ValidationResult, 
  CutProgressState, 
  CutProgressItem 
} from '@/types';
import { extractPdfTextPages, getPdfJs, getPdfJsDocumentParams } from '@/lib/pdfReader';
import { detectDocumentUnits } from '@/lib/detector';
import { validateParts, sanitizeFilename } from '@/lib/validator';
import { 
  extractPdfRange, 
  downloadFile, 
  createZipBundle, 
  isFileSystemAccessSupported, 
  saveFilesToDirectory, 
  executeCutPlan 
} from '@/lib/cutter';
import { exportProjectFile, importProjectFile } from '@/lib/project';
import { createSampleTextbookPdf } from '@/lib/sampleGenerator';
import { PartsTable } from '@/components/PartsTable';
import { PdfPreviewModal } from '@/components/PdfPreviewModal';
import { ProgressModal } from '@/components/ProgressModal';
import { CompletionModal } from '@/components/CompletionModal';
import { ToolLayout } from '@/components/tools/ToolLayout';
import { getToolBySlug } from '@/config/tools';

export default function PdfUnitCutterPage() {
  const tool = getToolBySlug('pdf-unit-cutter')!;

  // Document State
  const [fileInfo, setFileInfo] = useState<PdfFileInfo | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);

  // Analysis & Parts State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [splitMode, setSplitMode] = useState<'auto' | 'manual'>('auto');
  const [parts, setParts] = useState<DetectedPart[]>([]);
  const [originalParts, setOriginalParts] = useState<DetectedPart[]>([]);

  // Front matter suggestions
  const [hasFrontMatter, setHasFrontMatter] = useState<boolean>(false);
  const [frontMatterRange, setFrontMatterRange] = useState<{ start: number; end: number } | undefined>();

  // Modals & Interactivity
  const [previewPart, setPreviewPart] = useState<DetectedPart | null>(null);
  const [completionItems, setCompletionItems] = useState<CutProgressItem[] | null>(null);
  const [isCuttingCancelled, setIsCuttingCancelled] = useState<boolean>(false);

  // Folder Access state
  const [isFolderSupported, setIsFolderSupported] = useState<boolean>(false);
  const [selectedFolderText, setSelectedFolderText] = useState<string>('');

  // Project file hidden input
  const projectInputRef = useRef<HTMLInputElement>(null);

  // Execution Progress state
  const [progressState, setProgressState] = useState<CutProgressState>({
    isCutting: false,
    currentIndex: 0,
    total: 0,
    items: [],
    completedCount: 0,
    isCancelled: false,
  });

  useEffect(() => {
    setIsFolderSupported(isFileSystemAccessSupported());
  }, []);

  // Compute reactive validation
  const validation: ValidationResult = useMemo(() => {
    const totalPages = fileInfo?.totalPages || 0;
    if (!totalPages || parts.length === 0) {
      return {
        isValid: true,
        errors: [],
        warnings: [],
        overlaps: [],
        gaps: [],
        duplicateFilenames: [],
      };
    }
    return validateParts(parts, totalPages);
  }, [parts, fileInfo?.totalPages]);

  // Ensure safe non-detached ArrayBuffer
  const getActiveBuffer = async (): Promise<ArrayBuffer | null> => {
    if (fileBuffer && fileBuffer.byteLength > 0) {
      return fileBuffer;
    }
    if (fileInfo?.file) {
      try {
        const freshBuffer = await fileInfo.file.arrayBuffer();
        setFileBuffer(freshBuffer);
        return freshBuffer;
      } catch (err) {
        console.error('Failed to reload file buffer:', err);
      }
    }
    return null;
  };

  // Handle PDF file selection
  const handleFileSelect = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      setFileBuffer(buffer);

      const pdfjs = await getPdfJs();
      const loadingTask = pdfjs.getDocument(getPdfJsDocumentParams(buffer));
      const pdfDoc = await loadingTask.promise;
      const totalPages = pdfDoc.numPages;

      setFileInfo({
        file,
        name: file.name,
        size: file.size,
        totalPages,
        isScanned: false,
        avgCharsPerPage: 0,
      });

      setParts([]);
      setOriginalParts([]);
      setHasFrontMatter(false);
      setFrontMatterRange(undefined);
      setCompletionItems(null);
    } catch (err: any) {
      console.error('Error reading PDF file:', err);
      alert(`Could not open PDF: ${err.message || 'Invalid or encrypted PDF document.'}`);
    }
  };

  // Load interactive demo sample
  const handleLoadSample = async () => {
    try {
      const sampleFile = await createSampleTextbookPdf();
      await handleFileSelect(sampleFile);
    } catch (err: any) {
      console.error('Failed to generate sample PDF:', err);
      alert('Could not generate sample textbook.');
    }
  };

  const handleRemoveFile = () => {
    setFileInfo(null);
    setFileBuffer(null);
    setParts([]);
    setOriginalParts([]);
    setHasFrontMatter(false);
    setFrontMatterRange(undefined);
    setCompletionItems(null);
  };

  // Analyze PDF Page-by-Page
  const handleAnalyze = async () => {
    if (!fileInfo) return;
    const activeBuf = await getActiveBuffer();
    if (!activeBuf) {
      alert('Could not access PDF document data. Please re-select the file.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress({ current: 0, total: fileInfo.totalPages });

    try {
      const { pages, isScanned, avgCharsPerPage } = await extractPdfTextPages(
        activeBuf,
        (current, total) => setAnalysisProgress({ current, total })
      );

      setFileInfo((prev) =>
        prev
          ? {
              ...prev,
              isScanned,
              avgCharsPerPage,
            }
          : null
      );

      const { parts: detected, hasFrontMatter: fmDetected, frontMatterRange: fmRange } =
        detectDocumentUnits(pages, fileInfo.totalPages, fileInfo.name);

      setParts(detected);
      setOriginalParts(JSON.parse(JSON.stringify(detected)));
      setHasFrontMatter(fmDetected);
      setFrontMatterRange(fmRange);
      setSplitMode('auto');
    } catch (err: any) {
      console.error('Analysis error:', err);
      alert(`Analysis encountered an error: ${err.message || 'Unable to parse PDF text.'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualMode = () => {
    setSplitMode('manual');
    if (parts.length === 0 && fileInfo) {
      const initialPart: DetectedPart = {
        id: `manual-part-1`,
        title: 'Part 1',
        startPage: 1,
        endPage: Math.min(25, fileInfo.totalPages),
        filename: sanitizeFilename(`${fileInfo.name.replace(/\.pdf$/i, '')} - Part 1.pdf`),
        confidence: 'High',
        source: 'manual',
      };
      setParts([initialPart]);
      setOriginalParts([initialPart]);
    }
  };

  // Parts list manipulations
  const handleUpdatePart = (id: string, updated: Partial<DetectedPart>) => {
    setParts((prev) =>
      prev.map((part) => (part.id === id ? { ...part, ...updated } : part))
    );
  };

  const handleAddPart = (newPartData: Omit<DetectedPart, 'id'>) => {
    const newPart: DetectedPart = {
      ...newPartData,
      id: `part-${Date.now()}-${parts.length + 1}`,
    };
    setParts((prev) => [...prev, newPart]);
  };

  const handleDuplicatePart = (id: string) => {
    const targetIdx = parts.findIndex((p) => p.id === id);
    if (targetIdx === -1) return;

    const source = parts[targetIdx];
    const duplicated: DetectedPart = {
      ...source,
      id: `part-${Date.now()}-dup`,
      title: `${source.title} (Copy)`,
      filename: sanitizeFilename(`${source.filename.replace(/\.pdf$/i, '')} (Copy).pdf`),
    };

    const nextParts = [...parts];
    nextParts.splice(targetIdx + 1, 0, duplicated);
    setParts(nextParts);
  };

  const handleDeletePart = (id: string) => {
    setParts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleMovePart = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= parts.length) return;

    const nextParts = [...parts];
    const temp = nextParts[index];
    nextParts[index] = nextParts[newIndex];
    nextParts[newIndex] = temp;
    setParts(nextParts);
  };

  const handleResetParts = () => {
    if (originalParts.length > 0) {
      setParts(JSON.parse(JSON.stringify(originalParts)));
    }
  };

  const handleApplyAll = () => {
    if (!fileInfo) return;
    const sanitized = parts.map((part) => ({
      ...part,
      filename: sanitizeFilename(part.filename),
      startPage: Math.max(1, Math.min(part.startPage, fileInfo.totalPages)),
      endPage: Math.max(part.startPage, Math.min(part.endPage, fileInfo.totalPages)),
    }));
    setParts(sanitized);
  };

  const handleFrontMatter = (action: 'separate' | 'include' | 'exclude') => {
    if (!frontMatterRange) return;

    if (action === 'separate') {
      const frontPart: DetectedPart = {
        id: `front-matter-${Date.now()}`,
        title: 'Part 0 — Front Matter',
        startPage: 1,
        endPage: frontMatterRange.end,
        filename: sanitizeFilename(
          `${fileInfo?.name.replace(/\.pdf$/i, '') || 'Document'} - Front Matter.pdf`
        ),
        confidence: 'High',
        source: 'manual',
      };
      setParts((prev) => [frontPart, ...prev]);
    } else if (action === 'include') {
      setParts((prev) => {
        if (prev.length === 0) return prev;
        const [first, ...rest] = prev;
        return [{ ...first, startPage: 1 }, ...rest];
      });
    }
    setHasFrontMatter(false);
  };

  // Download Single Part
  const handleDownloadSinglePart = async (part: DetectedPart) => {
    const activeBuf = await getActiveBuffer();
    if (!activeBuf) {
      alert('Cannot access PDF document data.');
      return;
    }
    try {
      const singleBytes = await extractPdfRange(activeBuf, part.startPage, part.endPage);
      downloadFile(singleBytes, part.filename);
    } catch (err: any) {
      alert(`Failed to extract "${part.filename}": ${err.message || err}`);
    }
  };

  // Choose Local Output Folder
  const handleChooseFolder = async () => {
    if (!isFolderSupported) return;
    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      setSelectedFolderText(`Selected: ${dirHandle.name}`);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Folder picker error:', err);
      }
    }
  };

  // Cut PDF
  const handleCutPdf = async () => {
    if (!fileInfo || parts.length === 0) return;
    if (!validation.isValid) {
      alert('Please correct errors in your page ranges before cutting.');
      return;
    }

    const activeBuf = await getActiveBuffer();
    if (!activeBuf) {
      alert('Cannot access PDF document data. Please re-select the file.');
      return;
    }

    setIsCuttingCancelled(false);

    try {
      const items = await executeCutPlan(
        activeBuf,
        parts,
        (progress) => setProgressState(progress),
        () => isCuttingCancelled
      );

      if (!isCuttingCancelled) {
        setCompletionItems(items);
      }
    } catch (err: any) {
      console.error('Cutting execution error:', err);
      alert(`Splitting failed: ${err.message || err}`);
    }
  };

  const handleDownloadAll = () => {
    if (!completionItems) return;
    const completed = completionItems.filter((i) => i.status === 'done' && i.bytes);
    completed.forEach((item, index) => {
      setTimeout(() => {
        if (item.bytes) {
          downloadFile(item.bytes, item.filename);
        }
      }, index * 250);
    });
  };

  const handleDownloadZip = async () => {
    if (!completionItems || !fileInfo) return;
    const completed = completionItems.filter((i) => i.status === 'done' && i.bytes);
    if (completed.length === 0) return;

    try {
      const items = completed.map((i) => ({
        filename: i.filename,
        bytes: i.bytes!,
      }));
      const zipBlob = await createZipBundle(items);
      const zipName = `${fileInfo.name.replace(/\.pdf$/i, '')} - Units.zip`;
      downloadFile(zipBlob, zipName);
    } catch (err: any) {
      alert(`Failed to create ZIP: ${err.message || err}`);
    }
  };

  const handleSaveToFolderDirectly = async () => {
    if (!completionItems) return;
    const completed = completionItems.filter((i) => i.status === 'done' && i.bytes);
    if (completed.length === 0) return;

    try {
      const items = completed.map((i) => ({
        filename: i.filename,
        bytes: i.bytes!,
      }));

      const result = await saveFilesToDirectory(items, async (conflictFile) => {
        const replace = window.confirm(
          `A file named "${conflictFile}" already exists in the selected folder.\nClick OK to replace it, or Cancel to rename it.`
        );
        return replace ? 'replace' : 'rename';
      });

      alert(`Successfully saved ${result.savedCount} unit PDF(s) directly to your folder!`);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        alert(`Folder save error: ${err.message || err}`);
      }
    }
  };

  const handleExportProject = () => {
    if (!fileInfo || parts.length === 0) return;
    exportProjectFile(fileInfo.name, fileInfo.totalPages, parts);
  };

  const handleImportProjectClick = () => {
    projectInputRef.current?.click();
  };

  const handleProjectFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const project = await importProjectFile(file);
      setParts(project.parts);
      setOriginalParts(JSON.parse(JSON.stringify(project.parts)));
      alert(`Loaded project with ${project.parts.length} unit definitions.`);
    } catch (err: any) {
      alert(`Failed to load project: ${err.message || err}`);
    } finally {
      if (projectInputRef.current) projectInputRef.current.value = '';
    }
  };

  return (
    <ToolLayout tool={tool}>
      <div className="space-y-8">
        {/* Hidden project file input */}
        <input
          ref={projectInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleProjectFileChange}
          className="hidden"
        />

        {/* Step 1: Upload Zone if no file loaded */}
        {!fileInfo ? (
          <div className="space-y-4">
            <div className="rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 md:p-12 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                  <UploadCloud size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Upload Your Textbook or Document
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-200 mt-1">
                    Select a multi-unit textbook, syllabus, or course document to detect units.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <label className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm cursor-pointer shadow-md shadow-brand-500/20 transition-all hover:scale-[1.02]">
                    Choose PDF Document
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={handleLoadSample}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-semibold transition-colors"
                  >
                    <BookOpen size={16} className="text-brand-600 dark:text-brand-400" />
                    <span>Try with Sample Textbook</span>
                  </button>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 pt-3">
                  Sample: &ldquo;Biology Grade 10.pdf&rdquo; with Units 1–3, TOC, and front matter.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Step 2: File Loaded - Inspection & Control Bar */
          <div className="space-y-6">
            {/* File Info Bar */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                  <FileText size={22} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                    {fileInfo.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-200 mt-0.5">
                    <span>{fileInfo.totalPages} total pages</span>
                    <span>•</span>
                    <span>{(fileInfo.size / (1024 * 1024)).toFixed(2)} MB</span>
                    {fileInfo.isScanned && (
                      <>
                        <span>•</span>
                        <span className="text-amber-500 font-medium">Scanned document</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {parts.length === 0 && (
                  <>
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs md:text-sm font-bold shadow-md shadow-brand-500/25 transition-all disabled:opacity-50"
                    >
                      <Sparkles size={16} />
                      <span>{isAnalyzing ? `Analyzing (${analysisProgress.current}/${analysisProgress.total})...` : 'Analyze & Detect Units'}</span>
                    </button>
                    <button
                      onClick={handleManualMode}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs md:text-sm font-semibold transition-colors"
                    >
                      Manual Split
                    </button>
                  </>
                )}
                <button
                  onClick={handleRemoveFile}
                  className="px-3 py-2 rounded-xl text-slate-600 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
                >
                  Change File
                </button>
              </div>
            </div>

            {/* Analysis In-Progress Banner */}
            {isAnalyzing && (
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-brand-200 dark:border-brand-800 shadow-lg space-y-3">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-brand-600 dark:text-brand-400">
                    Scanning page headings & Table of Contents...
                  </span>
                  <span>
                    Page {analysisProgress.current} of {analysisProgress.total}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-brand-600 rounded-full transition-all duration-200"
                    style={{
                      width: `${(analysisProgress.current / Math.max(1, analysisProgress.total)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Detected Units & Parts Table */}
            {parts.length > 0 && (
              <PartsTable
                parts={parts}
                originalParts={originalParts}
                totalPages={fileInfo.totalPages}
                originalFileName={fileInfo.name}
                splitMode={splitMode}
                setSplitMode={setSplitMode}
                validation={validation}
                hasFrontMatter={hasFrontMatter}
                frontMatterRange={frontMatterRange}
                selectedFolderText={selectedFolderText}
                isFolderSupported={isFolderSupported}
                onUpdatePart={handleUpdatePart}
                onAddPart={handleAddPart}
                onDuplicatePart={handleDuplicatePart}
                onDeletePart={handleDeletePart}
                onMovePart={handleMovePart}
                onResetParts={handleResetParts}
                onApplyAll={handleApplyAll}
                onHandleFrontMatter={handleFrontMatter}
                onPreviewPart={(part) => setPreviewPart(part)}
                onDownloadSinglePart={handleDownloadSinglePart}
                onChooseFolder={handleChooseFolder}
                onCutPdf={handleCutPdf}
                onSaveProject={handleExportProject}
                onLoadProject={handleImportProjectClick}
              />
            )}
          </div>
        )}

        {/* Canvas Page Preview Modal */}
        {previewPart && (
          <PdfPreviewModal
            part={previewPart}
            fileBuffer={fileBuffer}
            totalPages={fileInfo?.totalPages || 1}
            onClose={() => setPreviewPart(null)}
          />
        )}

        {/* Responsive Cutting Progress Modal */}
        <ProgressModal
          progressState={progressState}
          onCancel={() => {
            setIsCuttingCancelled(true);
            setProgressState((prev) => ({ ...prev, isCutting: false, isCancelled: true }));
          }}
        />

        {/* Completion Modal */}
        {completionItems && (
          <CompletionModal
            originalFileName={fileInfo?.name || 'Document'}
            items={completionItems}
            onClose={() => setCompletionItems(null)}
            onDownloadAll={handleDownloadAll}
            onDownloadZip={handleDownloadZip}
            onSaveToFolder={handleSaveToFolderDirectly}
            isFolderSupported={isFolderSupported}
            onStartNew={() => {
              setCompletionItems(null);
              setParts([]);
              setFileInfo(null);
              setFileBuffer(null);
            }}
          />
        )}
      </div>
    </ToolLayout>
  );
}
