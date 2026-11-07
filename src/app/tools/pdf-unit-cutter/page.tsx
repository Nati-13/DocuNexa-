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
  ShieldCheck,
  Languages
} from 'lucide-react';
import {
  PdfFileInfo,
  DetectedPart,
  ValidationResult,
  CutProgressState,
  CutProgressItem,
  ConfidenceLevel,
  PageTextData
} from '@/types';
import { extractPdfTextPages, getPdfJs, getPdfJsDocumentParams } from '@/lib/pdfReader';
import { detectDocumentUnits } from '@/lib/detector';
import {
  SUPPORTED_LANGUAGES,
  SupportedLanguageCode,
  detectDocumentLanguage
} from '@/lib/multilingual';
import { validateParts, sanitizeFilename } from '@/lib/validator';
import {
  extractPdfRange,
  downloadFile,
  createZipBundle,
  isFileSystemAccessSupported,
  saveFilesToDirectory,
  executeCutPlan,
  dispatchCutExecution,
  resolveEffectiveUncertainty
} from '@/lib/cutter';
import { exportProjectFile, importProjectFile } from '@/lib/project';
import { sanitizeDownloadFilename } from '@/lib/downloadContract';
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

  // Front matter & analysis summary
  const [hasFrontMatter, setHasFrontMatter] = useState<boolean>(false);
  const [frontMatterRange, setFrontMatterRange] = useState<{ start: number; end: number } | undefined>();
  const [detectionSummary, setDetectionSummary] = useState<{
    isUncertain?: boolean;
    uncertaintyReason?: string;
    overallConfidence?: ConfidenceLevel;
  }>({});
  const [isBoundariesConfirmed, setIsBoundariesConfirmed] = useState<boolean>(false);

  // Multilingual & OCR State
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguageCode | 'auto'>('auto');
  const [detectedLanguage, setDetectedLanguage] = useState<{
    code: SupportedLanguageCode;
    confidence: ConfidenceLevel;
  } | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState<boolean>(false);

  // Modals & Interactivity
  const [previewPart, setPreviewPart] = useState<DetectedPart | null>(null);
  const [previewInitialPage, setPreviewInitialPage] = useState<number | undefined>(undefined);
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
      setDetectionSummary({});
      setIsBoundariesConfirmed(false);
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
    setDetectionSummary({});
    setIsBoundariesConfirmed(false);
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

      // Detect document language from extracted pages
      const sampleText = pages.slice(0, 15).map((p) => p.rawText).join('\n');
      const langResult = detectDocumentLanguage(sampleText);
      setDetectedLanguage({
        code: langResult.detectedLanguage,
        confidence: langResult.confidence,
      });

      const result = detectDocumentUnits(pages, fileInfo.totalPages, fileInfo.name);

      setParts(result.parts);
      setOriginalParts(JSON.parse(JSON.stringify(result.parts)));
      setHasFrontMatter(result.hasFrontMatter);
      setFrontMatterRange(result.frontMatterRange);
      setDetectionSummary({
        isUncertain: result.isUncertain,
        uncertaintyReason: result.uncertaintyReason,
        overallConfidence: result.overallConfidence,
      });
      setIsBoundariesConfirmed(false);
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
    setIsBoundariesConfirmed(false);
    setParts((prev) =>
      prev.map((part) => (part.id === id ? { ...part, ...updated } : part))
    );
  };

  const handleAddPart = (newPartData: Omit<DetectedPart, 'id'>) => {
    setIsBoundariesConfirmed(false);
    const newPart: DetectedPart = {
      ...newPartData,
      id: `part-${Date.now()}-${parts.length + 1}`,
    };
    setParts((prev) => [...prev, newPart]);
  };

  const handleDuplicatePart = (id: string) => {
    const targetIdx = parts.findIndex((p) => p.id === id);
    if (targetIdx === -1) return;

    setIsBoundariesConfirmed(false);
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
    setIsBoundariesConfirmed(false);
    setParts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleMovePart = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= parts.length) return;

    setIsBoundariesConfirmed(false);
    const nextParts = [...parts];
    const temp = nextParts[index];
    nextParts[index] = nextParts[newIndex];
    nextParts[newIndex] = temp;
    setParts(nextParts);
  };

  const handleResetParts = () => {
    setIsBoundariesConfirmed(false);
    if (originalParts.length > 0) {
      setParts(JSON.parse(JSON.stringify(originalParts)));
    }
  };

  const handleApplyAll = () => {
    if (!fileInfo) return;
    setIsBoundariesConfirmed(false);
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
    setIsBoundariesConfirmed(false);

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

  // OCR Enhancement for Scanned Documents
  const handleRunOcr = async () => {
    if (!fileInfo) return;
    const activeBuf = await getActiveBuffer();
    if (!activeBuf) {
      alert('Cannot access PDF document data.');
      return;
    }

    setIsOcrProcessing(true);
    setIsAnalyzing(true);
    setAnalysisProgress({ current: 0, total: fileInfo.totalPages });

    try {
      const targetLang =
        selectedLanguage !== 'auto'
          ? selectedLanguage
          : detectedLanguage?.code || 'en';
      const tesseractCode =
        SUPPORTED_LANGUAGES[targetLang]?.tesseractCode || 'eng';

      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker(tesseractCode, 1, {
        logger: () => {},
      });

      const pdfjs = await getPdfJs();
      const loadingTask = pdfjs.getDocument(getPdfJsDocumentParams(activeBuf));
      const pdfDoc = await loadingTask.promise;

      const ocrPages: PageTextData[] = [];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      for (let p = 1; p <= fileInfo.totalPages; p++) {
        setAnalysisProgress({ current: p, total: fileInfo.totalPages });
        const page = await pdfDoc.getPage(p);
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx!, viewport }).promise;

        const {
          data: { text },
        } = await worker.recognize(canvas);
        const lines = text
          .split('\n')
          .map((l: string) => l.trim())
          .filter(Boolean);

        ocrPages.push({
          pageNumber: p,
          rawText: text,
          lines,
          hasSubstantialText: lines.length > 0,
        });

        if (typeof page.cleanup === 'function') {
          page.cleanup();
        }
      }

      await worker.terminate();

      const result = detectDocumentUnits(ocrPages, fileInfo.totalPages, fileInfo.name);
      setParts(result.parts);
      setOriginalParts(JSON.parse(JSON.stringify(result.parts)));
      setHasFrontMatter(result.hasFrontMatter);
      setFrontMatterRange(result.frontMatterRange);
      setDetectionSummary({
        isUncertain: result.isUncertain,
        uncertaintyReason: result.uncertaintyReason,
        overallConfidence: result.overallConfidence,
      });
      setIsBoundariesConfirmed(false);
      setFileInfo((prev) =>
        prev ? { ...prev, isScanned: false, avgCharsPerPage: 100 } : null
      );
    } catch (err: any) {
      console.error('OCR processing error:', err);
      alert(`OCR processing failed: ${err.message || err}`);
    } finally {
      setIsOcrProcessing(false);
      setIsAnalyzing(false);
    }
  };

  // Download Single Part
  const handleDownloadSinglePart = async (part: DetectedPart) => {
    if (!fileInfo) return;
    if (
      part.startPage < 1 ||
      part.endPage < part.startPage ||
      part.endPage > fileInfo.totalPages
    ) {
      alert(
        `Invalid page range [${part.startPage}..${part.endPage}] for "${part.title}". Valid document range is 1 to ${fileInfo.totalPages}.`
      );
      return;
    }

    const activeBuf = await getActiveBuffer();
    if (!activeBuf) {
      alert('Cannot access PDF document data.');
      return;
    }
    try {
      const singleBytes = await extractPdfRange(activeBuf, part.startPage, part.endPage);
      downloadFile(singleBytes, sanitizeDownloadFilename(part.filename, 'pdf'), 'pdf');
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

    let effectiveUncertain: boolean;
    try {
      effectiveUncertain = resolveEffectiveUncertainty(splitMode, detectionSummary.isUncertain);
    } catch (err: any) {
      alert(err.message || 'Cannot cut PDF: Document uncertainty state is unverified.');
      return;
    }

    if (effectiveUncertain && !isBoundariesConfirmed) {
      alert('Please review and confirm unit page boundaries before cutting.');
      return;
    }

    const activeBuf = await getActiveBuffer();
    if (!activeBuf) {
      alert('Cannot access PDF document data. Please re-select the file.');
      return;
    }

    setIsCuttingCancelled(false);

    try {
      const items = await dispatchCutExecution({
        buffer: activeBuf,
        parts,
        isValidRanges: validation.isValid,
        isUncertain: effectiveUncertain,
        isBoundariesConfirmed: Boolean(isBoundariesConfirmed),
        onProgress: (progress) => setProgressState(progress),
        shouldCancel: () => isCuttingCancelled,
      });

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
          downloadFile(item.bytes, sanitizeDownloadFilename(item.filename, 'pdf'), 'pdf');
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
        filename: sanitizeDownloadFilename(i.filename, 'pdf'),
        bytes: i.bytes!,
      }));
      const zipBlob = await createZipBundle(items);
      const zipName = sanitizeDownloadFilename(fileInfo.name, 'zip', 'Units');
      downloadFile(zipBlob, zipName, 'zip');
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
      setIsBoundariesConfirmed(false);
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
            <div className="rounded-md border-2 border-dashed border-border bg-surface hover:border-brand/60 p-8 md:p-12 text-center transition-colors">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-12 h-12 mx-auto rounded-md bg-paper border border-border text-brand flex items-center justify-center">
                  <UploadCloud size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-ink">
                    Upload Your Textbook or Document
                  </h3>
                  <p className="text-sm text-ink mt-1">
                    Select a multi-unit textbook, syllabus, or course document to detect units.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <label className="px-5 py-2.5 rounded-md bg-brand hover:bg-brand/90 text-brand-fg font-semibold text-sm cursor-pointer inline-flex items-center gap-2 transition-colors">
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
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-surface hover:bg-paper border border-border text-ink text-sm font-semibold transition-colors"
                  >
                    <BookOpen size={16} className="text-brand" />
                    <span>Try with Sample Textbook</span>
                  </button>
                </div>

                <p className="text-xs text-muted pt-3">
                  Sample: &ldquo;Biology Grade 10.pdf&rdquo; with Units 1–3, TOC, and front matter.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Step 2: File Loaded - Inspection & Control Bar */
          <div className="space-y-6">
            {/* File Info Bar */}
            <div className="p-5 rounded-md bg-surface border border-border shadow-subtle flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-md bg-paper border border-border text-brand flex items-center justify-center shrink-0">
                  <FileText size={22} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base text-ink truncate">
                    {fileInfo.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-ink mt-0.5">
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
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand hover:bg-brand/90 text-brand-fg text-xs md:text-sm font-semibold disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      <Sparkles size={16} />
                      <span>{isAnalyzing ? `Analyzing (${analysisProgress.current}/${analysisProgress.total})...` : 'Analyze & Detect Units'}</span>
                    </button>
                    <button
                      onClick={handleManualMode}
                      className="px-3.5 py-2 rounded-md bg-surface border border-border hover:bg-paper text-ink text-xs md:text-sm font-semibold transition-colors cursor-pointer"
                    >
                      Manual Split
                    </button>
                  </>
                )}
                <button
                  onClick={handleRemoveFile}
                  className="px-3 py-1.5 rounded-md text-muted hover:text-accent border border-border hover:bg-paper text-xs font-semibold transition-colors cursor-pointer"
                >
                  Change File
                </button>
              </div>
            </div>

            {/* Multilingual Support & Language Detection Toolbar */}
            <div className="p-4 rounded-md bg-paper border border-border flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 font-semibold text-ink">
                  <Languages size={16} className="text-brand shrink-0" />
                  <span>Document Language:</span>
                </div>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-md border border-border bg-surface text-ink font-medium focus:border-brand focus:outline-hidden"
                >
                  <option value="auto">Auto Detect (All 10 Languages)</option>
                  <option value="en">English (English)</option>
                  <option value="am">Amharic (አማርኛ)</option>
                  <option value="om">Afaan Oromo (Afaan Oromoo)</option>
                  <option value="ti">Tigrinya (ትግርኛ)</option>
                  <option value="ar">Arabic (العربية)</option>
                  <option value="fr">French (Français)</option>
                  <option value="es">Spanish (Español)</option>
                  <option value="sw">Swahili (Kiswahili)</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="zh">Simplified Chinese (简体中文)</option>
                </select>

                {detectedLanguage && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-brand/10 text-brand border border-brand/20">
                    <CheckCircle2 size={13} className="shrink-0" />
                    <span>
                      Detected: {SUPPORTED_LANGUAGES[detectedLanguage.code].name} ({SUPPORTED_LANGUAGES[detectedLanguage.code].nativeName}) • {detectedLanguage.confidence} Confidence
                    </span>
                  </span>
                )}
              </div>

              <span className="text-[11px] text-muted hidden md:inline">
                Supports English, Amharic, Oromo, Tigrinya, Arabic, French, Spanish, Swahili, Hindi &amp; Chinese
              </span>
            </div>

            {/* Scanned Document Alert & OCR Trigger */}
            {fileInfo.isScanned && parts.length === 0 && (
              <div className="p-4 rounded-md bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Scanned / Image-Based PDF Detected</span>
                    <p className="text-muted mt-0.5">
                      This PDF has very few selectable text characters. You can run client-side OCR text recognition to detect units automatically, or use Manual Split.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRunOcr}
                  disabled={isOcrProcessing}
                  className="px-3.5 py-2 rounded-md bg-brand hover:bg-brand/90 text-brand-fg font-semibold shrink-0 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isOcrProcessing ? 'Running OCR...' : 'Run OCR Recognition'}
                </button>
              </div>
            )}

            {/* Analysis In-Progress Banner */}
            {isAnalyzing && (
              <div className="p-6 rounded-md bg-surface border border-border shadow-subtle space-y-3">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-brand">
                    Scanning page headings & Table of Contents...
                  </span>
                  <span>
                    Page {analysisProgress.current} of {analysisProgress.total}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-paper overflow-hidden border border-border">
                  <div
                    className="h-full bg-brand rounded-full transition-all duration-300"
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
                onPreviewPart={(part, initialPage) => {
                  setPreviewPart(part);
                  setPreviewInitialPage(initialPage);
                }}
                onDownloadSinglePart={handleDownloadSinglePart}
                onChooseFolder={handleChooseFolder}
                onCutPdf={handleCutPdf}
                onSaveProject={handleExportProject}
                onLoadProject={handleImportProjectClick}
                isUncertain={splitMode === 'manual' ? false : detectionSummary.isUncertain}
                uncertaintyReason={detectionSummary.uncertaintyReason}
                overallConfidence={detectionSummary.overallConfidence}
                isBoundariesConfirmed={isBoundariesConfirmed}
                onConfirmBoundaries={() => setIsBoundariesConfirmed(true)}
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
            initialPage={previewInitialPage}
            onClose={() => {
              setPreviewPart(null);
              setPreviewInitialPage(undefined);
            }}
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
            completedItems={completionItems}
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
