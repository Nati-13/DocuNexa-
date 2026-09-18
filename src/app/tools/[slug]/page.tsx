'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, notFound } from 'next/navigation';
import { 
  ALL_TOOLS, 
  getToolBySlug 
} from '@/config/tools';
import { ToolLayout } from '@/components/tools/ToolLayout';
import { PdfDropzone } from '@/components/common/PdfDropzone';
import { ProcessingProgress } from '@/components/common/ProcessingProgress';
import { ResultPanel, ResultFileItem } from '@/components/common/ResultPanel';
import { PdfThumbnailGrid } from '@/components/common/PdfThumbnailGrid';
import { getPdfJs } from '@/lib/pdfReader';
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
  CheckSquare
} from 'lucide-react';

import { ProtectPdfTool } from '@/components/tools/ProtectPdfTool';
import { UnlockPdfTool } from '@/components/tools/UnlockPdfTool';
import { SignPdfTool } from '@/components/tools/SignPdfTool';
import { RedactPdfTool } from '@/components/tools/RedactPdfTool';
import { ComparePdfTool } from '@/components/tools/ComparePdfTool';
import { CropPdfTool } from '@/components/tools/CropPdfTool';

// Modular Services
import { convertPdfToExcel } from '@/lib/tools/pdfToExcel';
import { convertPdfToWord } from '@/lib/tools/pdfToWord';
import { convertPdfToPowerPoint } from '@/lib/tools/pdfToPowerPoint';
import { preparePdfA } from '@/lib/tools/pdfToPdfA';
import { repairPdf, RepairPdfResult } from '@/lib/tools/repairPdf';
import { performPdfOcr } from '@/lib/tools/ocrPdf';
import { performPdfCompression, CompressResult } from '@/lib/tools/compressPdf';
import { detectPdfFormFields, fillPdfForm, FormFieldInfo } from '@/lib/tools/pdfForms';
import { 
  convertExcelToPdf, 
  convertWordToPdf, 
  convertPowerPointToPdf, 
  convertHtmlToPdf 
} from '@/lib/tools/officeToPdf';
import { summarizePdfDocument, ChunkedSummaryResult } from '@/lib/tools/aiSummarizer';
import { translatePdfDocument, TranslationResult } from '@/lib/tools/translatePdf';
import { convertPdfToMarkdown, MarkdownResult } from '@/lib/tools/pdfToMarkdown';
import { getToolDefinition } from '@/lib/tools/toolRegistry';

export default function UniversalToolPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const tool = getToolBySlug(slug);

  if (!tool) {
    notFound();
  }

  // Delegate to dedicated security and layout components
  if (tool.id === 'protect-pdf') {
    return (
      <ToolLayout tool={tool}>
        <div className="max-w-4xl mx-auto">
          <ProtectPdfTool />
        </div>
      </ToolLayout>
    );
  }

  if (tool.id === 'unlock-pdf') {
    return (
      <ToolLayout tool={tool}>
        <div className="max-w-4xl mx-auto">
          <UnlockPdfTool />
        </div>
      </ToolLayout>
    );
  }

  if (tool.id === 'sign-pdf') {
    return (
      <ToolLayout tool={tool}>
        <div className="max-w-4xl mx-auto">
          <SignPdfTool />
        </div>
      </ToolLayout>
    );
  }

  if (tool.id === 'redact-pdf') {
    return (
      <ToolLayout tool={tool}>
        <div className="max-w-4xl mx-auto">
          <RedactPdfTool />
        </div>
      </ToolLayout>
    );
  }

  if (tool.id === 'compare-pdf') {
    return (
      <ToolLayout tool={tool}>
        <div className="max-w-4xl mx-auto">
          <ComparePdfTool />
        </div>
      </ToolLayout>
    );
  }

  if (tool.id === 'crop-pdf') {
    return (
      <ToolLayout tool={tool}>
        <div className="max-w-4xl mx-auto">
          <CropPdfTool />
        </div>
      </ToolLayout>
    );
  }

  // Common State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileBuffers, setFileBuffers] = useState<ArrayBuffer[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [resultFiles, setResultFiles] = useState<ResultFileItem[] | null>(null);

  // Tool Specific Configuration States
  // 1. Split PDF
  const [splitMode, setSplitMode] = useState<'ranges' | 'every-n'>('ranges');
  const [rangeInput, setRangeInput] = useState<string>('1-5, 6-10');
  const [everyN, setEveryN] = useState<number>(2);

  // 2. Page Selection (Remove / Extract)
  const [selectedPageNumbers, setSelectedPageNumbers] = useState<number[]>([]);

  // 3. Rotate PDF
  const [rotateAngle, setRotateAngle] = useState<number>(90);

  // 4. Page Numbers
  const [numberPosition, setNumberPosition] = useState<'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-center'>('bottom-center');
  const [numberFormat, setNumberFormat] = useState<'number' | 'page-of-total'>('page-of-total');
  const [startNumber, setStartNumber] = useState<number>(1);

  // 5. Watermark
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.3);
  const [watermarkRotation, setWatermarkRotation] = useState<number>(45);

  // 6. Compress Level & Accurate Metrics
  const [compressLevel, setCompressLevel] = useState<'low' | 'balanced' | 'strong'>('balanced');
  const [accurateCompressStats, setAccurateCompressStats] = useState<CompressResult | null>(null);

  // 7. OCR Options
  const [ocrLanguage, setOcrLanguage] = useState<'eng' | 'amh'>('eng');

  // 8. PDF Forms
  const [formFields, setFormFields] = useState<FormFieldInfo[] | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string | boolean>>({});
  const [hasScannedFormNotice, setHasScannedFormNotice] = useState<boolean>(false);

  // 9. Repair Diagnostics
  const [repairDiagnostic, setRepairDiagnostic] = useState<RepairPdfResult | null>(null);

  // 10. Document Intelligence Results
  const [aiSummary, setAiSummary] = useState<ChunkedSummaryResult | null>(null);
  const [aiMarkdown, setAiMarkdown] = useState<MarkdownResult | null>(null);
  const [targetLang, setTargetLang] = useState<string>('Amharic');
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);

  const toolDef = getToolDefinition(tool.id);

  // Handle file drop / selection
  const handleFilesSelected = async (files: File[]) => {
    setSelectedFiles(files);
    setResultFiles(null);
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
        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(buffers[0].slice(0)),
          disableWorker: typeof window === 'undefined',
        });
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
    if (fileBuffers.length === 0 && tool.id !== 'scan-to-pdf') return;

    setIsProcessing(true);
    setProgress(15);
    setProcessingStatus('Starting process...');

    try {
      const primaryBuf = fileBuffers[0];
      const primaryFile = selectedFiles[0];
      const baseName = primaryFile?.name.replace(/\.[^/.]+$/, '') || 'Document';

      switch (tool.id) {
        // 1. MERGE PDF
        case 'merge-pdf': {
          setProgress(50);
          setProcessingStatus('Merging documents losslessly...');
          const mergedBytes = await mergePdfs(fileBuffers);
          setProgress(100);
          setResultFiles([
            {
              name: `Merged_Document (${fileBuffers.length} files).pdf`,
              bytes: mergedBytes,
            },
          ]);
          break;
        }

        // 2. SPLIT PDF
        case 'split-pdf': {
          setProgress(40);
          let splitResults: { name: string; bytes: Uint8Array }[] = [];
          if (splitMode === 'ranges') {
            const rawRanges = rangeInput.split(',').map((s) => s.trim());
            const parsedRanges: { start: number; end: number; name: string }[] = [];
            rawRanges.forEach((r, idx) => {
              const [startStr, endStr] = r.split('-').map((s) => parseInt(s.trim(), 10));
              if (!isNaN(startStr)) {
                const start = startStr;
                const end = isNaN(endStr) ? start : endStr;
                parsedRanges.push({
                  start,
                  end,
                  name: `${baseName} - Part ${idx + 1} (pp.${start}-${end}).pdf`,
                });
              }
            });
            splitResults = await splitPdfByRanges(primaryBuf, parsedRanges);
          } else {
            splitResults = await splitPdfEveryNPages(primaryBuf, everyN, baseName);
          }
          setProgress(100);
          setResultFiles(splitResults);
          break;
        }

        // 3. REMOVE PAGES
        case 'remove-pages': {
          setProgress(50);
          setProcessingStatus('Removing selected pages...');
          const cleanedBytes = await removePdfPages(primaryBuf, selectedPageNumbers);
          setProgress(100);
          setResultFiles([
            {
              name: `${baseName} - (Pages removed).pdf`,
              bytes: cleanedBytes,
            },
          ]);
          break;
        }

        // 4. EXTRACT PAGES
        case 'extract-pages': {
          setProgress(50);
          setProcessingStatus('Extracting selected pages...');
          const extractedBytes = await extractPdfPages(primaryBuf, selectedPageNumbers);
          setProgress(100);
          setResultFiles([
            {
              name: `${baseName} - (Extracted pages).pdf`,
              bytes: extractedBytes,
            },
          ]);
          break;
        }

        // 5. ROTATE PDF
        case 'rotate-pdf': {
          setProgress(50);
          setProcessingStatus(`Rotating pages by ${rotateAngle}°...`);
          const rotatedBytes = await rotatePdf(primaryBuf, rotateAngle);
          setProgress(100);
          setResultFiles([
            {
              name: `${baseName} - Rotated ${rotateAngle}deg.pdf`,
              bytes: rotatedBytes,
            },
          ]);
          break;
        }

        // 6. ADD PAGE NUMBERS
        case 'add-page-numbers': {
          setProgress(50);
          setProcessingStatus('Adding page numbers...');
          const numberedBytes = await addPageNumbersToPdf(primaryBuf, {
            position: numberPosition,
            format: numberFormat,
            startNumber,
            fontSize: 10,
          });
          setProgress(100);
          setResultFiles([
            {
              name: `${baseName} - Numbered.pdf`,
              bytes: numberedBytes,
            },
          ]);
          break;
        }

        // 7. ADD WATERMARK
        case 'add-watermark': {
          setProgress(50);
          setProcessingStatus('Embedding vector watermark...');
          const watermarkedBytes = await addWatermarkToPdf(primaryBuf, {
            text: watermarkText || 'CONFIDENTIAL',
            opacity: watermarkOpacity,
            rotation: watermarkRotation,
            fontSize: 44,
          });
          setProgress(100);
          setResultFiles([
            {
              name: `${baseName} - Watermarked.pdf`,
              bytes: watermarkedBytes,
            },
          ]);
          break;
        }

        // 8. COMPRESS PDF (Accurate & Unfabricated)
        case 'compress-pdf': {
          setProgress(50);
          setProcessingStatus('Compacting streams and object tables...');
          const res = await performPdfCompression(primaryBuf, baseName, compressLevel);
          setProgress(100);
          setAccurateCompressStats(res);
          setResultFiles([
            {
              name: res.filename,
              bytes: res.bytes,
            },
          ]);
          break;
        }

        // 9. REPAIR PDF (Conservative diagnostics)
        case 'repair-pdf': {
          const res = await repairPdf(primaryBuf, baseName, (pct, msg) => {
            setProgress(pct);
            setProcessingStatus(msg);
          });
          setRepairDiagnostic(res);
          if (res.bytes) {
            setResultFiles([
              {
                name: res.filename,
                bytes: res.bytes,
              },
            ]);
          }
          break;
        }

        // 10. OCR PDF (Lazy-loaded WebAssembly & Searchable PDF)
        case 'ocr-pdf': {
          const ocrRes = await performPdfOcr(primaryBuf, baseName, ocrLanguage, (pct, msg) => {
            setProgress(pct);
            setProcessingStatus(msg);
          });
          setProgress(100);
          setResultFiles([
            {
              name: ocrRes.filename,
              bytes: ocrRes.bytes,
            },
          ]);
          break;
        }

        // 11. PDF TO EXCEL (Real SheetJS XLSX)
        case 'pdf-to-excel': {
          const excelRes = await convertPdfToExcel(primaryBuf, baseName, (pct, msg) => {
            setProgress(pct);
            setProcessingStatus(msg);
          });
          setProgress(100);
          setResultFiles([
            {
              name: excelRes.filename,
              bytes: excelRes.bytes,
            },
          ]);
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

        // 13. PDF TO POWERPOINT (Genuine .pptx Presentation)
        case 'pdf-to-powerpoint': {
          const pptxRes = await convertPdfToPowerPoint(primaryBuf, baseName, (pct, msg) => {
            setProgress(pct);
            setProcessingStatus(msg);
          });
          setProgress(100);
          setResultFiles([
            {
              name: pptxRes.filename,
              bytes: pptxRes.bytes,
            },
          ]);
          break;
        }

        // 14. PDF TO PDF/A (Experimental Metadata Preparation)
        case 'pdf-to-pdfa': {
          setProgress(60);
          setProcessingStatus('Injecting ISO 19005-1 (PDF/A-1b) metadata packet...');
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

        // 15. PDF FORMS
        case 'pdf-forms': {
          setProgress(50);
          setProcessingStatus('Applying form values and updating fields...');
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

        // 16. WORD TO PDF
        case 'word-to-pdf': {
          setProgress(50);
          setProcessingStatus('Reconstructing document from .docx manuscript...');
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

        // 17. EXCEL TO PDF
        case 'excel-to-pdf': {
          setProgress(50);
          setProcessingStatus('Rendering spreadsheet data into printable PDF tables...');
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

        // 18. POWERPOINT TO PDF
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

        // 19. HTML TO PDF
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

        // 20. JPG TO PDF
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

        // 21. PDF TO JPG
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

        // 22. AI SUMMARIZER (Progressive Chunking)
        case 'ai-summarizer': {
          const sumRes = await summarizePdfDocument(primaryBuf, baseName, (pct, msg) => {
            setProgress(pct);
            setProcessingStatus(msg);
          });
          setAiSummary(sumRes);
          setProgress(100);
          break;
        }

        // 23. TRANSLATE PDF (Basic Local Translation)
        case 'translate-pdf': {
          const transRes = await translatePdfDocument(primaryBuf, targetLang, (pct, msg) => {
            setProgress(pct);
            setProcessingStatus(msg);
          });
          setTranslationResult(transRes);
          setProgress(100);
          break;
        }

        // 24. PDF TO MARKDOWN
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

        // NO GENERIC FALLBACK: Throw error if tool is unconfigured
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

  return (
    <ToolLayout tool={tool}>
      <div className="space-y-8 max-w-4xl mx-auto">
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
            {/* Selected File(s) Header Card */}
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

            {/* Honest Technical Limitation Disclosure Banner */}
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
                  <label className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer">
                    + Add More PDFs
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          handleFilesSelected([...selectedFiles, ...Array.from(e.target.files)]);
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {file.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          disabled={idx === 0}
                          onClick={() => {
                            const copy = [...selectedFiles];
                            const t = copy[idx];
                            copy[idx] = copy[idx - 1];
                            copy[idx - 1] = t;
                            handleFilesSelected(copy);
                          }}
                          className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                        >
                          <MoveUp size={14} />
                        </button>
                        <button
                          disabled={idx === selectedFiles.length - 1}
                          onClick={() => {
                            const copy = [...selectedFiles];
                            const t = copy[idx];
                            copy[idx] = copy[idx + 1];
                            copy[idx + 1] = t;
                            handleFilesSelected(copy);
                          }}
                          className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                        >
                          <MoveDown size={14} />
                        </button>
                        <button
                          onClick={() => {
                            const copy = selectedFiles.filter((_, i) => i !== idx);
                            handleFilesSelected(copy);
                          }}
                          className="p-1 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* B. SPLIT PDF Range Controls */}
            {tool.id === 'split-pdf' && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setSplitMode('ranges')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      splitMode === 'ranges'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Custom Ranges
                  </button>
                  <button
                    onClick={() => setSplitMode('every-n')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      splitMode === 'every-n'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Split Every N Pages
                  </button>
                </div>

                {splitMode === 'ranges' ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Page Ranges (comma separated)
                    </label>
                    <input
                      type="text"
                      value={rangeInput}
                      onChange={(e) => setRangeInput(e.target.value)}
                      placeholder="e.g. 1-5, 6-10, 11-15"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-rose-500"
                    />
                    <p className="text-[11px] text-slate-500">Extracts discrete PDF documents matching your custom page groups.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Pages Per Document Chunk
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={totalPages || 100}
                      value={everyN}
                      onChange={(e) => setEveryN(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-32 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-rose-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* C. PAGE SELECTION GRID (Remove / Extract / Organize) */}
            {(tool.id === 'remove-pages' || tool.id === 'extract-pages' || tool.id === 'organize-pdf') && fileBuffers[0] && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {tool.id === 'remove-pages'
                      ? 'Click pages to mark for deletion'
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
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* E. ADD WATERMARK */}
            {tool.id === 'add-watermark' && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 sm:col-span-3">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Watermark Text</label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="e.g. CONFIDENTIAL, DRAFT, DO NOT COPY"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-brand-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Opacity ({Math.round(watermarkOpacity * 100)}%)</label>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Angle ({watermarkRotation}°)</label>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="15"
                    value={watermarkRotation}
                    onChange={(e) => setWatermarkRotation(parseInt(e.target.value, 10))}
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
                    { id: 'strong', label: 'High Compaction', desc: 'Maximum object stream deduction' },
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
                  Tesseract.js WebAssembly worker initializes in browser memory when you click process.
                </p>
              </div>
            )}

            {/* H. PDF FORMS INTERACTIVE EDITOR */}
            {tool.id === 'pdf-forms' && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <CheckSquare size={16} className="text-purple-600" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Detected Interactive Form Fields</h4>
                </div>

                {hasScannedFormNotice ? (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
                    This document contains no interactive AcroForm fields. It may be a scanned or flattened document.
                  </div>
                ) : formFields && formFields.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {formFields.map((f, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300 block">{f.name}</label>
                        {f.type === 'checkbox' ? (
                          <label className="flex items-center gap-2 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={Boolean(formValues[f.name])}
                              onChange={(e) => setFormValues({ ...formValues, [f.name]: e.target.checked })}
                              className="w-4 h-4 rounded text-brand-600"
                            />
                            <span>{Boolean(formValues[f.name]) ? 'Checked' : 'Unchecked'}</span>
                          </label>
                        ) : f.type === 'dropdown' && f.options ? (
                          <select
                            value={String(formValues[f.name] || '')}
                            onChange={(e) => setFormValues({ ...formValues, [f.name]: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs"
                          >
                            {f.options.map((opt, oIdx) => (
                              <option key={oIdx} value={opt}>{opt}</option>
                            ))}
                          </select>
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

            {/* I. TRANSLATE PDF Target Language */}
            {tool.id === 'translate-pdf' && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Language (Basic Local Translation)</label>
                <div className="flex gap-2">
                  {['Amharic', 'Spanish', 'French', 'German'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setTargetLang(lang)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        targetLang === lang
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Main Action Process Button */}
            {!resultFiles && !aiSummary && !aiMarkdown && !translationResult && (
              <div className="text-center pt-2 space-y-2">
                <button
                  onClick={handleProcessTool}
                  disabled={isProcessing || getDisabledReason() !== null}
                  className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-bold shadow-lg transition-all ${
                    !isProcessing && getDisabledReason() === null
                      ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/25 hover:scale-[1.02] cursor-pointer'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                  }`}
                >
                  <Sparkles size={18} />
                  <span>{isProcessing ? 'Processing in Browser...' : `${tool.name}`}</span>
                </button>

                {getDisabledReason() && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {getDisabledReason()}
                  </p>
                )}
              </div>
            )}

            {/* Processing Progress Bar with Live Status */}
            <div className="space-y-2">
              <ProcessingProgress isProcessing={isProcessing} progress={progress} />
              {isProcessing && processingStatus && (
                <p className="text-xs text-center text-slate-600 dark:text-slate-300 font-medium">
                  {processingStatus}
                </p>
              )}
            </div>

            {/* Accurate Compression Stats Banner */}
            {accurateCompressStats && (
              <div className={`p-4 rounded-2xl border text-xs ${
                accurateCompressStats.isLarger
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                  : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold">{accurateCompressStats.summaryText}</span>
                  <span>{(accurateCompressStats.originalSize / 1024).toFixed(1)} KB → {(accurateCompressStats.newSize / 1024).toFixed(1)} KB</span>
                </div>
              </div>
            )}

            {/* Repair Diagnostic Card */}
            {repairDiagnostic && (
              <div className={`p-5 rounded-2xl border text-xs space-y-2 ${
                repairDiagnostic.status === 'Healthy'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : repairDiagnostic.status === 'Unrecoverable'
                  ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  : 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200'
              }`}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Wrench size={16} />
                  <span>Repair Status: {repairDiagnostic.status}</span>
                </div>
                <div className="space-y-1 text-[11px] opacity-90">
                  <p>Recovered Pages: {repairDiagnostic.recoveredPages} • Failed Pages: {repairDiagnostic.failedPages}</p>
                  <ul className="list-disc list-inside">
                    {repairDiagnostic.diagnostics.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
                {repairDiagnostic.status === 'Unrecoverable' && (
                  <p className="font-bold pt-2 text-rose-600 dark:text-rose-400">
                    This PDF could not be repaired with the available recovery methods.
                  </p>
                )}
              </div>
            )}

            {/* Result Panel for Downloadable Binary Files (XLSX, DOCX, PPTX, PDF, etc.) */}
            {resultFiles && (
              <ResultPanel
                files={resultFiles}
                originalSize={accurateCompressStats?.originalSize}
                newSize={accurateCompressStats?.newSize}
                onReset={handleReset}
              />
            )}

            {/* Local Document Summarizer Result View */}
            {aiSummary && (
              <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 shadow-xl space-y-6 animate-in fade-in duration-200 text-left">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">Structured Document Overview</h3>
                      <span className="text-[11px] text-slate-500 font-medium">{aiSummary.engineLabel}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(aiSummary.summary, null, 2));
                      alert('Copied summary to clipboard!');
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <Copy size={13} />
                    <span>Copy Summary</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Executive Overview</h4>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{aiSummary.summary.overview}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Key Takeaways</h4>
                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside">
                      {aiSummary.summary.keyPoints.map((pt, i) => (
                        <li key={i}>{pt}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Study Questions</h4>
                    <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 list-decimal list-inside">
                      {aiSummary.summary.studyQuestions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>{aiSummary.progressMessage}</span>
                  <button onClick={handleReset} className="font-semibold hover:text-indigo-600">
                    Summarize another document
                  </button>
                </div>
              </div>
            )}

            {/* Markdown Output View with Copy & Download */}
            {aiMarkdown && (
              <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 text-left animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Structured Markdown Document</h3>
                    <span className="text-[11px] text-slate-500">{aiMarkdown.wordCount} words • {aiMarkdown.totalPages} pages converted</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(aiMarkdown.markdown);
                        alert('Markdown copied to clipboard!');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-semibold text-xs inline-flex items-center gap-1.5"
                    >
                      <Copy size={13} />
                      <span>Copy Markdown</span>
                    </button>
                    <button
                      onClick={() => {
                        const blob = new Blob([aiMarkdown.markdown], { type: 'text/markdown;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = aiMarkdown.filename;
                        a.click();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-brand-600 text-white font-semibold text-xs inline-flex items-center gap-1.5"
                    >
                      <Download size={13} />
                      <span>Download .md</span>
                    </button>
                  </div>
                </div>
                <pre className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 max-h-96 overflow-y-auto whitespace-pre-wrap">
                  {aiMarkdown.markdown}
                </pre>
                <button onClick={handleReset} className="text-xs font-semibold text-slate-500 hover:text-brand-600">
                  Convert another document
                </button>
              </div>
            )}

            {/* Translation Output View */}
            {translationResult && (
              <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 shadow-xl space-y-4 text-left animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Translated Document ({translationResult.targetLang})</h3>
                    <span className="text-[11px] text-slate-500">{translationResult.engineLabel}</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(translationResult.translatedText);
                      alert('Translation copied to clipboard!');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold text-xs inline-flex items-center gap-1.5"
                  >
                    <Copy size={13} />
                    <span>Copy Text</span>
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {translationResult.translatedText}
                </div>
                <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>{translationResult.progressMessage}</span>
                  <button onClick={handleReset} className="font-semibold hover:text-indigo-600">
                    Translate another document
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
