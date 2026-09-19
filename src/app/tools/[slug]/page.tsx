'use client';

import React, { useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ALL_TOOLS,
  getToolBySlug
} from '@/config/tools';
import { ToolLayout } from '@/components/tools/ToolLayout';
import { PdfDropzone } from '@/components/common/PdfDropzone';
import { ProcessingProgress } from '@/components/common/ProcessingProgress';
import { ResultPanel, ResultFileItem } from '@/components/common/ResultPanel';
import { PdfThumbnailGrid } from '@/components/common/PdfThumbnailGrid';
import { AdSlot } from '@/components/ads/AdSlot';
import { getPdfJs, getPdfJsDocumentParams } from '@/lib/pdfReader';
import { downloadFile } from '@/lib/cutter';
import {
  mergePdfs,
  splitPdfByRanges,
  splitPdfEveryNPages,
  removePdfPages,
  extractPdfPages,
  rotatePdf,
  addPageNumbersToPdf,
  addWatermarkToPdf,
  imagesToPdf,
  pdfToImages
} from '@/lib/pdfEngine';

import {
  FileText,
  Trash2,
  MoveUp,
  MoveDown,
  RotateCw,
  Check,
  Sparkles,
  Copy,
  Download,
  Camera,
  Sliders,
  Layers,
  AlertTriangle,
  Info,
  CheckCircle2,
  Wrench,
  FileSearch,
  Table,
  Presentation,
  ShieldCheck,
  CheckSquare,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';

// Specialized Tool Subcomponents
import { ProtectPdfTool } from '@/components/tools/ProtectPdfTool';
import { UnlockPdfTool } from '@/components/tools/UnlockPdfTool';
import { SignPdfTool } from '@/components/tools/SignPdfTool';
import { RedactPdfTool } from '@/components/tools/RedactPdfTool';
import { ComparePdfTool } from '@/components/tools/ComparePdfTool';
import { CropPdfTool } from '@/components/tools/CropPdfTool';

// Modular Services
import { convertPdfToExcel, ExcelConversionResult } from '@/lib/tools/pdfToExcel';
import { convertPdfToWord } from '@/lib/tools/pdfToWord';
import { convertPdfToPowerPoint } from '@/lib/tools/pdfToPowerPoint';
import { preparePdfA } from '@/lib/tools/pdfToPdfA';
import { repairPdf, RepairPdfResult } from '@/lib/tools/repairPdf';
import { performPdfOcr, OcrResult } from '@/lib/tools/ocrPdf';
import { performPdfCompression, CompressResult } from '@/lib/tools/compressPdf';
import { detectPdfFormFields, fillPdfForm, FormFieldInfo } from '@/lib/tools/pdfForms';
import {
  convertExcelToPdf,
  convertWordToPdf,
  convertPowerPointToPdf,
  convertHtmlToPdf
} from '@/lib/tools/officeToPdf';
import {
  summarizePdfDocument,
  ChunkedSummaryResult,
  formatSummaryAsMarkdown,
  formatSummaryAsPlainText
} from '@/lib/tools/aiSummarizer';
import { translatePdfDocument, TranslationResult } from '@/lib/tools/translatePdf';
import {
  SUPPORTED_LANGUAGES_MATRIX
} from '@/lib/tools/translationProvider';
import { convertPdfToMarkdown, MarkdownResult } from '@/lib/tools/pdfToMarkdown';
import { getToolDefinition } from '@/lib/tools/toolRegistry';

export default function UniversalToolPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const tool = getToolBySlug(slug);

  // ----------------------------------------------------
  // REACT RULES OF HOOKS COMPLIANCE:
  // All hooks MUST execute unconditionally at the very top.
  // ----------------------------------------------------
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileBuffers, setFileBuffers] = useState<ArrayBuffer[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [resultFiles, setResultFiles] = useState<ResultFileItem[] | null>(null);

  // Tool-specific configuration states
  const [splitMode, setSplitMode] = useState<'ranges' | 'every-n'>('ranges');
  const [rangeInput, setRangeInput] = useState<string>('1-5, 6-10');
  const [everyN, setEveryN] = useState<number>(2);
  const [selectedPageNumbers, setSelectedPageNumbers] = useState<number[]>([]);
  const [rotateAngle, setRotateAngle] = useState<number>(90);
  const [numberPosition, setNumberPosition] = useState<'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-center'>('bottom-center');
  const [numberFormat, setNumberFormat] = useState<'number' | 'page-of-total'>('page-of-total');
  const [startNumber, setStartNumber] = useState<number>(1);
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.3);
  const [watermarkRotation, setWatermarkRotation] = useState<number>(45);
  const [compressLevel, setCompressLevel] = useState<'low' | 'balanced' | 'strong'>('balanced');
  const [accurateCompressStats, setAccurateCompressStats] = useState<CompressResult | null>(null);
  const [ocrLanguage, setOcrLanguage] = useState<'eng' | 'amh'>('eng');
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [formFields, setFormFields] = useState<FormFieldInfo[] | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string | boolean>>({});
  const [hasScannedFormNotice, setHasScannedFormNotice] = useState<boolean>(false);
  const [repairDiagnostic, setRepairDiagnostic] = useState<RepairPdfResult | null>(null);
  const [aiSummary, setAiSummary] = useState<ChunkedSummaryResult | null>(null);
  const [aiMarkdown, setAiMarkdown] = useState<MarkdownResult | null>(null);
  const [targetLang, setTargetLang] = useState<string>('amh');
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [excelResult, setExcelResult] = useState<ExcelConversionResult | null>(null);

  if (!tool) {
    notFound();
  }

  // Dedicated security and specialized tools rendered after hooks execute
  if (tool.id === 'protect-pdf') {
    return (
      <ToolLayout tool={tool}>
        <div className="max-w-4xl mx-auto space-y-6">
          <AdSlot placement="banner" className="mb-2" />
          <ProtectPdfTool />
          <AdSlot placement="banner" className="mt-6" />
        </div>
      </ToolLayout>
    );
  }

  if (tool.id === 'unlock-pdf') {
    return (
      <ToolLayout tool={tool}>
        <div className="max-w-4xl mx-auto space-y-6">
          <AdSlot placement="banner" className="mb-2" />
          <UnlockPdfTool />
          <AdSlot placement="banner" className="mt-6" />
        </div>
      </ToolLayout>
    );
  }

  if (tool.id === 'sign-pdf') {
    return (
      <ToolLayout tool={tool}>
        <div className="max-w-4xl mx-auto space-y-6">
          <AdSlot placement="banner" className="mb-2" />
          <SignPdfTool />
          <AdSlot placement="banner" className="mt-6" />
        </div>
      </ToolLayout>
    );
  }

  if (tool.id === 'redact-pdf') {
    return (
      <ToolLayout tool={tool}>
        <div className="max-w-4xl mx-auto space-y-6">
          <AdSlot placement="banner" className="mb-2" />
          <RedactPdfTool />
          <AdSlot placement="banner" className="mt-6" />
        </div>
      </ToolLayout>
    );
  }

  if (tool.id === 'compare-pdf') {
    return (
      <ToolLayout tool={tool}>
        <div className="max-w-4xl mx-auto space-y-6">
          <AdSlot placement="banner" className="mb-2" />
          <ComparePdfTool />
          <AdSlot placement="banner" className="mt-6" />
        </div>
      </ToolLayout>
    );
  }

  if (tool.id === 'crop-pdf') {
    return (
      <ToolLayout tool={tool}>
        <div className="max-w-4xl mx-auto space-y-6">
          <AdSlot placement="banner" className="mb-2" />
          <CropPdfTool />
          <AdSlot placement="banner" className="mt-6" />
        </div>
      </ToolLayout>
    );
  }

  const toolDef = getToolDefinition(tool.id);

  // Handle file selection / drop
  const handleFilesSelected = async (files: File[]) => {
    setSelectedFiles(files);
    setResultFiles(null);
    setExcelResult(null);
    setOcrResult(null);
    setAiSummary(null);
    setAiMarkdown(null);
    setTranslationResult(null);
    setRepairDiagnostic(null);
    setAccurateCompressStats(null);
    setProcessingStatus('');

    try {
      const buffers = await Promise.all(files.map((f) => f.arrayBuffer()));
      setFileBuffers(buffers);

      if (files[0] && files[0].name.toLowerCase().endsWith('.pdf')) {
        const pdfjs = await getPdfJs();
        const loadingTask = pdfjs.getDocument(getPdfJsDocumentParams(buffers[0]));
        const pdfDoc = await loadingTask.promise;
        setTotalPages(pdfDoc.numPages);

        // Pre-scan AcroForm fields if on pdf-forms tool
        if (tool.id === 'pdf-forms') {
          const formDetect = await detectPdfFormFields(buffers[0]);
          if (formDetect.hasForm) {
            setFormFields(formDetect.fields);
            const initialVals: Record<string, string | boolean> = {};
            formDetect.fields.forEach((f) => {
              initialVals[f.name] = f.value;
            });
            setFormValues(initialVals);
            setHasScannedFormNotice(false);
          } else {
            setFormFields([]);
            setHasScannedFormNotice(true);
          }
        }
      }
    } catch (err) {
      console.error('File load error:', err);
    }
  };

  const handleReset = () => {
    setSelectedFiles([]);
    setFileBuffers([]);
    setTotalPages(0);
    setResultFiles(null);
    setExcelResult(null);
    setOcrResult(null);
    setAccurateCompressStats(null);
    setRepairDiagnostic(null);
    setFormFields(null);
    setFormValues({});
    setHasScannedFormNotice(false);
    setAiSummary(null);
    setAiMarkdown(null);
    setTranslationResult(null);
    setProgress(0);
    setProcessingStatus('');
  };

  const getDisabledReason = (): string | null => {
    if (selectedFiles.length === 0 || fileBuffers.length === 0) {
      return 'Please upload a document to proceed';
    }
    if (tool.id === 'merge-pdf' && selectedFiles.length < 2) {
      return 'Please add at least 2 PDF documents to merge';
    }
    if ((tool.id === 'remove-pages' || tool.id === 'extract-pages') && selectedPageNumbers.length === 0) {
      return tool.id === 'remove-pages'
        ? 'Please click one or more pages in the preview grid to remove'
        : 'Please click one or more pages in the preview grid to extract';
    }
    if (tool.id === 'split-pdf' && splitMode === 'ranges' && !rangeInput.trim()) {
      return 'Please enter valid page ranges (e.g. 1-5, 6-10)';
    }
    if (tool.id === 'pdf-forms' && formFields && formFields.length === 0) {
      return 'This document contains no interactive AcroForm fields';
    }
    return null;
  };

  // ----------------------------------------------------
  // Execution Handlers per Tool (NO Generic Fallback)
  // ----------------------------------------------------
  const handleProcessTool = async () => {
    if (getDisabledReason()) return;

    setIsProcessing(true);
    setProgress(10);
    setProcessingStatus('Preparing document processor...');

    try {
      const primaryBuf = fileBuffers[0];
      const baseName = selectedFiles[0].name.replace(/\.[^/.]+$/, '');

      switch (tool.id) {
        // 1. MERGE PDF
        case 'merge-pdf': {
          setProgress(30);
          setProcessingStatus('Merging documents in selected sequence...');
          const mergedBytes = await mergePdfs(fileBuffers);
          setProgress(100);
          setResultFiles([
            {
              name: `${baseName} - Merged.pdf`,
              bytes: mergedBytes,
            },
          ]);
          break;
        }

        // 2. SPLIT PDF
        case 'split-pdf': {
          setProgress(40);
          setProcessingStatus('Partitioning document pages...');
          if (splitMode === 'ranges') {
            const parts = rangeInput.split(',').map((s) => s.trim()).filter(Boolean);
            const parsedRanges: { start: number; end: number; name: string }[] = [];
            parts.forEach((part, idx) => {
              if (part.includes('-')) {
                const [s, e] = part.split('-').map((v) => parseInt(v.trim(), 10));
                if (!isNaN(s) && !isNaN(e)) {
                  parsedRanges.push({ start: Math.min(s, e), end: Math.max(s, e), name: `${baseName} - Part ${idx + 1} (pp ${s}-${e}).pdf` });
                }
              } else {
                const p = parseInt(part, 10);
                if (!isNaN(p)) {
                  parsedRanges.push({ start: p, end: p, name: `${baseName} - Page ${p}.pdf` });
                }
              }
            });
            const validRanges = parsedRanges.length > 0 ? parsedRanges : [{ start: 1, end: 1, name: `${baseName} - Part 1.pdf` }];
            const splitParts = await splitPdfByRanges(primaryBuf, validRanges);
            setProgress(100);
            setResultFiles(
              splitParts.map((p) => ({
                name: p.name,
                bytes: p.bytes,
              }))
            );
          } else {
            const splitParts = await splitPdfEveryNPages(primaryBuf, everyN, baseName);
            setProgress(100);
            setResultFiles(
              splitParts.map((p) => ({
                name: p.name,
                bytes: p.bytes,
              }))
            );
          }
          break;
        }

        // 3. REMOVE PAGES
        case 'remove-pages': {
          setProgress(50);
          setProcessingStatus(`Removing ${selectedPageNumbers.length} selected pages...`);
          const remainingBytes = await removePdfPages(primaryBuf, selectedPageNumbers);
          setProgress(100);
          setResultFiles([
            {
              name: `${baseName} - (Pages Removed).pdf`,
              bytes: remainingBytes,
            },
          ]);
          break;
        }

        // 4. EXTRACT PAGES
        case 'extract-pages': {
          setProgress(50);
          setProcessingStatus(`Extracting ${selectedPageNumbers.length} isolated pages...`);
          const extractedBytes = await extractPdfPages(primaryBuf, selectedPageNumbers);
          setProgress(100);
          setResultFiles([
            {
              name: `${baseName} - (Extracted Pages).pdf`,
              bytes: extractedBytes,
            },
          ]);
          break;
        }

        // 5. ORGANIZE PDF
        case 'organize-pdf': {
          setProgress(50);
          setProcessingStatus('Reordering and compiling pages...');
          const orderedPages = Array.from({ length: totalPages }, (_, i) => i + 1);
          const organizedBytes = await extractPdfPages(primaryBuf, orderedPages);
          setProgress(100);
          setResultFiles([
            {
              name: `${baseName} - (Organized).pdf`,
              bytes: organizedBytes,
            },
          ]);
          break;
        }

        // 6. ROTATE PDF
        case 'rotate-pdf': {
          setProgress(50);
          setProcessingStatus(`Rotating all pages by ${rotateAngle}°...`);
          const rotatedBytes = await rotatePdf(primaryBuf, rotateAngle);
          setProgress(100);
          setResultFiles([
            {
              name: `${baseName} - (Rotated ${rotateAngle}deg).pdf`,
              bytes: rotatedBytes,
            },
          ]);
          break;
        }

        // 7. ADD PAGE NUMBERS
        case 'add-page-numbers': {
          setProgress(50);
          setProcessingStatus('Applying vector page number stamps...');
          const numberedBytes = await addPageNumbersToPdf(primaryBuf, {
            position: numberPosition,
            format: numberFormat,
            startNumber: startNumber,
            fontSize: 10,
          });
          setProgress(100);
          setResultFiles([
            {
              name: `${baseName} - (Numbered).pdf`,
              bytes: numberedBytes,
            },
          ]);
          break;
        }

        // 8. ADD WATERMARK
        case 'add-watermark': {
          setProgress(50);
          setProcessingStatus('Stamping diagonal watermark overlay...');
          const watermarkedBytes = await addWatermarkToPdf(primaryBuf, {
            text: watermarkText,
            opacity: watermarkOpacity,
            rotation: watermarkRotation,
            fontSize: 48,
          });
          setProgress(100);
          setResultFiles([
            {
              name: `${baseName} - (Watermarked).pdf`,
              bytes: watermarkedBytes,
            },
          ]);
          break;
        }

        // 9. COMPRESS PDF (Unfabricated Delta & Dual Parser Validation)
        case 'compress-pdf': {
          const compRes = await performPdfCompression(primaryBuf, baseName, compressLevel, (pct, msg) => {
            setProgress(pct);
            setProcessingStatus(msg);
          });
          setProgress(100);
          setAccurateCompressStats(compRes);
          setResultFiles([
            {
              name: compRes.filename,
              bytes: compRes.bytes,
            },
          ]);
          break;
        }

        // 10. REPAIR PDF (4 Honest Diagnostic States)
        case 'repair-pdf': {
          const repRes = await repairPdf(primaryBuf, baseName, (pct, msg) => {
            setProgress(pct);
            setProcessingStatus(msg);
          });
          setProgress(100);
          setRepairDiagnostic(repRes);
          if (repRes.bytes) {
            setResultFiles([
              {
                name: repRes.filename,
                bytes: repRes.bytes,
              },
            ]);
          }
          break;
        }

        // 11. PDF TO EXCEL (Real SheetJS XLSX with Repeated Grid Evidence)
        case 'pdf-to-excel': {
          const excelRes = await convertPdfToExcel(primaryBuf, baseName, (pct, msg) => {
            setProgress(pct);
            setProcessingStatus(msg);
          });
          setProgress(100);
          setExcelResult(excelRes);
          if (excelRes.canDownload && excelRes.bytes) {
            setResultFiles([
              {
                name: excelRes.filename,
                bytes: excelRes.bytes,
              },
            ]);
          } else {
            setResultFiles(null);
          }
          break;
        }

        // 12. PDF TO WORD (Genuine .docx Open XML)
        case 'pdf-to-word': {
          const wordRes = await convertPdfToWord(primaryBuf, baseName, (pct, msg) => {
            setProgress(pct);
            setProcessingStatus(msg);
          });
          setProgress(100);
          setResultFiles([
            {
              name: wordRes.filename,
              bytes: wordRes.bytes,
            },
          ]);
          break;
        }

        // 13. PDF TO POWERPOINT (Real .pptx Slide Deck)
        case 'pdf-to-powerpoint': {
          const pptRes = await convertPdfToPowerPoint(primaryBuf, baseName, (pct, msg) => {
            setProgress(pct);
            setProcessingStatus(msg);
          });
          setProgress(100);
          setResultFiles([
            {
              name: pptRes.filename,
              bytes: pptRes.bytes,
            },
          ]);
          break;
        }

        // 14. PDF TO PDF/A (Experimental Metadata Preparation)
        case 'pdf-to-pdfa': {
          setProgress(50);
          setProcessingStatus('Injecting ISO-19005 archiving metadata...');
          const pdfaRes = await preparePdfA(primaryBuf, baseName);
          setProgress(100);
          setResultFiles([
            {
              name: pdfaRes.filename,
              bytes: pdfaRes.bytes,
            },
          ]);
          break;
        }

        // 15. OCR PDF (Web Worker Tesseract.js & UTF-8 Transcript)
        case 'ocr-pdf': {
          const ocrRes = await performPdfOcr(primaryBuf, baseName, ocrLanguage, (pct, msg) => {
            setProgress(pct);
            setProcessingStatus(msg);
          });
          setProgress(100);
          setOcrResult(ocrRes);
          setResultFiles([
            {
              name: ocrRes.filename,
              bytes: ocrRes.bytes,
            },
          ]);
          break;
        }

        // 16. PDF FORMS (Genuine AcroForm Filler)
        case 'pdf-forms': {
          setProgress(60);
          setProcessingStatus('Populating interactive form fields...');
          const formRes = await fillPdfForm(primaryBuf, formValues, baseName);
          setProgress(100);
          setResultFiles([
            {
              name: formRes.filename,
              bytes: formRes.bytes,
            },
          ]);
          break;
        }

        // 17. EXCEL TO PDF
        case 'excel-to-pdf': {
          setProgress(50);
          setProcessingStatus('Reconstructing spreadsheet tables into paginated PDF...');
          const res = await convertExcelToPdf(primaryBuf, baseName);
          setProgress(100);
          setResultFiles([
            {
              name: res.filename,
              bytes: res.bytes,
            },
          ]);
          break;
        }

        // 18. WORD TO PDF
        case 'word-to-pdf': {
          setProgress(50);
          setProcessingStatus('Converting Word document into printable PDF...');
          const res = await convertWordToPdf(primaryBuf, baseName);
          setProgress(100);
          setResultFiles([
            {
              name: res.filename,
              bytes: res.bytes,
            },
          ]);
          break;
        }

        // 19. POWERPOINT TO PDF
        case 'powerpoint-to-pdf': {
          setProgress(50);
          setProcessingStatus('Extracting presentation slides into landscape PDF...');
          const res = await convertPowerPointToPdf(primaryBuf, baseName);
          setProgress(100);
          setResultFiles([
            {
              name: res.filename,
              bytes: res.bytes,
            },
          ]);
          break;
        }

        // 20. HTML TO PDF
        case 'html-to-pdf': {
          setProgress(50);
          setProcessingStatus('Rendering HTML markup to formatted PDF...');
          const htmlContent = new TextDecoder().decode(primaryBuf);
          const res = await convertHtmlToPdf(htmlContent, baseName);
          setProgress(100);
          setResultFiles([
            {
              name: res.filename,
              bytes: res.bytes,
            },
          ]);
          break;
        }

        // 21. JPG TO PDF
        case 'jpg-to-pdf': {
          setProgress(60);
          setProcessingStatus('Compiling images into PDF document...');
          const compiledPdf = await imagesToPdf(selectedFiles);
          setProgress(100);
          setResultFiles([
            {
              name: `Images_Converted.pdf`,
              bytes: compiledPdf,
            },
          ]);
          break;
        }

        // 22. PDF TO JPG
        case 'pdf-to-jpg': {
          setProgress(30);
          setProcessingStatus('Rendering pages to high-resolution JPEG images...');
          const images = await pdfToImages(primaryBuf, 1.5, (cur, tot) => {
            setProgress(Math.round(30 + (cur / tot) * 60));
          });
          setProgress(100);
          setResultFiles(
            images.map((img) => ({
              name: `${baseName} - Page ${img.pageNumber}.jpg`,
              bytes: img.blob,
            }))
          );
          break;
        }

        // 23. LOCAL DOCUMENT SUMMARIZER
        case 'ai-summarizer': {
          const sumRes = await summarizePdfDocument(primaryBuf, baseName, (pct, msg) => {
            setProgress(pct);
            setProcessingStatus(msg);
          });
          setAiSummary(sumRes);
          setProgress(100);
          break;
        }

        // 24. TRANSLATE PDF (25-Language Matrix & Strict Honesty)
        case 'translate-pdf': {
          const transRes = await translatePdfDocument(primaryBuf, targetLang, (pct, msg) => {
            setProgress(pct);
            setProcessingStatus(msg);
          });
          setTranslationResult(transRes);
          setProgress(100);
          break;
        }

        // 25. PDF TO MARKDOWN
        case 'pdf-to-markdown': {
          const mdRes = await convertPdfToMarkdown(primaryBuf, baseName, (pct, msg) => {
            setProgress(pct);
            setProcessingStatus(msg);
          });
          setAiMarkdown(mdRes);
          setProgress(100);
          setResultFiles([
            {
              name: mdRes.filename,
              bytes: mdRes.bytes,
            },
          ]);
          break;
        }

        default: {
          throw new Error(`Tool '${tool.id}' does not have a registered processor.`);
        }
      }
    } catch (err: any) {
      console.error('Processing error:', err);
      alert(`Operation failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedLangObj = SUPPORTED_LANGUAGES_MATRIX.find((l) => l.code === targetLang);

  return (
    <ToolLayout tool={tool}>
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Responsive Non-Intrusive Top Sponsor Slot */}
        <AdSlot placement="banner" className="mb-2" />

        {/* Step 1: File Dropzone (if no files chosen) */}
        {selectedFiles.length === 0 ? (
          <PdfDropzone
            multiple={tool.id === 'merge-pdf' || tool.id === 'jpg-to-pdf'}
            accept={tool.supportedInputTypes.join(',')}
            title={`Select or drop ${tool.supportedInputTypes.includes('.pdf') ? 'PDF document' : 'files'}`}
            subtitle={`Choose files from your device to begin ${tool.name.toLowerCase()}`}
            onFilesSelected={handleFilesSelected}
          />
        ) : (
          /* Step 2: Settings & Working Workspace */
          <div className="space-y-6">
            {/* Selected File Header Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                  <FileText size={20} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} files selected`}
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5">
                    {totalPages > 0 ? `${totalPages} pages • ` : ''}
                    {(selectedFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2)} MB total
                  </p>
                </div>
              </div>

              <button
                onClick={handleReset}
                className="text-xs font-semibold text-slate-600 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-xl transition-colors"
              >
                Change Files
              </button>
            </div>

            {/* Honest Technical Notice Banner */}
            {toolDef?.limitations && (
              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
                <Info size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Technical Notice: </span>
                  {toolDef.limitations}
                </div>
              </div>
            )}

            {/* Tool-Specific Controls */}
            {/* A. MERGE PDF File Reordering List */}
            {tool.id === 'merge-pdf' && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Arrange Merge Order</h4>
                  <span className="text-xs text-slate-500">{selectedFiles.length} documents</span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs font-medium"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                          {idx + 1}
                        </span>
                        <span className="truncate text-slate-800 dark:text-slate-200 font-semibold">{file.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          disabled={idx === 0}
                          onClick={() => {
                            const newFiles = [...selectedFiles];
                            const newBufs = [...fileBuffers];
                            [newFiles[idx - 1], newFiles[idx]] = [newFiles[idx], newFiles[idx - 1]];
                            [newBufs[idx - 1], newBufs[idx]] = [newBufs[idx], newBufs[idx - 1]];
                            setSelectedFiles(newFiles);
                            setFileBuffers(newBufs);
                          }}
                          className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                        >
                          <MoveUp size={14} />
                        </button>
                        <button
                          disabled={idx === selectedFiles.length - 1}
                          onClick={() => {
                            const newFiles = [...selectedFiles];
                            const newBufs = [...fileBuffers];
                            [newFiles[idx + 1], newFiles[idx]] = [newFiles[idx], newFiles[idx + 1]];
                            [newBufs[idx + 1], newBufs[idx]] = [newBufs[idx], newBufs[idx + 1]];
                            setSelectedFiles(newFiles);
                            setFileBuffers(newBufs);
                          }}
                          className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                        >
                          <MoveDown size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* B. SPLIT PDF Mode Selector */}
            {tool.id === 'split-pdf' && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setSplitMode('ranges')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      splitMode === 'ranges'
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Custom Ranges
                  </button>
                  <button
                    onClick={() => setSplitMode('every-n')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      splitMode === 'every-n'
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Every N Pages
                  </button>
                </div>

                {splitMode === 'ranges' ? (
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Page Ranges (Comma-separated)
                    </label>
                    <input
                      type="text"
                      value={rangeInput}
                      onChange={(e) => setRangeInput(e.target.value)}
                      placeholder="e.g. 1-5, 6-10, 15"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Total pages in document: {totalPages}
                    </span>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Chunk Size (Pages per file)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={totalPages || 100}
                      value={everyN}
                      onChange={(e) => setEveryN(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-32 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold"
                    />
                  </div>
                )}
              </div>
            )}

            {/* C. PAGE SELECTION (Remove / Extract Pages) */}
            {(tool.id === 'remove-pages' || tool.id === 'extract-pages' || tool.id === 'organize-pdf') && fileBuffers[0] && totalPages > 0 && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {tool.id === 'remove-pages'
                      ? 'Click pages to remove'
                      : tool.id === 'extract-pages'
                      ? 'Click pages to extract'
                      : 'Preview & Reorder Pages'}
                  </h4>
                  <span className="text-xs font-semibold text-slate-500">
                    {selectedPageNumbers.length} of {totalPages} pages selected
                  </span>
                </div>

                <PdfThumbnailGrid
                  fileBuffer={fileBuffers[0]}
                  totalPages={totalPages}
                  selectedPages={selectedPageNumbers}
                  onTogglePage={(num: number) => {
                    setSelectedPageNumbers((prev) =>
                      prev.includes(num) ? prev.filter((p) => p !== num) : [...prev, num].sort((a, b) => a - b)
                    );
                  }}
                  actionType="select"
                />
              </div>
            )}

            {/* D. ROTATE CONTROLS */}
            {tool.id === 'rotate-pdf' && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Rotation Angle</label>
                <div className="flex gap-3">
                  {[
                    { angle: 90, label: '90° Clockwise' },
                    { angle: 180, label: '180° Flip' },
                    { angle: 270, label: '270° Counter-Clockwise' },
                  ].map((btn) => (
                    <button
                      key={btn.angle}
                      onClick={() => setRotateAngle(btn.angle)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        rotateAngle === btn.angle
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* E. WATERMARK CONTROLS */}
            {tool.id === 'add-watermark' && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">Watermark Text</label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Opacity ({Math.round(watermarkOpacity * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.9"
                    step="0.05"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* F. COMPRESS PDF Level */}
            {tool.id === 'compress-pdf' && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Compression Preset</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'low', label: 'Gentle', desc: 'Preserves max DPI, compacts streams' },
                    { id: 'balanced', label: 'Balanced (Standard)', desc: 'Optimizes object tables & streams' },
                    { id: 'strong', label: 'High Compaction', desc: 'Maximum object stream compaction' },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      onClick={() => setCompressLevel(lvl.id as any)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        compressLevel === lvl.id
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="font-bold text-xs block">{lvl.label}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">{lvl.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* G. OCR LANGUAGE PICKER */}
            {tool.id === 'ocr-pdf' && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">OCR Recognition Language</label>
                <div className="flex gap-3">
                  {[
                    { id: 'eng', label: 'English' },
                    { id: 'amh', label: 'Amharic (አማርኛ)' },
                  ].map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setOcrLanguage(l.id as any)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        ocrLanguage === l.id
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">
                  Preserves the complete OCR transcript as UTF-8 without silently removing Ethiopic/Amharic characters.
                </p>
              </div>
            )}

            {/* H. PDF FORMS Interactive Field List */}
            {tool.id === 'pdf-forms' && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Interactive AcroForm Fields</h4>
                  <span className="text-xs text-slate-500">
                    {formFields ? `${formFields.length} fields detected` : 'Scanning...'}
                  </span>
                </div>

                {hasScannedFormNotice ? (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                    <p className="font-bold">This document contains no interactive AcroForm fields.</p>
                    <p className="text-slate-600 dark:text-slate-400">
                      Standard visual form lines in scanned or flattened PDFs do not contain digital form widgets.
                    </p>
                  </div>
                ) : formFields && formFields.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {formFields.map((f, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                        <label className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                          {f.name} <span className="font-normal text-slate-400">({f.type})</span>
                        </label>
                        {f.type === 'checkbox' ? (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(formValues[f.name])}
                              onChange={(e) => setFormValues({ ...formValues, [f.name]: e.target.checked })}
                              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
                            />
                            <span className="text-xs text-slate-700 dark:text-slate-300">Checked</span>
                          </label>
                        ) : (
                          <input
                            type="text"
                            value={String(formValues[f.name] || '')}
                            onChange={(e) => setFormValues({ ...formValues, [f.name]: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Scanning document for AcroForm fields...</p>
                )}
              </div>
            )}

            {/* I. TRANSLATE PDF: 25-Language Selector & Strict Support Indicators */}
            {tool.id === 'translate-pdf' && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Target Language (25 Languages Matrix)
                </label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500"
                >
                  {SUPPORTED_LANGUAGES_MATRIX.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} — {lang.nativeName} {lang.isLocallySupported ? '✓ (Locally Supported)' : '• (Requires External Provider)'}
                    </option>
                  ))}
                </select>

                {selectedLangObj?.isLocallySupported ? (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Locally supported via document vocabulary glossary & phrase transformation.</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                    <Info size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Requires External Provider: The local engine does not have a verified translation model for {selectedLangObj?.name}. To avoid generating fake translations, this language will return a clear availability notice.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Main Action Process Button */}
            {!resultFiles && !aiSummary && !aiMarkdown && !translationResult && !excelResult && (
              <div className="pt-2">
                <button
                  disabled={Boolean(getDisabledReason()) || isProcessing}
                  onClick={handleProcessTool}
                  className={`w-full py-4 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                    getDisabledReason() || isProcessing
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                      : 'bg-brand-600 hover:bg-brand-700 text-white hover:scale-[1.01]'
                  }`}
                >
                  {isProcessing ? 'Processing Document...' : `${tool.name} →`}
                </button>
                {getDisabledReason() && (
                  <p className="text-xs text-center text-slate-600 dark:text-slate-400 font-medium mt-2">
                    {getDisabledReason()}
                  </p>
                )}
              </div>
            )}

            {/* Progress Display */}
            {isProcessing && (
              <ProcessingProgress
                progress={progress}
                statusText={processingStatus || 'Analyzing document stream...'}
              />
            )}

            {/* ----------------- RESULT VIEWS ----------------- */}

            {/* 1. PDF TO EXCEL DEDICATED RESULT CARD WITH LIVE TABLE PREVIEW */}
            {excelResult && (excelResult.isScannedOnly || !excelResult.canDownload || !excelResult.bytes) && (
              <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/60 shadow-xl space-y-6 text-left animate-in fade-in duration-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <AlertTriangle size={26} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Scanned / Image-Only Document Detected
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {excelResult.message || 'This document contains zero selectable text across all pages. A blank spreadsheet was not generated.'}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                  <div className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                    <span>💡 Recommendation</span>
                  </div>
                  <p>
                    Because this document consists of image scans rather than native digital text, optical character recognition is required to extract rows and columns.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href="/tools/ocr-pdf"
                    className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md shadow-brand-600/20"
                  >
                    <span>Run OCR PDF on This File</span>
                    <ArrowRight size={14} />
                  </Link>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold"
                  >
                    ← Select another PDF
                  </button>
                </div>
              </div>
            )}

            {excelResult && excelResult.canDownload && excelResult.bytes && (
              <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 shadow-xl space-y-6 text-left animate-in fade-in duration-200">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <FileSpreadsheet size={22} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{excelResult.filename}</h3>
                      <span className="text-xs text-slate-500 font-medium">
                        {((excelResult.bytes?.byteLength || 0) / 1024).toFixed(1)} KB • Open XML Workbook (.xlsx)
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => excelResult.bytes && downloadFile(excelResult.bytes, excelResult.filename)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md shadow-emerald-600/20"
                  >
                    <Download size={15} />
                    <span>Download .xlsx Workbook</span>
                  </button>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Pages Processed</span>
                    <span className="text-base font-bold text-slate-800 dark:text-slate-100">{excelResult.pagesProcessed}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Worksheets</span>
                    <span className="text-base font-bold text-slate-800 dark:text-slate-100">{excelResult.sheetCount}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Rows Detected</span>
                    <span className="text-base font-bold text-slate-800 dark:text-slate-100">{excelResult.rowCount}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Grid Confidence</span>
                    <span className="text-base font-bold text-slate-800 dark:text-slate-100">{excelResult.confidence}%</span>
                  </div>
                </div>

                {/* Structure Confidence Badge */}
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      excelResult.isTableStructured
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {excelResult.isTableStructured ? '✓ Structured Table Grid Inferred' : '• Narrative Text Layout Preserved'}
                  </span>
                </div>

                {/* Warnings if any */}
                {excelResult.warnings && excelResult.warnings.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                    {excelResult.warnings.map((w, idx) => (
                      <p key={idx}>• {w}</p>
                    ))}
                  </div>
                )}

                {/* Interactive Table Preview */}
                {excelResult.previewRows && excelResult.previewRows.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Worksheet Table Preview (First {excelResult.previewRows.length} rows)
                    </h4>
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto max-h-64">
                      <table className="w-full text-xs text-left border-collapse">
                        <tbody>
                          {excelResult.previewRows.map((row, rIdx) => (
                            <tr
                              key={rIdx}
                              className={
                                rIdx === 0
                                  ? 'bg-slate-100 dark:bg-slate-800 font-bold border-b border-slate-200 dark:border-slate-700'
                                  : rIdx % 2 === 0
                                  ? 'bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/60'
                                  : 'bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60'
                              }
                            >
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-2.5 border-r border-slate-200/60 dark:border-slate-700/60 truncate max-w-xs">
                                  {cell || <span className="text-slate-300 dark:text-slate-600">—</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-between items-center">
                  <button onClick={handleReset} className="text-xs font-semibold text-slate-500 hover:text-emerald-600">
                    ← Convert another document
                  </button>
                  <button
                    onClick={() => excelResult.bytes && downloadFile(excelResult.bytes, excelResult.filename)}
                    className="text-xs font-bold text-emerald-600 hover:underline inline-flex items-center gap-1"
                  >
                    <Download size={13} />
                    <span>Download {excelResult.filename}</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2. REPAIR PDF DIAGNOSTIC CARD */}
            {repairDiagnostic && (
              <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 text-left animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      repairDiagnostic.status === 'Healthy' || repairDiagnostic.status === 'Repaired'
                        ? 'bg-emerald-50 text-emerald-600'
                        : repairDiagnostic.status === 'Partially Recovered'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    <Wrench size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Diagnostic Result: {repairDiagnostic.status}
                    </h3>
                    <span className="text-xs text-slate-500">
                      {repairDiagnostic.recoveredPages} page(s) recovered • {repairDiagnostic.failedPages} failed
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-2 text-xs font-mono text-slate-700 dark:text-slate-300">
                  <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Parser Diagnostics</h4>
                  {repairDiagnostic.diagnostics.map((d, i) => (
                    <p key={i}>• {d}</p>
                  ))}
                </div>

                <button onClick={handleReset} className="text-xs font-semibold text-slate-500 hover:text-brand-600">
                  Analyze another file
                </button>
              </div>
            )}

            {/* 3. OCR RESULT CARD WITH UTF-8 TRANSCRIPT EXPORT */}
            {ocrResult && (
              <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 shadow-xl space-y-4 text-left animate-in fade-in duration-200">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Searchable PDF & Transcript Ready</h3>
                    <span className="text-xs text-slate-500">
                      {ocrResult.totalPages} pages processed • {ocrResult.recognizedCharCount} characters recognized
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        downloadFile(new TextEncoder().encode(ocrResult.transcriptText), ocrResult.transcriptFilename)
                      }
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold text-xs inline-flex items-center gap-1.5"
                    >
                      <Download size={14} />
                      <span>Download Transcript (.txt)</span>
                    </button>
                    <button
                      onClick={() => downloadFile(ocrResult.bytes, ocrResult.filename)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <Download size={14} />
                      <span>Download Searchable PDF</span>
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 italic">{ocrResult.disclaimer}</p>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 max-h-48 overflow-y-auto font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                  {ocrResult.transcriptText.slice(0, 1200)}...
                </div>
              </div>
            )}

            {/* 4. GENERIC RESULT PANEL FOR BINARY FILES */}
            {resultFiles && !excelResult && !ocrResult && (
              <ResultPanel
                files={resultFiles}
                originalSize={accurateCompressStats?.originalSize}
                newSize={accurateCompressStats?.newSize}
                onReset={handleReset}
              />
            )}

            {/* 5. LOCAL DOCUMENT SUMMARIZER RESULT VIEW WITH .MD AND .TXT EXPORTS */}
            {aiSummary && (
              <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 shadow-xl space-y-6 animate-in fade-in duration-200 text-left">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">Structured Document Overview</h3>
                      <span className="text-[11px] text-slate-500 font-medium">{aiSummary.engineLabel}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const mdContent = formatSummaryAsMarkdown(aiSummary, selectedFiles[0]?.name || 'Document');
                        downloadFile(new TextEncoder().encode(mdContent), `${selectedFiles[0]?.name || 'Document'} - Summary.md`);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold text-xs inline-flex items-center gap-1 hover:bg-indigo-100"
                    >
                      <Download size={13} />
                      <span>Download .md</span>
                    </button>
                    <button
                      onClick={() => {
                        const txtContent = formatSummaryAsPlainText(aiSummary, selectedFiles[0]?.name || 'Document');
                        downloadFile(new TextEncoder().encode(txtContent), `${selectedFiles[0]?.name || 'Document'} - Summary.txt`);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs inline-flex items-center gap-1 hover:bg-slate-200"
                    >
                      <Download size={13} />
                      <span>Download .txt</span>
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(aiSummary.summary, null, 2));
                        alert('Copied summary to clipboard!');
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Copy size={13} />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Executive Overview</h4>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{aiSummary.summary.overview}</p>
                  </div>

                  {aiSummary.summary.keyPoints && aiSummary.summary.keyPoints.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Key Takeaways</h4>
                      <ul className="space-y-1.5">
                        {aiSummary.summary.keyPoints.map((pt, idx) => (
                          <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <button onClick={handleReset} className="text-xs font-semibold text-slate-500 hover:text-indigo-600">
                  Analyze another document
                </button>
              </div>
            )}

            {/* 6. TRANSLATION RESULT VIEW */}
            {translationResult && (
              <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 shadow-xl space-y-4 text-left animate-in fade-in duration-200">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Document Translation ({translationResult.targetLang})
                    </h3>
                    <span className="text-xs text-slate-500">{translationResult.engineLabel}</span>
                  </div>
                  {translationResult.isSupported && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          downloadFile(
                            new TextEncoder().encode(translationResult.translatedText),
                            `${selectedFiles[0]?.name || 'Document'} - Translated.txt`
                          );
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold text-xs inline-flex items-center gap-1.5"
                      >
                        <Download size={13} />
                        <span>Download .txt</span>
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(translationResult.translatedText);
                          alert('Translation copied to clipboard!');
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1"
                      >
                        <Copy size={13} />
                        <span>Copy</span>
                      </button>
                    </div>
                  )}
                </div>

                {translationResult.isSupported ? (
                  <textarea
                    readOnly
                    value={translationResult.translatedText}
                    rows={12}
                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 resize-y"
                  />
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                    <p className="font-bold">Notice: Translation Unavailable Locally</p>
                    <p>{translationResult.unsupportedMessage}</p>
                  </div>
                )}

                <button onClick={handleReset} className="text-xs font-semibold text-slate-500 hover:text-indigo-600">
                  Translate another document
                </button>
              </div>
            )}

            {/* Responsive Bottom Sponsor Slot */}
            <AdSlot placement="banner" className="mt-6" />
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
