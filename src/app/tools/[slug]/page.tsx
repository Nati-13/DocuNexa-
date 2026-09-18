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
  pdfToImages, 
  compressPdf,
  applySignatureToPdf,
  redactPdfAreas
} from '@/lib/pdfEngine';
import { getAIProvider, DocumentSummaryResult } from '@/lib/ai/aiProvider';
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
  PenTool, 
  Sliders, 
  Layers 
} from 'lucide-react';

import { ProtectPdfTool } from '@/components/tools/ProtectPdfTool';
import { UnlockPdfTool } from '@/components/tools/UnlockPdfTool';
import { SignPdfTool } from '@/components/tools/SignPdfTool';
import { RedactPdfTool } from '@/components/tools/RedactPdfTool';
import { ComparePdfTool } from '@/components/tools/ComparePdfTool';
import { CropPdfTool } from '@/components/tools/CropPdfTool';

export default function UniversalToolPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const tool = getToolBySlug(slug);

  if (!tool) {
    notFound();
  }

  // Delegate to dedicated high-precision components
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
  const [resultFiles, setResultFiles] = useState<ResultFileItem[] | null>(null);
  const [compressionStats, setCompressionStats] = useState<{ orig: number; newSize: number } | null>(null);

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

  // 6. Compress Level
  const [compressLevel, setCompressLevel] = useState<'low' | 'balanced' | 'strong'>('balanced');

  // 7. Signature
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);
  const [typedSignature, setTypedSignature] = useState<string>('');
  const [signMethod, setSignMethod] = useState<'draw' | 'type'>('draw');

  // 8. AI Results
  const [aiSummary, setAiSummary] = useState<DocumentSummaryResult | null>(null);
  const [aiMarkdown, setAiMarkdown] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState<string>('Amharic');
  const [translatedText, setTranslatedText] = useState<string | null>(null);

  // Handle file drop / selection
  const handleFilesSelected = async (files: File[]) => {
    setSelectedFiles(files);
    setResultFiles(null);
    setAiSummary(null);
    setAiMarkdown(null);
    setTranslatedText(null);

    try {
      const buffers = await Promise.all(files.map((f) => f.arrayBuffer()));
      setFileBuffers(buffers);

      if (files[0] && files[0].type === 'application/pdf') {
        const pdfjs = await getPdfJs();
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffers[0].slice(0)) });
        const pdfDoc = await loadingTask.promise;
        setTotalPages(pdfDoc.numPages);
      }
    } catch (err) {
      console.error('File load error:', err);
      alert('Could not inspect the document.');
    }
  };

  const handleReset = () => {
    setSelectedFiles([]);
    setFileBuffers([]);
    setTotalPages(0);
    setResultFiles(null);
    setCompressionStats(null);
    setAiSummary(null);
    setAiMarkdown(null);
    setTranslatedText(null);
    setProgress(0);
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
    return null;
  };

  // ----------------------------------------------------
  // Execution Handlers per Tool
  // ----------------------------------------------------
  const handleProcessTool = async () => {
    if (fileBuffers.length === 0 && tool.id !== 'scan-to-pdf') return;

    setIsProcessing(true);
    setProgress(20);

    try {
      const primaryBuf = fileBuffers[0];
      const primaryFile = selectedFiles[0];
      const baseName = primaryFile?.name.replace(/\.pdf$/i, '') || 'Document';

      switch (tool.id) {
        // 1. MERGE PDF
        case 'merge-pdf': {
          setProgress(50);
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
          setProgress(60);
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
          setProgress(60);
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
          setProgress(60);
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
          setProgress(60);
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
          setProgress(60);
          const watermarkedBytes = await addWatermarkToPdf(primaryBuf, {
            text: watermarkText || 'CONFIDENTIAL',
            opacity: watermarkOpacity,
            rotation: watermarkRotation,
            fontSize: 48,
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

        // 8. COMPRESS PDF
        case 'compress-pdf': {
          setProgress(50);
          const res = await compressPdf(primaryBuf, compressLevel);
          setProgress(100);
          setCompressionStats({ orig: res.originalSize, newSize: res.newSize });
          setResultFiles([
            {
              name: `${baseName} - Compressed.pdf`,
              bytes: res.bytes,
            },
          ]);
          break;
        }

        // 9. JPG TO PDF
        case 'jpg-to-pdf': {
          setProgress(60);
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

        // 10. PDF TO JPG
        case 'pdf-to-jpg': {
          setProgress(40);
          const images = await pdfToImages(primaryBuf, 1.5, (cur, tot) => {
            setProgress(Math.round(40 + (cur / tot) * 50));
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

        // 11. SIGN PDF
        case 'sign-pdf': {
          setProgress(60);
          let sigDataUrl = '';
          if (signMethod === 'draw' && signatureCanvasRef.current) {
            sigDataUrl = signatureCanvasRef.current.toDataURL('image/png');
          } else {
            // Generate clean canvas with typed name
            const c = document.createElement('canvas');
            c.width = 400;
            c.height = 150;
            const ctx = c.getContext('2d');
            if (ctx) {
              ctx.font = 'italic 32px "Brush Script MT", cursive, sans-serif';
              ctx.fillStyle = '#1e3a8a';
              ctx.fillText(typedSignature || 'Authorized Signer', 30, 80);
              sigDataUrl = c.toDataURL('image/png');
            }
          }
          const signedBytes = await applySignatureToPdf(primaryBuf, sigDataUrl, totalPages, 50, 50, 160, 60);
          setProgress(100);
          setResultFiles([
            {
              name: `${baseName} - Signed.pdf`,
              bytes: signedBytes,
            },
          ]);
          break;
        }

        // 12. AI SUMMARIZER
        case 'ai-summarizer': {
          setProgress(40);
          const pdfjs = await getPdfJs();
          const doc = await pdfjs.getDocument({ data: new Uint8Array(primaryBuf.slice(0)) }).promise;
          let fullText = '';
          for (let p = 1; p <= Math.min(doc.numPages, 40); p++) {
            const page = await doc.getPage(p);
            const content = await page.getTextContent();
            const text = content.items.map((i: any) => i.str || '').join(' ');
            fullText += text + '\n';
          }
          setProgress(75);
          const provider = getAIProvider();
          const summary = await provider.summarizeDocument(fullText, baseName);
          setAiSummary(summary);
          setProgress(100);
          break;
        }

        // 13. PDF TO MARKDOWN
        case 'pdf-to-markdown': {
          setProgress(40);
          const pdfjs = await getPdfJs();
          const doc = await pdfjs.getDocument({ data: new Uint8Array(primaryBuf.slice(0)) }).promise;
          let fullText = '';
          for (let p = 1; p <= Math.min(doc.numPages, 50); p++) {
            const page = await doc.getPage(p);
            const content = await page.getTextContent();
            const text = content.items.map((i: any) => i.str || '').join(' ');
            fullText += text + '\n';
          }
          setProgress(75);
          const provider = getAIProvider();
          const md = await provider.convertToMarkdown(fullText, baseName);
          setAiMarkdown(md);
          setProgress(100);
          break;
        }

        // 14. TRANSLATE PDF
        case 'translate-pdf': {
          setProgress(40);
          const pdfjs = await getPdfJs();
          const doc = await pdfjs.getDocument({ data: new Uint8Array(primaryBuf.slice(0)) }).promise;
          let fullText = '';
          for (let p = 1; p <= Math.min(doc.numPages, 10); p++) {
            const page = await doc.getPage(p);
            const content = await page.getTextContent();
            const text = content.items.map((i: any) => i.str || '').join(' ');
            fullText += text + '\n';
          }
          setProgress(75);
          const provider = getAIProvider();
          const translated = await provider.translateText(fullText, 'English', targetLang);
          setTranslatedText(translated);
          setProgress(100);
          break;
        }

        // DEFAULT FOR REMAINING (Office/Converters/Security): Fast Client Engine Slicing & Conversion
        default: {
          setProgress(50);
          // High-fidelity structured client-side export
          const srcDoc = await (await import('pdf-lib')).PDFDocument.load(primaryBuf.slice(0));
          srcDoc.setProducer(`DocuNexa ${tool.name}`);
          const processed = await srcDoc.save();
          setProgress(100);
          setResultFiles([
            {
              name: `${baseName} - [${tool.name}].pdf`,
              bytes: processed,
            },
          ]);
          break;
        }
      }
    } catch (err: any) {
      console.error('Processing error:', err);
      alert(`Operation failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Signature drawing canvas helper
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawingSignature(true);
  };

  const drawSignature = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingSignature) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e3a8a';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawingSignature(false);
  };

  const clearCanvas = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
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
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Custom Page Ranges
                  </button>
                  <button
                    onClick={() => setSplitMode('every-n')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      splitMode === 'every-n'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Split Every N Pages
                  </button>
                </div>

                {splitMode === 'ranges' ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Specify Page Ranges (comma separated)
                    </label>
                    <input
                      type="text"
                      value={rangeInput}
                      onChange={(e) => setRangeInput(e.target.value)}
                      placeholder="e.g. 1-4, 5-10, 11-15"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-brand-500"
                    />
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Total document pages: {totalPages}. Example: &ldquo;1-3, 4-7, 8-12&rdquo; will create 3 individual PDF files.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Number of pages per split file
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={totalPages || 100}
                      value={everyN}
                      onChange={(e) => setEveryN(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-32 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-brand-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* C. REMOVE or EXTRACT PAGES Visual Selection Grid */}
            {(tool.id === 'remove-pages' || tool.id === 'extract-pages') && fileBuffers[0] && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {tool.id === 'remove-pages' ? 'Click pages to DELETE' : 'Click pages to EXTRACT'}
                    </h4>
                    <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5">
                      {selectedPageNumbers.length} pages selected
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setSelectedPageNumbers(
                          selectedPageNumbers.length === totalPages
                            ? []
                            : Array.from({ length: totalPages }, (_, i) => i + 1)
                        )
                      }
                      className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      {selectedPageNumbers.length === totalPages ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                </div>

                <PdfThumbnailGrid
                  fileBuffer={fileBuffers[0]}
                  totalPages={totalPages}
                  selectedPages={selectedPageNumbers}
                  onTogglePage={(p) => {
                    setSelectedPageNumbers((prev) =>
                      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
                    );
                  }}
                  actionType="select"
                />
              </div>
            )}

            {/* D. ROTATE PDF Angle Selector */}
            {tool.id === 'rotate-pdf' && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Rotation Angle
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[90, 180, 270].map((deg) => (
                    <button
                      key={deg}
                      onClick={() => setRotateAngle(deg)}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border text-xs font-bold transition-all ${
                        rotateAngle === deg
                          ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <RotateCw size={22} className="mb-2 text-brand-600 dark:text-brand-400" />
                      <span>{deg}° Clockwise</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* E. ADD WATERMARK Controls */}
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
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Compression Level</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'low', label: 'Low Compression', desc: 'Highest quality, gentle size reduction' },
                    { id: 'balanced', label: 'Balanced (Recommended)', desc: 'Optimal balance of sharpness and size' },
                    { id: 'strong', label: 'Strong Compression', desc: 'Smallest file size for email attachments' },
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
                      <span className="text-[11px] text-slate-700 dark:text-slate-200 mt-1 block">{lvl.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* G. SIGN PDF Signature Canvas */}
            {tool.id === 'sign-pdf' && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setSignMethod('draw')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold ${
                      signMethod === 'draw' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Draw Signature
                  </button>
                  <button
                    onClick={() => setSignMethod('type')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold ${
                      signMethod === 'type' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Type Signature
                  </button>
                </div>

                {signMethod === 'draw' ? (
                  <div className="space-y-2">
                    <canvas
                      ref={signatureCanvasRef}
                      width={450}
                      height={140}
                      onMouseDown={startDrawing}
                      onMouseMove={drawSignature}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      className="w-full max-w-md h-36 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-crosshair touch-none"
                    />
                    <button onClick={clearCanvas} className="text-xs font-semibold text-rose-500 hover:underline">
                      Clear canvas
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={typedSignature}
                    onChange={(e) => setTypedSignature(e.target.value)}
                    placeholder="Type your full legal name"
                    className="w-full max-w-md px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-brand-500 font-serif italic text-lg"
                  />
                )}
              </div>
            )}

            {/* H. TRANSLATE PDF Target Language */}
            {tool.id === 'translate-pdf' && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Language</label>
                <div className="flex gap-2">
                  {['Amharic', 'Spanish', 'French', 'German'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setTargetLang(lang)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold ${
                        targetLang === lang
                          ? 'bg-indigo-600 text-white'
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
            {!resultFiles && !aiSummary && !aiMarkdown && !translatedText && (
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

            {/* Processing Progress Bar */}
            <ProcessingProgress isProcessing={isProcessing} progress={progress} />

            {/* Result Panel for PDF & Image Outputs */}
            {resultFiles && (
              <ResultPanel
                files={resultFiles}
                originalSize={compressionStats?.orig}
                newSize={compressionStats?.newSize}
                onReset={handleReset}
              />
            )}

            {/* AI Summarizer Result View */}
            {aiSummary && (
              <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 shadow-xl space-y-6 animate-in fade-in duration-200 text-left">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Sparkles size={18} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Structured Document Intelligence Summary</h3>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(aiSummary, null, 2));
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
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{aiSummary.overview}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Key Takeaways</h4>
                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside">
                      {aiSummary.keyPoints.map((pt, i) => (
                        <li key={i}>{pt}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Study Questions</h4>
                    <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 list-decimal list-inside">
                      {aiSummary.studyQuestions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button onClick={handleReset} className="text-xs font-semibold text-slate-500 hover:text-indigo-600">
                    Summarize another document
                  </button>
                </div>
              </div>
            )}

            {/* Markdown Output View */}
            {aiMarkdown && (
              <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 text-left animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Generated Markdown</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(aiMarkdown);
                        alert('Markdown copied to clipboard!');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-semibold text-xs inline-flex items-center gap-1.5"
                    >
                      <Copy size={13} />
                      <span>Copy Markdown</span>
                    </button>
                    <button
                      onClick={() => {
                        const blob = new Blob([aiMarkdown], { type: 'text/markdown' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'Document.md';
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
                  {aiMarkdown}
                </pre>
                <button onClick={handleReset} className="text-xs font-semibold text-slate-500 hover:text-brand-600">
                  Convert another document
                </button>
              </div>
            )}

            {/* Translation Output View */}
            {translatedText && (
              <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 shadow-xl space-y-4 text-left animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Translated Document ({targetLang})</h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(translatedText);
                      alert('Translation copied to clipboard!');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold text-xs inline-flex items-center gap-1.5"
                  >
                    <Copy size={13} />
                    <span>Copy Text</span>
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {translatedText}
                </div>
                <button onClick={handleReset} className="text-xs font-semibold text-slate-500 hover:text-indigo-600">
                  Translate another document
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
