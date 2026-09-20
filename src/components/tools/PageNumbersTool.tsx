'use client';

import React, { useState } from 'react';
import { PdfDropzone } from '@/components/common/PdfDropzone';
import { ResultPanel, ResultFileItem } from '@/components/common/ResultPanel';
import { getPdfJs, getPdfJsDocumentParams } from '@/lib/pdfReader';
import { addPageNumbersToPdf } from '@/lib/pdfEngine';
import { sanitizeDownloadFilename } from '@/lib/downloadContract';
import { PDFDocument } from 'pdf-lib';
import { normalizePdfInput } from '@/lib/pdfInputNormalizer';
import { PdfWorkspace } from '@/components/pdf/PdfWorkspace';
import {
  FileText,
  Sliders,
  AlertCircle,
  Hash,
  Sparkles,
  LayoutGrid
} from 'lucide-react';

export function PageNumbersTool() {
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Page number configurations
  const [position, setPosition] = useState<
    'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-center' | 'top-left'
  >('bottom-center');
  const [format, setFormat] = useState<'page-of-total' | 'number' | 'roman'>('page-of-total');
  const [startNumber, setStartNumber] = useState<number>(1);
  const [fontSize, setFontSize] = useState<number>(10);
  const [margin, setMargin] = useState<number>(30);
  const [colorHex, setColorHex] = useState<string>('#475569');

  // Processing & Results
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultFiles, setResultFiles] = useState<ResultFileItem[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setErrorMessage(null);
    setResultFiles(null);

    try {
      const norm = await normalizePdfInput(selected, { toolName: 'Add Page Numbers' });
      const pdfjs = await getPdfJs();
      const task = pdfjs.getDocument(getPdfJsDocumentParams(norm.uint8Array.slice(0)));
      const doc = await task.promise;

      setFile(selected);
      setFileBuffer(norm.arrayBuffer);
      setTotalPages(doc.numPages);
    } catch (err: any) {
      console.error('Failed to load PDF for page numbers:', err);
      setErrorMessage(err.message || 'The selected file could not be read or is corrupted.');
    }
  };

  const getPreviewText = (pageIdx: number = 1) => {
    const currentNum = startNumber + pageIdx - 1;
    if (format === 'page-of-total') {
      return `Page ${currentNum} of ${totalPages}`;
    }
    if (format === 'roman') {
      const romanNumerals = [
        { v: 10, s: 'X' },
        { v: 9, s: 'IX' },
        { v: 5, s: 'V' },
        { v: 4, s: 'IV' },
        { v: 1, s: 'I' },
      ];
      let num = currentNum;
      let roman = '';
      for (const { v, s } of romanNumerals) {
        while (num >= v) {
          roman += s;
          num -= v;
        }
      }
      return roman || `${currentNum}`;
    }
    return `${currentNum}`;
  };

  const handleApplyPageNumbers = async () => {
    if (!file || !fileBuffer) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const norm = await normalizePdfInput(file, { toolName: 'Add Page Numbers' });

      const numberedBytes = await addPageNumbersToPdf(norm.arrayBuffer, {
        position,
        format,
        startNumber,
        fontSize,
        margin,
        colorHex,
      });

      // Verify output
      const verifiedDoc = await PDFDocument.load(numberedBytes.slice(0));
      if (verifiedDoc.getPageCount() === 0) {
        throw new Error('Page numbering failed: Output PDF contains 0 pages.');
      }

      const outputFilename = sanitizeDownloadFilename(file.name, 'pdf', 'numbered');

      setResultFiles([
        {
          name: outputFilename,
          bytes: numberedBytes,
          size: numberedBytes.byteLength,
        },
      ]);
    } catch (err: any) {
      console.error('Page numbers error:', err);
      setErrorMessage(err.message || 'Failed to add page numbers to PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setFileBuffer(null);
    setResultFiles(null);
    setErrorMessage(null);
  };

  if (resultFiles) {
    return (
      <ResultPanel
        title="Page Numbers Added Successfully!"
        subtitle="All pages have been neatly indexed with crisp vector typography."
        files={resultFiles}
        onReset={handleReset}
      />
    );
  }

  if (file && fileBuffer) {
    return (
      <div className="w-full space-y-4">
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <PdfWorkspace
          title="Add Page Numbers — Interactive Layout Stamping"
          filename={file.name}
          totalPages={totalPages}
          pdfBuffer={fileBuffer}
          mode="page-numbers"
          pageNumberProps={{
            text: getPreviewText(1),
            position,
            fontSize,
            colorHex,
            margin,
          }}
          onApply={handleApplyPageNumbers}
          onReset={handleReset}
          isProcessing={isProcessing}
          applyButtonLabel="Apply Page Numbers & Download PDF"
        >
          {/* Side Panel Controls */}
          <div className="space-y-4">
            {/* 6-Position Grid */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Number Placement
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'top-left', label: 'Top Left' },
                  { id: 'top-center', label: 'Top Center' },
                  { id: 'top-right', label: 'Top Right' },
                  { id: 'bottom-left', label: 'Bottom Left' },
                  { id: 'bottom-center', label: 'Bottom Center' },
                  { id: 'bottom-right', label: 'Bottom Right' },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => setPosition(pos.id as any)}
                    className={`p-2 rounded-xl text-xs font-bold transition-all text-center ${
                      position === pos.id
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Format Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Numbering Style
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'page-of-total', label: 'Page 1 of N' },
                  { id: 'number', label: '1, 2, 3...' },
                  { id: 'roman', label: 'I, II, III...' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setFormat(fmt.id as any)}
                    className={`p-2 rounded-xl text-xs font-bold transition-all text-center ${
                      format === fmt.id
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Starting Page Number */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Starting Number
                </label>
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                  Starts at: {startNumber}
                </span>
              </div>
              <input
                type="number"
                min="1"
                max="9999"
                value={startNumber}
                onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-brand-500 outline-hidden"
              />
            </div>

            {/* Margin Preset */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Page Margin ({margin} pt)
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { pt: 20, label: 'Tight (20pt)' },
                  { pt: 30, label: 'Normal (30pt)' },
                  { pt: 48, label: 'Wide (48pt)' },
                ].map((m) => (
                  <button
                    key={m.pt}
                    type="button"
                    onClick={() => setMargin(m.pt)}
                    className={`p-2 rounded-xl text-xs font-bold transition-all text-center ${
                      margin === m.pt
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Font Size
                </label>
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                  {fontSize} pt
                </span>
              </div>
              <input
                type="range"
                min="8"
                max="16"
                step="1"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                className="w-full accent-brand-600 cursor-pointer"
              />
            </div>

            {/* Live Indicator */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <span className="font-bold text-slate-900 dark:text-white block">Preview on Canvas:</span>
              <p className="font-mono text-brand-600 dark:text-brand-400 font-bold">
                "{getPreviewText(1)}" at {position}
              </p>
            </div>
          </div>
        </PdfWorkspace>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Add Page Numbers to PDF
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Embed custom numbering badges at any position with full typography control and real-time visual alignment.
        </p>
      </div>

      <PdfDropzone
        onFilesSelected={handleFileSelected}
        accept=".pdf,application/pdf"
        title="Drop a PDF to Add Page Numbers"
        subtitle="6-grid positioning • Roman or standard digits • 100% Client-Side & Free"
      />
    </div>
  );
}
