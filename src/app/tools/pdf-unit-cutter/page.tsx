'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  Scissors, 
  Sparkles, 
  BookOpen, 
  Download, 
  UploadCloud, 
  Plus, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Check,
  Layers,
  ChevronDown,
  ChevronRight,
  Eye,
  Trash2,
  Sliders,
  ScanText,
  Loader2,
  Info
} from 'lucide-react';
import { 
  PdfFileInfo, 
  DetectedPart, 
  CutProgressState, 
  CutProgressItem 
} from '@/types';
import { getPdfJs, getPdfJsDocumentParams } from '@/lib/pdfReader';
import { sanitizeFilename } from '@/lib/validator';
import { 
  extractPdfRange, 
  downloadFile, 
  createZipBundle, 
  isFileSystemAccessSupported, 
  saveFilesToDirectory, 
  executeCutPlan 
} from '@/lib/cutter';
import { sanitizeDownloadFilename } from '@/lib/downloadContract';
import { createSampleTextbookPdf } from '@/lib/sampleGenerator';
import { PdfPreviewModal } from '@/components/PdfPreviewModal';
import { ProgressModal } from '@/components/ProgressModal';
import { CompletionModal } from '@/components/CompletionModal';
import { ToolLayout } from '@/components/tools/ToolLayout';
import { getToolBySlug } from '@/config/tools';
import { detectDocumentStructure } from '@/lib/structureDetector';
import { DocumentStructure, DocumentSection } from '@/types/structure';

export type ExtractionScopeMode = 'units' | 'sections' | 'manual';
export type WorkflowStep = 'upload' | 'mode_select' | 'structure_select' | 'confirm' | 'cutting' | 'completed';

export interface UnitGroup {
  id: string;
  title: string;
  startPage: number;
  endPage: number;
  confidence: number;
  source: string;
  subsections: DocumentSection[];
}

export interface ManualRangeItem {
  id: string;
  title: string;
  startPage: number;
  endPage: number;
}

export default function PdfUnitCutterPage() {
  const tool = getToolBySlug('pdf-unit-cutter')!;

  // Document State (Step A)
  const [fileInfo, setFileInfo] = useState<PdfFileInfo | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);

  // Workflow Navigation
  const [step, setStep] = useState<WorkflowStep>('upload');
  const [scopeMode, setScopeMode] = useState<ExtractionScopeMode>('units');

  // Structure Detection State (Step C)
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [structure, setStructure] = useState<DocumentStructure | null>(null);
  const [detectionError, setDetectionError] = useState<string | null>(null);

  // Selection States
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set());
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(new Set());
  const [manualRanges, setManualRanges] = useState<ManualRangeItem[]>([]);

  // Expanded groups in sections mode
  const [expandedUnitIds, setExpandedUnitIds] = useState<Set<string>>(new Set());

  // OCR state for scanned files
  const [isOcrRunning, setIsOcrRunning] = useState<boolean>(false);
  const [ocrStatus, setOcrStatus] = useState<string>('');

  // Modals & Preview
  const [previewPart, setPreviewPart] = useState<DetectedPart | null>(null);
  const [completionItems, setCompletionItems] = useState<CutProgressItem[] | null>(null);
  const [isCuttingCancelled, setIsCuttingCancelled] = useState<boolean>(false);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);

  // Folder Access state
  const [isFolderSupported, setIsFolderSupported] = useState<boolean>(false);

  // Cutting Progress state (Step E)
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

  // Group document structure into hierarchical units and subsections
  const unitGroups: UnitGroup[] = useMemo(() => {
    if (!structure || !structure.sections || structure.sections.length === 0) {
      return [];
    }

    const totalPages = fileInfo?.totalPages || structure.totalPages || 1;
    const allSections = structure.sections;

    // Helper to identify generic subsections or non-unit titles
    const isGenericSub = (title: string) => {
      return /^\s*(summary|unit summary|chapter summary|summary of unit|example|examples|input|output|review|unit review|chapter review|review exercises|exercises|key terms|glossary|self-test|self-assessment|activity|activities|project|revision)\b/i.test(
        title.trim()
      );
    };

    // Level 1 candidate sections
    const level1Sections = allSections.filter((s) => s.level === 1);
    // Prefer genuine major units (Unit, Chapter, Module, or non-generic numbered sections)
    const genuineUnits = level1Sections.filter((s) => !isGenericSub(s.title));
    const parentUnits = genuineUnits.length > 0 ? genuineUnits : level1Sections;

    if (parentUnits.length > 0) {
      return parentUnits.map((u, i) => {
        const nextU = parentUnits[i + 1];
        // Calculate true end page of unit spanning all its content up to the next genuine peer
        const computedEnd = nextU 
          ? Math.max(u.startPage, nextU.startPage - 1) 
          : Math.max(u.startPage, totalPages);

        const uIdx = allSections.indexOf(u);
        const nextUIdx = nextU ? allSections.indexOf(nextU) : allSections.length;
        // Subsections include any intermediate sections between u and nextU (or sections with level > 1)
        const sub = allSections.slice(uIdx + 1, nextUIdx).filter((s) => s.id !== u.id);

        return {
          id: u.id,
          title: u.title,
          startPage: u.startPage,
          endPage: Math.min(totalPages, Math.max(u.endPage, computedEnd)),
          confidence: u.confidence,
          source: u.source,
          subsections: sub,
        };
      });
    }

    // Fallback: If no level 1 sections detected, treat each section as an individual unit
    return allSections.map((s, idx) => {
      const nextS = allSections[idx + 1];
      const computedEnd = nextS 
        ? Math.max(s.startPage, nextS.startPage - 1) 
        : Math.max(s.startPage, totalPages);
      return {
        id: s.id,
        title: s.title,
        startPage: s.startPage,
        endPage: Math.min(totalPages, Math.max(s.endPage, computedEnd)),
        confidence: s.confidence,
        source: s.source,
        subsections: [],
      };
    });
  }, [structure, fileInfo?.totalPages]);

  // Expand all units initially when unitGroups changes
  useEffect(() => {
    if (unitGroups.length > 0) {
      setExpandedUnitIds(new Set(unitGroups.map((g) => g.id)));
    }
  }, [unitGroups]);

  // --------------------------------------------------------------------------
  // STEP A: FILE SELECTION & VALIDATION
  // --------------------------------------------------------------------------
  const handleFileSelect = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      setFileBuffer(buffer);

      const pdfjs = await getPdfJs();
      const loadingTask = pdfjs.getDocument(getPdfJsDocumentParams(buffer));
      const pdfDoc = await loadingTask.promise;
      const totalPages = pdfDoc.numPages;

      if (totalPages <= 0) {
        alert('The selected PDF file does not contain any readable pages.');
        return;
      }

      setFileInfo({
        file,
        name: file.name,
        size: file.size,
        totalPages,
        isScanned: false,
        avgCharsPerPage: 0,
      });

      // Reset state for new file
      setStructure(null);
      setDetectionError(null);
      setSelectedUnitIds(new Set());
      setSelectedSectionIds(new Set());
      setManualRanges([
        {
          id: 'manual-1',
          title: 'Unit 1',
          startPage: 1,
          endPage: Math.min(20, totalPages),
        },
      ]);
      setCompletionItems(null);

      // Advance directly to Step B (Ask scope choice)
      setStep('mode_select');
    } catch (err: any) {
      console.error('Error reading PDF file:', err);
      alert(`Could not open PDF: ${err.message || 'Invalid or encrypted PDF document.'}`);
    }
  };

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
    setStructure(null);
    setDetectionError(null);
    setSelectedUnitIds(new Set());
    setSelectedSectionIds(new Set());
    setManualRanges([]);
    setCompletionItems(null);
    setStep('upload');
  };

  // --------------------------------------------------------------------------
  // STEP B: SCOPE MODE SELECTION
  // --------------------------------------------------------------------------
  const handleSelectMode = async (mode: ExtractionScopeMode) => {
    setScopeMode(mode);

    if (mode === 'manual') {
      setStep('structure_select');
      return;
    }

    // If structure already analyzed for this file, proceed to selection
    if (structure && structure.sections.length > 0) {
      setStep('structure_select');
      return;
    }

    // Run structure detection (Step C)
    await runStructureDetection();
  };

  // --------------------------------------------------------------------------
  // STEP C: STRUCTURE DETECTION
  // --------------------------------------------------------------------------
  const runStructureDetection = async () => {
    if (!fileInfo) return;
    const activeBuf = await getActiveBuffer();
    if (!activeBuf) {
      alert('Could not access PDF document data. Please re-select the file.');
      return;
    }

    setIsAnalyzing(true);
    setDetectionError(null);
    setAnalysisProgress({ current: 0, total: 100 });

    try {
      const docStruct = await detectDocumentStructure(activeBuf, (current) => {
        setAnalysisProgress({ current, total: 100 });
      });

      setStructure(docStruct);

      if (docStruct.classification === 'scanned-only') {
        setFileInfo((prev) => (prev ? { ...prev, isScanned: true } : prev));
      }

      if (docStruct.sections.length === 0) {
        setDetectionError(
          'No headings, bookmarks, or Table of Contents were detected in this document. Please use Manual Selection Mode to define your desired page ranges.'
        );
      }

      setStep('structure_select');
    } catch (err: any) {
      console.error('Analysis error:', err);
      setDetectionError(
        `Document analysis encountered an issue: ${err.message || 'Unable to parse structure'}. You can still extract page ranges using Manual Selection.`
      );
      setStep('structure_select');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Optional OCR trigger for scanned documents
  const handleRunOcr = async () => {
    if (!fileInfo) return;
    const activeBuf = await getActiveBuffer();
    if (!activeBuf) return;

    setIsOcrRunning(true);
    setOcrStatus('Initializing OCR engine...');

    try {
      const { performPdfOcr } = await import('@/lib/tools/ocrPdf');
      const baseName = fileInfo.name.replace(/\.[^/.]+$/, '');
      const ocrResult = await performPdfOcr(activeBuf, baseName, 'eng', (pct, status) => {
        setOcrStatus(`${status} (${pct}%)`);
      });

      if (ocrResult.bytes) {
        setFileBuffer(ocrResult.bytes.buffer as ArrayBuffer);
        // Re-run structure detection on the searchable PDF
        await runStructureDetection();
      } else {
        alert(ocrResult.disclaimer || 'OCR could not detect readable text in this document.');
      }
    } catch (err: any) {
      console.error('OCR error:', err);
      alert(`OCR processing error: ${err.message || err}. Please use manual page selection.`);
    } finally {
      setIsOcrRunning(false);
      setOcrStatus('');
    }
  };

  // --------------------------------------------------------------------------
  // SELECTION HANDLERS
  // --------------------------------------------------------------------------
  // Complete Units Toggles
  const handleToggleUnit = (unitId: string) => {
    setSelectedUnitIds((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) {
        next.delete(unitId);
      } else {
        next.add(unitId);
      }
      return next;
    });
  };

  const handleSelectAllUnits = () => {
    setSelectedUnitIds(new Set(unitGroups.map((g) => g.id)));
  };

  const handleDeselectAllUnits = () => {
    setSelectedUnitIds(new Set());
  };

  // Unit Sections Toggles
  const handleToggleSection = (sectionId: string) => {
    setSelectedSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleToggleAllSectionsInUnit = (unit: UnitGroup) => {
    const subIds = unit.subsections.map((s) => s.id);
    const allSelected = subIds.every((id) => selectedSectionIds.has(id));

    setSelectedSectionIds((prev) => {
      const next = new Set(prev);
      subIds.forEach((id) => {
        if (allSelected) {
          next.delete(id);
        } else {
          next.add(id);
        }
      });
      return next;
    });
  };

  const handleSelectAllSectionsGlobally = () => {
    const allSubIds: string[] = [];
    unitGroups.forEach((g) => {
      g.subsections.forEach((s) => allSubIds.push(s.id));
    });
    setSelectedSectionIds(new Set(allSubIds));
  };

  const handleDeselectAllSectionsGlobally = () => {
    setSelectedSectionIds(new Set());
  };

  const handleToggleExpandUnit = (unitId: string) => {
    setExpandedUnitIds((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  // Manual Selection Handlers
  const handleAddManualRange = () => {
    const totalPages = fileInfo?.totalPages || 1;
    const lastItem = manualRanges[manualRanges.length - 1];
    const nextStart = lastItem ? Math.min(totalPages, lastItem.endPage + 1) : 1;
    const nextEnd = Math.min(totalPages, nextStart + 10);

    const newItem: ManualRangeItem = {
      id: `manual-${Date.now()}-${manualRanges.length + 1}`,
      title: `Range ${manualRanges.length + 1}`,
      startPage: nextStart,
      endPage: nextEnd,
    };
    setManualRanges([...manualRanges, newItem]);
  };

  const handleUpdateManualRange = (id: string, field: 'title' | 'startPage' | 'endPage', val: any) => {
    setManualRanges((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return { ...r, [field]: val };
      })
    );
  };

  const handleDeleteManualRange = (id: string) => {
    setManualRanges((prev) => prev.filter((r) => r.id !== id));
  };

  // --------------------------------------------------------------------------
  // STEP D: CONFIRMATION & REVIEW ITEMS
  // --------------------------------------------------------------------------
  interface ExtractionReviewItem {
    id: string;
    title: string;
    startPage: number;
    endPage: number;
    pageCount: number;
    filename: string;
    source: string;
    confidence: string;
  }

  const reviewItems: ExtractionReviewItem[] = useMemo(() => {
    if (!fileInfo) return [];
    const baseName = fileInfo.name.replace(/\.[^/.]+$/, '');

    if (scopeMode === 'units') {
      const selected = unitGroups.filter((g) => selectedUnitIds.has(g.id));
      // In Complete Units mode, prevent accidental duplicate extraction of identical page ranges
      const seenRanges = new Set<string>();
      const dedupedUnits: UnitGroup[] = [];
      for (const g of selected) {
        const rangeKey = `${g.startPage}-${g.endPage}`;
        if (!seenRanges.has(rangeKey)) {
          seenRanges.add(rangeKey);
          dedupedUnits.push(g);
        }
      }

      return dedupedUnits.map((g) => {
        const safeStart = Math.max(1, Math.min(g.startPage, fileInfo.totalPages));
        const safeEnd = Math.max(safeStart, Math.min(g.endPage, fileInfo.totalPages));
        return {
          id: g.id,
          title: g.title,
          startPage: safeStart,
          endPage: safeEnd,
          pageCount: safeEnd - safeStart + 1,
          filename: sanitizeFilename(`${baseName} - ${g.title}.pdf`),
          source: g.source,
          confidence: g.confidence >= 85 ? 'High' : g.confidence >= 70 ? 'Medium' : 'Low',
        };
      });
    }

    if (scopeMode === 'sections') {
      const items: ExtractionReviewItem[] = [];
      unitGroups.forEach((g) => {
        g.subsections.forEach((s) => {
          if (selectedSectionIds.has(s.id)) {
            const safeStart = Math.max(1, Math.min(s.startPage, fileInfo.totalPages));
            const safeEnd = Math.max(safeStart, Math.min(s.endPage, fileInfo.totalPages));
            items.push({
              id: s.id,
              title: s.title,
              startPage: safeStart,
              endPage: safeEnd,
              pageCount: safeEnd - safeStart + 1,
              filename: sanitizeFilename(`${baseName} - ${s.title}.pdf`),
              source: s.source,
              confidence: s.confidence >= 85 ? 'High' : s.confidence >= 70 ? 'Medium' : 'Low',
            });
          }
        });
      });
      return items;
    }

    if (scopeMode === 'manual') {
      return manualRanges
        .filter((r) => r.startPage >= 1 && r.endPage >= r.startPage)
        .map((r) => {
          const safeStart = Math.max(1, Math.min(r.startPage, fileInfo.totalPages));
          const safeEnd = Math.max(safeStart, Math.min(r.endPage, fileInfo.totalPages));
          return {
            id: r.id,
            title: r.title.trim() || `Pages ${safeStart}-${safeEnd}`,
            startPage: safeStart,
            endPage: safeEnd,
            pageCount: safeEnd - safeStart + 1,
            filename: sanitizeFilename(`${baseName} - ${r.title.trim() || `Part ${safeStart}-${safeEnd}`}.pdf`),
            source: 'manual',
            confidence: 'High',
          };
        });
    }

    return [];
  }, [fileInfo, scopeMode, unitGroups, selectedUnitIds, selectedSectionIds, manualRanges]);

  // Calculate selected-page totals using the UNION of selected page ranges
  // so overlapping pages are not counted repeatedly
  const uniqueSelectedPagesSet = useMemo(() => {
    const pageSet = new Set<number>();
    for (const item of reviewItems) {
      for (let p = item.startPage; p <= item.endPage; p++) {
        pageSet.add(p);
      }
    }
    return pageSet;
  }, [reviewItems]);

  const totalPagesToExtract = uniqueSelectedPagesSet.size;

  const rawPagesSum = useMemo(() => {
    return reviewItems.reduce((acc, item) => acc + item.pageCount, 0);
  }, [reviewItems]);

  // Detect overlapping page ranges among selected items
  const overlappingItems = useMemo(() => {
    const overlaps: {
      itemA: ExtractionReviewItem;
      itemB: ExtractionReviewItem;
      sharedStart: number;
      sharedEnd: number;
      sharedCount: number;
    }[] = [];

    for (let i = 0; i < reviewItems.length; i++) {
      for (let j = i + 1; j < reviewItems.length; j++) {
        const a = reviewItems[i];
        const b = reviewItems[j];
        const start = Math.max(a.startPage, b.startPage);
        const end = Math.min(a.endPage, b.endPage);
        if (start <= end) {
          overlaps.push({
            itemA: a,
            itemB: b,
            sharedStart: start,
            sharedEnd: end,
            sharedCount: end - start + 1,
          });
        }
      }
    }
    return overlaps;
  }, [reviewItems]);

  const hasOverlappingRanges = overlappingItems.length > 0;

  const selectedCount = reviewItems.length;

  // Validation for proceeding to review
  const canProceedToReview = selectedCount > 0;

  // --------------------------------------------------------------------------
  // STEP E: EXECUTE EXTRACTION
  // --------------------------------------------------------------------------
  const handleExtract = async () => {
    if (!fileInfo || reviewItems.length === 0) return;
    if (isExtracting) return; // Prevent duplicate export submissions

    const activeBuf = await getActiveBuffer();
    if (!activeBuf) {
      alert('Cannot access PDF document data. Please re-select the file.');
      return;
    }

    setIsExtracting(true);
    setIsCuttingCancelled(false);

    // Convert review items to parts strictly matching user selection
    const partsToCut: DetectedPart[] = reviewItems.map((item) => ({
      id: item.id,
      title: item.title,
      startPage: item.startPage,
      endPage: item.endPage,
      filename: item.filename,
      confidence: item.confidence as any,
      source: item.source as any,
      originalHeading: item.title,
    }));

    try {
      const items = await executeCutPlan(
        activeBuf,
        partsToCut,
        (progress) => setProgressState(progress),
        () => isCuttingCancelled
      );

      if (!isCuttingCancelled) {
        setCompletionItems(items);
        setStep('completed');
      }
    } catch (err: any) {
      console.error('Extraction error:', err);
      alert(`PDF Extraction failed: ${err.message || err}`);
    } finally {
      setIsExtracting(false);
    }
  };

  // Completion downloads
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

      alert(`Successfully saved ${result.savedCount} extracted PDF(s) directly to your folder!`);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        alert(`Folder save error: ${err.message || err}`);
      }
    }
  };

  // Preview page helper
  const handleOpenPreview = (item: { startPage: number; endPage: number; title: string; filename: string }) => {
    setPreviewPart({
      id: 'preview',
      title: item.title,
      startPage: item.startPage,
      endPage: item.endPage,
      filename: item.filename,
      confidence: 'High',
    });
  };

  // --------------------------------------------------------------------------
  // STEPPER BREADCRUMB
  // --------------------------------------------------------------------------
  const renderStepper = () => {
    const stepsConfig = [
      { key: 'upload', label: '1. Upload PDF' },
      { key: 'mode_select', label: '2. Extraction Scope' },
      { key: 'structure_select', label: '3. Select Units/Sections' },
      { key: 'confirm', label: '4. Review & Confirm' },
      { key: 'completed', label: '5. Download' },
    ];

    const currentIdx = stepsConfig.findIndex((s) => s.key === step);

    return (
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between overflow-x-auto text-xs font-semibold gap-2 py-1">
          {stepsConfig.map((s, idx) => {
            const isActive = s.key === step;
            const isCompleted = currentIdx > idx;

            return (
              <div key={s.key} className="flex items-center shrink-0 gap-2">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-xs shadow-brand-500/25'
                      : isCompleted
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={13} className="shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-current text-[10px] flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                  )}
                  <span>{s.label.split('. ')[1]}</span>
                </div>
                {idx < stepsConfig.length - 1 && (
                  <ChevronRight size={14} className="text-slate-300 dark:text-slate-700 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <ToolLayout tool={tool}>
      <div className="space-y-6">
        {/* Stepper Navigation */}
        {renderStepper()}

        {/* ------------------------------------------------------------------ */}
        {/* STEP A: UPLOAD ZONE                                                */}
        {/* ------------------------------------------------------------------ */}
        {step === 'upload' && (
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
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    Select a multi-unit textbook, syllabus, or course document to detect units and sections.
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

                <p className="text-xs text-slate-500 dark:text-slate-400 pt-3">
                  Sample: &ldquo;Biology Grade 10.pdf&rdquo; with Units 1–3, TOC, and front matter.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* FILE INFO BAR (SHOWN WHEN FILE IS LOADED)                         */}
        {/* ------------------------------------------------------------------ */}
        {fileInfo && step !== 'upload' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                <FileText size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                  {fileInfo.name}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  <span>{fileInfo.totalPages} total pages</span>
                  <span>•</span>
                  <span>{(fileInfo.size / (1024 * 1024)).toFixed(2)} MB</span>
                  {fileInfo.isScanned && (
                    <>
                      <span>•</span>
                      <span className="text-amber-500 font-semibold">Scanned document</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {step === 'structure_select' && (
                <button
                  onClick={() => setStep('mode_select')}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Sliders size={14} /> Change Scope Mode
                </button>
              )}
              <button
                onClick={handleRemoveFile}
                className="px-3 py-2 rounded-xl text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
              >
                Change File
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STEP B: ASK WHAT TO EXTRACT (SCOPE SELECTION)                      */}
        {/* ------------------------------------------------------------------ */}
        {step === 'mode_select' && fileInfo && (
          <div className="space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2 pt-2">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                What do you want to extract?
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Choose how granular you want your extraction to be. DocuNexa will only extract the units or sections you explicitly select.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
              {/* Option 1: Complete Units */}
              <div
                onClick={() => handleSelectMode('units')}
                className="group relative p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="w-13 h-13 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/60 flex items-center justify-center transition-transform group-hover:scale-105">
                    <BookOpen size={26} />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 text-[10px] font-bold uppercase tracking-wider mb-2">
                      Full Scope
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      Complete Units
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                      Extract one or more entire units or chapters (e.g. Unit 1, Unit 2, Unit 3) spanning all their internal topics and lessons.
                    </p>
                  </div>
                </div>

                <div className="pt-6">
                  <button className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5">
                    Extract Complete Units <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Option 2: Unit Sections */}
              <div
                onClick={() => handleSelectMode('sections')}
                className="group relative p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="w-13 h-13 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center transition-transform group-hover:scale-105">
                    <Scissors size={26} />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider mb-2">
                      Granular Scope
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      Unit Sections
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                      Extract only selected subsections, individual topics, or specific lessons within a unit (e.g. Section 1.1, Section 1.2).
                    </p>
                  </div>
                </div>

                <div className="pt-6">
                  <button className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5">
                    Extract Unit Sections <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Manual Fallback link */}
            <div className="text-center pt-2">
              <button
                onClick={() => handleSelectMode('manual')}
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors inline-flex items-center gap-1"
              >
                <span>Document has non-standard headings?</span>
                <span className="underline underline-offset-2">Use Manual Page Range Selection</span>
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STEP C: DETECTING IN PROGRESS BANNER                               */}
        {/* ------------------------------------------------------------------ */}
        {isAnalyzing && (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-brand-200 dark:border-brand-800/80 shadow-lg space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 size={20} className="animate-spin text-brand-600 shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Detecting Document Structure...
                </h4>
                <p className="text-xs text-slate-500">
                  Inspecting PDF bookmarks, Table of Contents, and chapter headings.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>Scanning document pages...</span>
                <span>{analysisProgress.current} / {analysisProgress.total}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-brand-600 rounded-full transition-all duration-300"
                  style={{ width: `${analysisProgress.current}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STEP C: STRUCTURE SELECTION (UNITS OR SECTIONS OR MANUAL)           */}
        {/* ------------------------------------------------------------------ */}
        {step === 'structure_select' && !isAnalyzing && (
          <div className="space-y-6">
            {/* Detection Error / No Headings Notice */}
            {detectionError && (
              <div
                role="alert"
                className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3 text-xs text-amber-700 dark:text-amber-300"
              >
                <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1">
                  <div className="font-semibold">Heading Structure Not Detected</div>
                  <div className="leading-relaxed">{detectionError}</div>
                  {scopeMode !== 'manual' && (
                    <button
                      onClick={() => setScopeMode('manual')}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold text-[11px] hover:bg-amber-700 transition-colors inline-flex items-center gap-1"
                    >
                      Switch to Manual Page Ranges <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Scanned Document OCR Banner */}
            {fileInfo?.isScanned && (
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-indigo-700 dark:text-indigo-300">
                  <ScanText size={18} className="shrink-0" />
                  <span>
                    This PDF appears to be scanned. OCR text recognition can be run to detect headings.
                  </span>
                </div>
                <button
                  onClick={handleRunOcr}
                  disabled={isOcrRunning}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isOcrRunning ? (
                    <>
                      <Loader2 size={12} className="animate-spin" /> {ocrStatus || 'Running OCR...'}
                    </>
                  ) : (
                    <>Run OCR Heading Recognition</>
                  )}
                </button>
              </div>
            )}

            {/* Scope Mode Header & Batch Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Mode:
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-bold text-xs border border-brand-200 dark:border-brand-800/60">
                  {scopeMode === 'units'
                    ? 'Complete Units'
                    : scopeMode === 'sections'
                    ? 'Unit Sections'
                    : 'Manual Page Ranges'}
                </span>
              </div>

              {/* Convenience selection toggles */}
              <div className="flex items-center gap-2 text-xs font-semibold">
                {scopeMode === 'units' && unitGroups.length > 0 && (
                  <>
                    <button
                      onClick={handleSelectAllUnits}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      Select All Units
                    </button>
                    <button
                      onClick={handleDeselectAllUnits}
                      className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    >
                      Deselect All
                    </button>
                  </>
                )}

                {scopeMode === 'sections' && unitGroups.length > 0 && (
                  <>
                    <button
                      onClick={handleSelectAllSectionsGlobally}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      Select All Sections
                    </button>
                    <button
                      onClick={handleDeselectAllSectionsGlobally}
                      className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    >
                      Deselect All
                    </button>
                  </>
                )}

                {scopeMode === 'manual' && (
                  <button
                    onClick={handleAddManualRange}
                    className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors flex items-center gap-1 text-xs"
                  >
                    <Plus size={14} /> Add Page Range
                  </button>
                )}
              </div>
            </div>

            {/* Whole-page preservation disclaimer alert */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
              <Info size={16} className="shrink-0 mt-0.5 text-brand-600 dark:text-brand-400" />
              <span>
                <strong>Page-level extraction note:</strong> PDF slicing operates on complete pages. Where a unit or section shares a boundary page with adjacent text, the entire shared page is preserved.
              </span>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* MODE: COMPLETE UNITS SELECTION                                 */}
            {/* -------------------------------------------------------------- */}
            {scopeMode === 'units' && (
              <div className="space-y-3">
                {unitGroups.length === 0 ? (
                  <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
                    <p className="text-sm text-slate-500">No units detected automatically.</p>
                    <button
                      onClick={() => setScopeMode('manual')}
                      className="px-4 py-2 rounded-xl bg-brand-600 text-white font-semibold text-xs"
                    >
                      Switch to Manual Page Ranges
                    </button>
                  </div>
                ) : (
                  unitGroups.map((unit) => {
                    const isSelected = selectedUnitIds.has(unit.id);
                    const pageSpan = unit.endPage - unit.startPage + 1;

                    return (
                      <div
                        key={unit.id}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-brand-50/50 dark:bg-brand-950/20 border-brand-500 shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <label className="flex items-center gap-3.5 cursor-pointer min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleUnit(unit.id)}
                              className="w-5 h-5 rounded-md text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-slate-700 shrink-0 cursor-pointer"
                            />
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                                {unit.title}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                                <span className="font-medium text-brand-600 dark:text-brand-400">
                                  Pages {unit.startPage} – {unit.endPage}
                                </span>
                                <span>•</span>
                                <span>{pageSpan} {pageSpan === 1 ? 'page' : 'pages'}</span>
                                {unit.subsections.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>{unit.subsections.length} sub-sections included</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </label>

                          <button
                            onClick={() =>
                              handleOpenPreview({
                                startPage: unit.startPage,
                                endPage: unit.endPage,
                                title: unit.title,
                                filename: `${unit.title}.pdf`,
                              })
                            }
                            title="Preview first page of unit"
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* -------------------------------------------------------------- */}
            {/* MODE: UNIT SECTIONS SELECTION                                  */}
            {/* -------------------------------------------------------------- */}
            {scopeMode === 'sections' && (
              <div className="space-y-4">
                {unitGroups.every((g) => g.subsections.length === 0) ? (
                  <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No nested subsections (e.g. 1.1, 1.2) were detected in this document.
                    </p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      You can either extract complete units or enter custom section page ranges in manual mode.
                    </p>
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        onClick={() => setScopeMode('units')}
                        className="px-4 py-2 rounded-xl bg-brand-600 text-white font-semibold text-xs"
                      >
                        Extract Complete Units
                      </button>
                      <button
                        onClick={() => setScopeMode('manual')}
                        className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs"
                      >
                        Use Manual Ranges
                      </button>
                    </div>
                  </div>
                ) : (
                  unitGroups.map((unit) => {
                    const isExpanded = expandedUnitIds.has(unit.id);
                    const subCount = unit.subsections.length;
                    const selectedInUnitCount = unit.subsections.filter((s) =>
                      selectedSectionIds.has(s.id)
                    ).length;

                    return (
                      <div
                        key={unit.id}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs"
                      >
                        {/* Parent Unit Header */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                          <button
                            onClick={() => handleToggleExpandUnit(unit.id)}
                            className="flex items-center gap-2.5 text-left font-bold text-sm text-slate-900 dark:text-white flex-1 min-w-0"
                          >
                            {isExpanded ? (
                              <ChevronDown size={16} className="text-slate-400 shrink-0" />
                            ) : (
                              <ChevronRight size={16} className="text-slate-400 shrink-0" />
                            )}
                            <span className="truncate">{unit.title}</span>
                            <span className="text-xs font-normal text-slate-500 shrink-0">
                              (Pages {unit.startPage}–{unit.endPage})
                            </span>
                          </button>

                          {subCount > 0 && (
                            <button
                              onClick={() => handleToggleAllSectionsInUnit(unit)}
                              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                            >
                              {selectedInUnitCount === subCount
                                ? 'Deselect All'
                                : `Select All (${subCount})`}
                            </button>
                          )}
                        </div>

                        {/* Nested Subsections List */}
                        {isExpanded && (
                          <div className="p-3 sm:p-4 space-y-2">
                            {subCount === 0 ? (
                              <p className="text-xs text-slate-400 italic px-2 py-1">
                                No subsections detected under this unit.
                              </p>
                            ) : (
                              unit.subsections.map((sub) => {
                                const isChecked = selectedSectionIds.has(sub.id);
                                const pageSpan = sub.endPage - sub.startPage + 1;

                                return (
                                  <div
                                    key={sub.id}
                                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                                      isChecked
                                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-400'
                                        : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                                    }`}
                                  >
                                    <label className="flex items-center gap-3 cursor-pointer min-w-0 flex-1">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleToggleSection(sub.id)}
                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 shrink-0 cursor-pointer"
                                      />
                                      <div className="min-w-0">
                                        <div className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 truncate">
                                          {sub.title}
                                        </div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                          Pages {sub.startPage} – {sub.endPage} ({pageSpan}{' '}
                                          {pageSpan === 1 ? 'page' : 'pages'})
                                        </div>
                                      </div>
                                    </label>

                                    <button
                                      onClick={() =>
                                        handleOpenPreview({
                                          startPage: sub.startPage,
                                          endPage: sub.endPage,
                                          title: sub.title,
                                          filename: `${sub.title}.pdf`,
                                        })
                                      }
                                      title="Preview section"
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    >
                                      <Eye size={15} />
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* -------------------------------------------------------------- */}
            {/* MODE: MANUAL SELECTION                                         */}
            {/* -------------------------------------------------------------- */}
            {scopeMode === 'manual' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        Custom Page Ranges
                      </h4>
                      <p className="text-xs text-slate-500">
                        Specify exact start and end pages for each unit or section you wish to extract.
                      </p>
                    </div>
                    <button
                      onClick={handleAddManualRange}
                      className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition-colors flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Range
                    </button>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    {manualRanges.map((range, index) => {
                      const isValidRange =
                        range.startPage >= 1 &&
                        range.endPage >= range.startPage &&
                        range.endPage <= (fileInfo?.totalPages || 9999);
                      const pageSpan = range.endPage - range.startPage + 1;

                      return (
                        <div
                          key={range.id}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-wrap items-center gap-3"
                        >
                          <div className="flex-1 min-w-[140px]">
                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                              Label / Name
                            </label>
                            <input
                              type="text"
                              value={range.title}
                              onChange={(e) =>
                                handleUpdateManualRange(range.id, 'title', e.target.value)
                              }
                              placeholder="e.g. Unit 1"
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500"
                            />
                          </div>

                          <div className="w-24">
                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                              Start Page
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={fileInfo?.totalPages || 9999}
                              value={range.startPage}
                              onChange={(e) =>
                                handleUpdateManualRange(
                                  range.id,
                                  'startPage',
                                  parseInt(e.target.value, 10) || 1
                                )
                              }
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500"
                            />
                          </div>

                          <div className="w-24">
                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                              End Page
                            </label>
                            <input
                              type="number"
                              min={range.startPage}
                              max={fileInfo?.totalPages || 9999}
                              value={range.endPage}
                              onChange={(e) =>
                                handleUpdateManualRange(
                                  range.id,
                                  'endPage',
                                  parseInt(e.target.value, 10) || range.startPage
                                )
                              }
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500"
                            />
                          </div>

                          <div className="pt-4 flex items-center gap-2">
                            <span
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                                isValidRange
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                  : 'bg-rose-100 text-rose-600'
                              }`}
                            >
                              {isValidRange ? `${pageSpan} pages` : 'Invalid Range'}
                            </span>

                            <button
                              onClick={() =>
                                handleOpenPreview({
                                  startPage: range.startPage,
                                  endPage: range.endPage,
                                  title: range.title,
                                  filename: `${range.title}.pdf`,
                                })
                              }
                              title="Preview range"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Eye size={15} />
                            </button>

                            {manualRanges.length > 1 && (
                              <button
                                onClick={() => handleDeleteManualRange(range.id)}
                                title="Delete range"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Action Bar for Step C */}
            <div className="sticky bottom-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4 z-10">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    canProceedToReview ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                />
                <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {selectedCount > 0 ? (
                    <>
                      <strong>{selectedCount}</strong> {selectedCount === 1 ? 'item' : 'items'} selected (
                      <strong>{totalPagesToExtract}</strong> unique {totalPagesToExtract === 1 ? 'page' : 'pages'}
                      {hasOverlappingRanges && ` · ${rawPagesSum} across files`}
                      )
                    </>
                  ) : (
                    'Please select at least one unit or section to proceed.'
                  )}
                </span>
              </div>

              <button
                onClick={() => setStep('confirm')}
                disabled={!canProceedToReview}
                className="py-2.5 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-brand-500/20 hover:shadow-brand-500/35 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Review Selection ({selectedCount}) <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STEP D: CONFIRM SELECTION BEFORE CUTTING                          */}
        {/* ------------------------------------------------------------------ */}
        {step === 'confirm' && fileInfo && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Confirm Extraction Selection
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Verify the exact units/sections and page ranges below before extracting. Only the selected ranges will be processed.
                  </p>
                </div>
                <button
                  onClick={() => setStep('structure_select')}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} /> Back to Selection
                </button>
              </div>

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Mode
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 capitalize">
                    {scopeMode === 'units' ? 'Complete Units' : scopeMode === 'sections' ? 'Unit Sections' : 'Manual Ranges'}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Selected Items
                  </div>
                  <div className="text-sm font-bold text-brand-600 dark:text-brand-400 mt-1">
                    {selectedCount} {selectedCount === 1 ? 'part' : 'parts'}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Pages to Extract
                  </div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {totalPagesToExtract} of {fileInfo.totalPages}
                  </div>
                  {hasOverlappingRanges && (
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                      ({rawPagesSum} pages across files)
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Doc Coverage
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    {Math.min(100, Math.round((totalPagesToExtract / Math.max(1, fileInfo.totalPages)) * 100))}%
                  </div>
                </div>
              </div>

              {/* Overlapping Ranges Alert */}
              {hasOverlappingRanges && (
                <div
                  role="alert"
                  className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300"
                >
                  <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-1">
                    <div className="font-semibold">Overlapping Page Ranges Detected</div>
                    <div className="leading-relaxed">
                      {overlappingItems.length} {overlappingItems.length === 1 ? 'pair' : 'pairs'} of selected items share common pages (e.g., &quot;{overlappingItems[0].itemA.title}&quot; and &quot;{overlappingItems[0].itemB.title}&quot; share pages {overlappingItems[0].sharedStart}–{overlappingItems[0].sharedEnd}).
                      A total of <strong>{totalPagesToExtract}</strong> unique PDF pages will be extracted across {selectedCount} items without duplicating page counts.
                    </div>
                  </div>
                </div>
              )}

              {/* Review Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 mt-4">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Title / Label</th>
                      <th className="py-3 px-4">PDF Page Range</th>
                      <th className="py-3 px-4">Pages</th>
                      <th className="py-3 px-4">Generated Filename</th>
                      <th className="py-3 px-4 text-right">Preview</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {reviewItems.map((item, idx) => {
                      const isItemOverlapping = overlappingItems.some(
                        (o) => o.itemA.id === item.id || o.itemB.id === item.id
                      );
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {item.title}
                          </td>
                          <td className="py-3 px-4 text-brand-600 dark:text-brand-400 font-semibold">
                            Pages {item.startPage} – {item.endPage}
                            {isItemOverlapping && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-normal">
                                Shared Pages
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            {item.pageCount}
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px] truncate max-w-xs">
                            {item.filename}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleOpenPreview(item)}
                              title="Preview first page"
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            >
                              <Eye size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setStep('structure_select')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} /> Back to Modify Selection
                </button>

                <button
                  onClick={handleExtract}
                  disabled={isExtracting}
                  className="py-3 px-7 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm transition-all shadow-md shadow-brand-500/25 hover:shadow-brand-500/40 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Extracting Pages...
                    </>
                  ) : (
                    <>
                      <Scissors size={16} /> Extract Selected Units/Sections
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* MODALS: PREVIEW, PROGRESS, COMPLETION                               */}
        {/* ------------------------------------------------------------------ */}
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
            setIsExtracting(false);
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
              setStep('upload');
              setFileInfo(null);
              setFileBuffer(null);
              setStructure(null);
              setSelectedUnitIds(new Set());
              setSelectedSectionIds(new Set());
              setManualRanges([]);
            }}
          />
        )}
      </div>
    </ToolLayout>
  );
}
