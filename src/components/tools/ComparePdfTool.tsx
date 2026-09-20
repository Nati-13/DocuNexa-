'use client';

import React, { useState } from 'react';
import { PdfDropzone } from '@/components/common/PdfDropzone';
import { ProcessingProgress } from '@/components/common/ProcessingProgress';
import { comparePdfs, PdfComparisonResult } from '@/lib/pdfEngine';
import { 
  GitCompare, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight, 
  Diff, 
  Download 
} from 'lucide-react';

export function ComparePdfTool() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [bufferA, setBufferA] = useState<ArrayBuffer | null>(null);

  const [fileB, setFileB] = useState<File | null>(null);
  const [bufferB, setBufferB] = useState<ArrayBuffer | null>(null);

  // Comparison State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [comparisonResult, setComparisonResult] = useState<PdfComparisonResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'differences'>('differences');

  const handleFileASelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    try {
      const selected = files[0];
      const buf = await selected.arrayBuffer();
      setFileA(selected);
      setBufferA(buf);
      setComparisonResult(null);
    } catch (err: any) {
      setErrorMessage('Could not load Document A.');
    }
  };

  const handleFileBSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    try {
      const selected = files[0];
      const buf = await selected.arrayBuffer();
      setFileB(selected);
      setBufferB(buf);
      setComparisonResult(null);
    } catch (err: any) {
      setErrorMessage('Could not load Document B.');
    }
  };

  const isFormValid = Boolean(fileA && bufferA && fileB && bufferB);

  const handleCompare = async () => {
    if (!isFormValid || !fileA || !bufferA || !fileB || !bufferB) return;

    setIsProcessing(true);
    setProgress(20);
    setErrorMessage(null);

    try {
      setProgress(50);
      const freshA = await fileA.arrayBuffer();
      const freshB = await fileB.arrayBuffer();
      const result = await comparePdfs(freshA, fileA.name, freshB, fileB.name);

      setProgress(100);
      await new Promise((r) => setTimeout(r, 150));
      setComparisonResult(result);
    } catch (err: any) {
      console.error('Comparison error:', err);
      setErrorMessage(err.message || 'Failed to compare documents.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadReport = () => {
    if (!comparisonResult) return;
    const lines = [
      '# DocuNexa PDF Comparison Audit Report',
      `Date: ${new Date().toLocaleString()}`,
      '',
      `## Document A (Original): ${comparisonResult.docA.name}`,
      `- Pages: ${comparisonResult.docA.pageCount}`,
      `- Total Characters: ${comparisonResult.docA.charCount}`,
      '',
      `## Document B (Modified): ${comparisonResult.docB.name}`,
      `- Pages: ${comparisonResult.docB.pageCount}`,
      `- Total Characters: ${comparisonResult.docB.charCount}`,
      '',
      `## Summary of Differences`,
      `- Total Changed Pages: ${comparisonResult.totalChangesCount}`,
      `- Page Count Difference: ${comparisonResult.pageCountDiff > 0 ? `+${comparisonResult.pageCountDiff}` : comparisonResult.pageCountDiff}`,
      '',
      '## Detailed Page Discrepancies:',
      ...comparisonResult.pageDiffs.map((d) => 
        `- Page ${d.pageNumber} [${d.status.toUpperCase()}]: Chars A: ${d.charCountA}, Chars B: ${d.charCountB}\n  Snippet A: "${d.snippetA}"\n  Snippet B: "${d.snippetB}"`
      ),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DocuNexa-Comparison-Report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    setFileA(null);
    setBufferA(null);
    setFileB(null);
    setBufferB(null);
    setComparisonResult(null);
    setErrorMessage(null);
  };

  const filteredDiffs = comparisonResult
    ? filterMode === 'differences'
      ? comparisonResult.pageDiffs.filter((d) => d.status !== 'identical')
      : comparisonResult.pageDiffs
    : [];

  return (
    <div className="space-y-8">
      {comparisonResult ? (
        <div className="space-y-6">
          {/* Summary Header */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-emerald-500" />
                  Comparison Complete
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Audited {Math.max(comparisonResult.docA.pageCount, comparisonResult.docB.pageCount)} pages across both documents.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadReport}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Download size={14} /> Download Report (.md)
                </button>
                <button
                  type="button"
                  onClick={resetAll}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw size={14} /> New Compare
                </button>
              </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Document A (Original)
                </span>
                <h4 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1 mt-1">
                  {comparisonResult.docA.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span>{comparisonResult.docA.pageCount} pages</span>
                  <span>•</span>
                  <span>{comparisonResult.docA.charCount} characters</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Document B (Modified)
                </span>
                <h4 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1 mt-1">
                  {comparisonResult.docB.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span>{comparisonResult.docB.pageCount} pages</span>
                  <span>•</span>
                  <span>{comparisonResult.docB.charCount} characters</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-brand-50/50 dark:bg-brand-950/30 border border-brand-200/50 dark:border-brand-800/50">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Detected Discrepancies
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-brand-700 dark:text-brand-300">
                    {comparisonResult.totalChangesCount}
                  </span>
                  <span className="text-xs text-brand-600 dark:text-brand-400">
                    {comparisonResult.totalChangesCount === 1 ? 'changed page' : 'changed pages'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {comparisonResult.pageCountDiff === 0
                    ? 'Identical total page count'
                    : `${Math.abs(comparisonResult.pageCountDiff)} page(s) ${comparisonResult.pageCountDiff > 0 ? 'added' : 'removed'}`}
                </p>
              </div>
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Page-by-Page Audit Breakdown
              </span>

              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => setFilterMode('differences')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    filterMode === 'differences'
                      ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Differences Only ({comparisonResult.totalChangesCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    filterMode === 'all'
                      ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  All Pages ({comparisonResult.pageDiffs.length})
                </button>
              </div>
            </div>

            {/* Differences Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDiffs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  ✓ No differences found for this filter. Both documents appear identical!
                </div>
              ) : (
                filteredDiffs.map((diff) => (
                  <div key={diff.pageNumber} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          Page {diff.pageNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            diff.status === 'identical'
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : diff.status === 'modified'
                              ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                              : diff.status === 'added'
                              ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                              : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                          }`}
                        >
                          {diff.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Chars A: {diff.charCountA} | Chars B: {diff.charCountB}
                      </div>
                    </div>

                    {diff.status !== 'identical' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800">
                        <div>
                          <span className="font-bold text-slate-500 block mb-1">Snippet A (Original):</span>
                          <p className="font-mono text-slate-700 dark:text-slate-300">
                            {diff.snippetA || '<Empty or missing page>'}
                          </p>
                        </div>
                        <div>
                          <span className="font-bold text-slate-500 block mb-1">Snippet B (Modified):</span>
                          <p className="font-mono text-slate-700 dark:text-slate-300">
                            {diff.snippetB || '<Empty or missing page>'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : isProcessing ? (
        <ProcessingProgress progress={progress} statusText="Extracting text layers and comparing PDF pages..." />
      ) : (
        <div className="space-y-8">
          {/* Dual Dropzones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Document A */}
            <div className="space-y-3">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Document A (Original Baseline)
              </span>
              {!fileA ? (
                <PdfDropzone
                  onFilesSelected={handleFileASelected}
                  accept=".pdf,application/pdf"
                  multiple={false}
                  title="Upload Original PDF"
                  subtitle="Select first PDF for comparison"
                />
              ) : (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-brand-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                        {fileA.name}
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        {(fileA.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFileA(null);
                      setBufferA(null);
                    }}
                    className="text-xs text-slate-500 hover:text-red-500"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            {/* Document B */}
            <div className="space-y-3">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Document B (Modified Version)
              </span>
              {!fileB ? (
                <PdfDropzone
                  onFilesSelected={handleFileBSelected}
                  accept=".pdf,application/pdf"
                  multiple={false}
                  title="Upload Modified PDF"
                  subtitle="Select second PDF to compare against Document A"
                />
              ) : (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-emerald-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                        {fileB.name}
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        {(fileB.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFileB(null);
                      setBufferB(null);
                    }}
                    className="text-xs text-slate-500 hover:text-red-500"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="button"
              disabled={!isFormValid || isProcessing}
              onClick={handleCompare}
              className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                isFormValid
                  ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/25 cursor-pointer transform hover:-translate-y-0.5'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
              }`}
            >
              <GitCompare size={18} />
              <span>Compare Documents</span>
            </button>

            {!isFormValid && (
              <p className="text-center text-[11px] text-slate-600 dark:text-slate-300 mt-2">
                Please upload both Document A and Document B to enable comparison
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
