'use client';

import React, { useState } from 'react';
import { PdfDropzone } from '@/components/common/PdfDropzone';
import { ProcessingProgress } from '@/components/common/ProcessingProgress';
import { ResultPanel, ResultFileItem } from '@/components/common/ResultPanel';
import { getPdfJs } from '@/lib/pdfReader';
import { redactPdfAreas } from '@/lib/pdfEngine';
import { PDFDocument } from 'pdf-lib';
import { 
  ShieldAlert, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Plus, 
  Trash2 
} from 'lucide-react';

interface RedactionItem {
  id: string;
  page: number;
  label: string;
  preset: 'top-header' | 'bottom-footer' | 'custom-box';
  x: number;
  y: number;
  width: number;
  height: number;
}

export function RedactPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Redaction boxes
  const [redactions, setRedactions] = useState<RedactionItem[]>([
    {
      id: '1',
      page: 1,
      label: 'Sensitive Header / Title',
      preset: 'top-header',
      x: 50,
      y: 720,
      width: 500,
      height: 40,
    },
  ]);

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
      const buffer = await selected.arrayBuffer();
      const pdfjs = await getPdfJs();
      const task = pdfjs.getDocument({ data: new Uint8Array(buffer.slice(0)) });
      const doc = await task.promise;

      setFile(selected);
      setFileBuffer(buffer);
      setTotalPages(doc.numPages);
    } catch (err: any) {
      console.error('Failed to load PDF for redaction:', err);
      setErrorMessage('The selected file could not be read or is corrupted.');
    }
  };

  const addRedaction = () => {
    const nextId = String(Date.now());
    setRedactions((prev) => [
      ...prev,
      {
        id: nextId,
        page: 1,
        label: `Redaction Area #${prev.length + 1}`,
        preset: 'custom-box',
        x: 50,
        y: 350,
        width: 400,
        height: 35,
      },
    ]);
  };

  const removeRedaction = (id: string) => {
    setRedactions((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRedaction = (id: string, updates: Partial<RedactionItem>) => {
    setRedactions((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, ...updates };
        if (updates.preset === 'top-header') {
          updated.x = 50;
          updated.y = 720;
          updated.width = 500;
          updated.height = 40;
        } else if (updates.preset === 'bottom-footer') {
          updated.x = 50;
          updated.y = 40;
          updated.width = 500;
          updated.height = 35;
        }
        return updated;
      })
    );
  };

  const isFormValid = Boolean(file && fileBuffer && redactions.length > 0);

  const handleRedactPdf = async () => {
    if (!isFormValid || !file || !fileBuffer) return;

    setIsProcessing(true);
    setProgress(30);
    setErrorMessage(null);

    try {
      setProgress(60);
      const redactedBytes = await redactPdfAreas(
        fileBuffer,
        redactions.map((r) => ({
          page: r.page,
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
        }))
      );

      setProgress(85);
      // Verify valid output PDF
      const verifiedDoc = await PDFDocument.load(redactedBytes);
      if (verifiedDoc.getPageCount() === 0) {
        throw new Error('Verification failed: Redacted PDF produced 0 pages.');
      }

      setProgress(100);
      await new Promise((r) => setTimeout(r, 150));

      const outputFilename = `${file.name.replace(/\.pdf$/i, '')}-redacted.pdf`;

      setResultFiles([
        {
          name: outputFilename,
          bytes: redactedBytes,
          size: redactedBytes.byteLength,
        },
      ]);
    } catch (err: any) {
      console.error('Redaction error:', err);
      setErrorMessage(err.message || 'Failed to redact PDF document.');
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
              <h4 className="font-bold text-sm sm:text-base">Document Redacted Successfully!</h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                The specified sensitive zones have been permanently blacked out and obscured in the output PDF.
              </p>
            </div>
          </div>
          <ResultPanel files={resultFiles} onReset={resetAll} />
        </div>
      ) : isProcessing ? (
        <ProcessingProgress progress={progress} statusText="Applying permanent redactions and blackouts..." />
      ) : (
        <div className="space-y-8">
          {!file ? (
            <PdfDropzone
              onFilesSelected={handleFileSelected}
              accept=".pdf,application/pdf"
              multiple={false}
              title="Select PDF to Redact"
              subtitle="Upload a document to permanently redact confidential names, IDs, numbers, or headers"
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

              {/* Security Limitation Notice */}
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3 text-amber-800 dark:text-amber-300 text-xs">
                <AlertTriangle size={18} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-1">
                  <strong className="font-bold block">Important Redaction Security Advisory:</strong>
                  <p>
                    DocuNexa applies solid opaque vector redaction blocks that obscure all visual content across all PDF viewers and print drivers. For maximum security when redacting high-security classified files, consider converting the resulting pages to images or rasterized PDF using the PDF to JPG tool.
                  </p>
                </div>
              </div>

              {/* Redaction Areas Configuration */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldAlert size={18} className="text-brand-600 dark:text-brand-400" />
                    Configure Redaction Zones ({redactions.length})
                  </h3>

                  <button
                    type="button"
                    onClick={addRedaction}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 dark:hover:bg-brand-900 text-brand-600 dark:text-brand-400 text-xs font-bold transition-colors"
                  >
                    <Plus size={14} /> Add Redaction Zone
                  </button>
                </div>

                <div className="space-y-4">
                  {redactions.map((redaction, index) => (
                    <div
                      key={redaction.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Zone #{index + 1}: {redaction.label}
                        </span>
                        {redactions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRedaction(redaction.id)}
                            className="text-slate-400 hover:text-rose-500 transition-colors"
                            title="Remove Zone"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Target Page
                          </label>
                          <select
                            value={redaction.page}
                            onChange={(e) => updateRedaction(redaction.id, { page: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                          >
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                              <option key={p} value={p}>
                                Page {p}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Zone Preset
                          </label>
                          <select
                            value={redaction.preset}
                            onChange={(e) => updateRedaction(redaction.id, { preset: e.target.value as any })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                          >
                            <option value="top-header">Header Zone (Top)</option>
                            <option value="bottom-footer">Footer Zone (Bottom)</option>
                            <option value="custom-box">Center / Custom Box</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Custom Label
                          </label>
                          <input
                            type="text"
                            value={redaction.label}
                            onChange={(e) => updateRedaction(redaction.id, { label: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Main Action Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={!isFormValid || isProcessing}
                    onClick={handleRedactPdf}
                    className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                      isFormValid
                        ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/25 cursor-pointer transform hover:-translate-y-0.5'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <ShieldAlert size={18} />
                    <span>Apply Permanent Redactions</span>
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
