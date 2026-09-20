'use client';

import React, { useState } from 'react';
import { PdfDropzone } from '@/components/common/PdfDropzone';
import { ProcessingProgress } from '@/components/common/ProcessingProgress';
import { ResultPanel, ResultFileItem } from '@/components/common/ResultPanel';
import { getPdfJs, getPdfJsDocumentParams } from '@/lib/pdfReader';
import { cropPdf } from '@/lib/pdfEngine';
import { sanitizeDownloadFilename } from '@/lib/downloadContract';
import { PDFDocument } from 'pdf-lib';
import { normalizePdfInput } from '@/lib/pdfInputNormalizer';
import { 
  Crop, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw 
} from 'lucide-react';

export function CropPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Crop settings
  const [cropPreset, setCropPreset] = useState<'trim-margins' | 'trim-header' | 'trim-footer' | 'custom'>('trim-margins');
  const [marginPct, setMarginPct] = useState<number>(5); // 5% border trim
  const [targetPagesMode, setTargetPagesMode] = useState<'all' | 'first' | 'last'>('all');

  // Processing & Results
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [resultFiles, setResultFiles] = useState<ResultFileItem[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setErrorMessage(null);
    setResultFiles(null);

    try {
      const norm = await normalizePdfInput(selected, { toolName: 'Crop PDF' });
      const pdfjs = await getPdfJs();
      const task = pdfjs.getDocument(getPdfJsDocumentParams(norm.uint8Array.slice(0)));
      const doc = await task.promise;

      setFile(selected);
      setFileBuffer(norm.arrayBuffer);
      setTotalPages(doc.numPages);
    } catch (err: any) {
      console.error('Failed to load PDF for cropping:', err);
      setErrorMessage(err.message || 'The selected file could not be read or is corrupted.');
    }
  };

  const isFormValid = Boolean(file && fileBuffer);

  const handleCropPdf = async () => {
    if (!isFormValid || !file || !fileBuffer) return;

    setIsProcessing(true);
    setProgress(30);
    setErrorMessage(null);

    try {
      const norm = await normalizePdfInput(file, { toolName: 'Crop PDF' });

      let cropInput: any;
      if (cropPreset === 'trim-margins') {
        cropInput = { marginPercent: marginPct };
      } else if (cropPreset === 'trim-header') {
        cropInput = { trimTopPercent: 12 };
      } else if (cropPreset === 'trim-footer') {
        cropInput = { trimBottomPercent: 10 };
      } else {
        const srcDoc = await PDFDocument.load(norm.uint8Array.slice(0));
        const firstPage = srcDoc.getPages()[0];
        const { width, height } = firstPage.getSize();
        const mx = width * (marginPct / 100);
        const my = height * (marginPct / 100);
        cropInput = {
          x: mx,
          y: my,
          width: Math.max(10, width - 2 * mx),
          height: Math.max(10, height - 2 * my),
        };
      }

      const targetPages =
        targetPagesMode === 'all'
          ? undefined
          : targetPagesMode === 'first'
          ? [1]
          : [totalPages];

      setProgress(60);
      const croppedBytes = await cropPdf(norm.arrayBuffer, cropInput, targetPages);

      setProgress(85);
      const verifiedDoc = await PDFDocument.load(croppedBytes.slice(0));
      if (verifiedDoc.getPageCount() === 0) {
        throw new Error('Verification failed: Cropped PDF produced 0 pages.');
      }

      const pdfjs = await getPdfJs();
      const task = pdfjs.getDocument(getPdfJsDocumentParams(croppedBytes.slice(0)));
      const vDoc = await task.promise;
      if (vDoc.numPages === 0) {
        throw new Error('Verification failed: Cropped PDF could not be opened by PDF.js.');
      }

      setProgress(100);
      await new Promise((r) => setTimeout(r, 150));

      const outputFilename = sanitizeDownloadFilename(file.name, 'pdf', 'cropped');

      setResultFiles([
        {
          name: outputFilename,
          bytes: croppedBytes,
          size: croppedBytes.byteLength,
        },
      ]);
    } catch (err: any) {
      console.error('Crop error:', err);
      setErrorMessage(err.message || 'Failed to crop PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setFileBuffer(null);
    setResultFiles(null);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-8">
      {resultFiles ? (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <h4 className="font-bold text-sm sm:text-base">Document Cropped Successfully!</h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                The page crop margins have been applied losslessly using PDF standard bounding boxes.
              </p>
            </div>
          </div>
          <ResultPanel files={resultFiles} onReset={resetAll} />
        </div>
      ) : isProcessing ? (
        <ProcessingProgress progress={progress} statusText="Applying precision PDF crop boxes..." />
      ) : (
        <div className="space-y-8">
          {!file ? (
            <PdfDropzone
              onFilesSelected={handleFileSelected}
              accept=".pdf,application/pdf"
              multiple={false}
              title="Select PDF to Crop"
              subtitle="Upload a document to trim white margins, remove scanner borders, or crop headers"
            />
          ) : (
            <div className="space-y-6">
              {/* File Info */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                      {file.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                      <span>•</span>
                      <span>{totalPages} {totalPages === 1 ? 'page' : 'pages'}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetAll}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw size={13} />
                  Change PDF
                </button>
              </div>

              {/* Crop Controls */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <Crop size={18} className="text-brand-600 dark:text-brand-400" />
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Configure Crop Dimensions
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Crop Preset
                    </label>
                    <select
                      value={cropPreset}
                      onChange={(e) => setCropPreset(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium"
                    >
                      <option value="trim-margins">Trim Uniform Outer Margins</option>
                      <option value="trim-header">Trim Header / Running Head</option>
                      <option value="trim-footer">Trim Footer / Page Number Zone</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Target Pages
                    </label>
                    <select
                      value={targetPagesMode}
                      onChange={(e) => setTargetPagesMode(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium"
                    >
                      <option value="all">All Pages in Document ({totalPages})</option>
                      <option value="first">Cover / First Page Only</option>
                      <option value="last">Last Page Only</option>
                    </select>
                  </div>
                </div>

                {cropPreset === 'trim-margins' && (
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>Margin Trim Percentage:</span>
                      <span>{marginPct}%</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={25}
                      value={marginPct}
                      onChange={(e) => setMarginPct(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
                    />
                    <span className="text-[11px] text-slate-500 block">
                      Trims {marginPct}% inward from top, bottom, left, and right edges.
                    </span>
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={!isFormValid || isProcessing}
                    onClick={handleCropPdf}
                    className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                      isFormValid
                        ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/25 cursor-pointer transform hover:-translate-y-0.5'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <Crop size={18} />
                    <span>Crop PDF Document</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
