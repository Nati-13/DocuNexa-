'use client';

import React, { useState } from 'react';
import { PdfDropzone } from '@/components/common/PdfDropzone';
import { ResultPanel, ResultFileItem } from '@/components/common/ResultPanel';
import { getPdfJs, getPdfJsDocumentParams } from '@/lib/pdfReader';
import { rotatePdf } from '@/lib/pdfEngine';
import { sanitizeDownloadFilename } from '@/lib/downloadContract';
import { PDFDocument } from 'pdf-lib';
import { normalizePdfInput } from '@/lib/pdfInputNormalizer';
import { PdfWorkspace } from '@/components/pdf/PdfWorkspace';
import {
  RotateCw,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Layers,
  CheckCircle2
} from 'lucide-react';

export function RotatePdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Per-page rotation states: pageNumber (1-based) -> cumulative rotation degrees (0, 90, 180, 270)
  const [rotations, setRotations] = useState<Record<number, number>>({});

  // Processing & Results
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultFiles, setResultFiles] = useState<ResultFileItem[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setErrorMessage(null);
    setResultFiles(null);
    setRotations({});

    try {
      const norm = await normalizePdfInput(selected, { toolName: 'Rotate PDF' });
      const pdfjs = await getPdfJs();
      const task = pdfjs.getDocument(getPdfJsDocumentParams(norm.uint8Array.slice(0)));
      const doc = await task.promise;

      setFile(selected);
      setFileBuffer(norm.arrayBuffer);
      setTotalPages(doc.numPages);
    } catch (err: any) {
      console.error('Failed to load PDF for rotation:', err);
      setErrorMessage(err.message || 'The selected file could not be read or is corrupted.');
    }
  };

  const handleRotateSinglePage = (page: number, delta: number) => {
    setRotations((prev) => {
      const current = prev[page] || 0;
      const next = (current + delta + 360) % 360;
      if (next === 0) {
        const copy = { ...prev };
        delete copy[page];
        return copy;
      }
      return { ...prev, [page]: next };
    });
  };

  const handleRotateAll = (delta: number) => {
    setRotations((prev) => {
      const nextMap: Record<number, number> = {};
      for (let p = 1; p <= totalPages; p++) {
        const current = prev[p] || 0;
        const next = (current + delta + 360) % 360;
        if (next !== 0) {
          nextMap[p] = next;
        }
      }
      return nextMap;
    });
  };

  const handleResetRotations = () => {
    setRotations({});
  };

  const hasAnyRotations = Object.keys(rotations).length > 0;

  const handleApplyRotate = async () => {
    if (!file || !fileBuffer) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const norm = await normalizePdfInput(file, { toolName: 'Rotate PDF' });

      // Pass the per-page rotation dictionary (or fallback angle)
      const rotatedBytes = await rotatePdf(
        norm.arrayBuffer,
        hasAnyRotations ? rotations : 90
      );

      // Verify output
      const verifiedDoc = await PDFDocument.load(rotatedBytes.slice(0));
      if (verifiedDoc.getPageCount() === 0) {
        throw new Error('Rotation failed: Output PDF contains 0 pages.');
      }

      const outputFilename = sanitizeDownloadFilename(file.name, 'pdf', 'rotated');

      setResultFiles([
        {
          name: outputFilename,
          bytes: rotatedBytes,
          size: rotatedBytes.byteLength,
        },
      ]);
    } catch (err: any) {
      console.error('Rotate error:', err);
      setErrorMessage(err.message || 'Failed to rotate PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setFileBuffer(null);
    setResultFiles(null);
    setErrorMessage(null);
    setRotations({});
  };

  if (resultFiles) {
    return (
      <ResultPanel
        title="PDF Rotated Successfully!"
        subtitle="All page orientations have been permanently adjusted and saved."
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
          title="Rotate PDF — Visual Orientation Editor"
          filename={file.name}
          totalPages={totalPages}
          pdfBuffer={fileBuffer}
          mode="none"
          rotations={rotations}
          onRotatePage={handleRotateSinglePage}
          onApply={handleApplyRotate}
          onReset={handleReset}
          isProcessing={isProcessing}
          applyButtonLabel={
            hasAnyRotations
              ? `Apply Rotations (${Object.keys(rotations).length} pages modified) & Download`
              : 'Rotate 90° Clockwise & Download'
          }
        >
          {/* Side Panel Controls */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                Batch Document Rotation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleRotateAll(90)}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/60 border border-brand-200 dark:border-brand-800/60 flex items-center justify-center gap-1.5 transition-all shadow-xs"
                >
                  <RotateCw size={14} />
                  <span>All +90° Right</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRotateAll(-90)}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 transition-all"
                >
                  <RotateCcw size={14} />
                  <span>All -90° Left</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRotateAll(180)}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 transition-all"
                >
                  <RefreshCw size={14} />
                  <span>All 180° Flip</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetRotations}
                  disabled={!hasAnyRotations}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-all"
                >
                  Reset to 0°
                </button>
              </div>
            </div>

            {/* Individual Page Tips */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                <Layers size={14} className="text-brand-500" />
                <span>Per-Page Independent Rotation</span>
              </div>
              <p className="leading-relaxed">
                You can rotate individual pages separately! Simply click the rotate icons on any page thumbnail in the left rail or use the toolbar buttons directly above the page preview.
              </p>
              {hasAnyRotations && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-brand-600 dark:text-brand-400 font-bold">
                  <span>Modified pages:</span>
                  <span>{Object.keys(rotations).length} of {totalPages}</span>
                </div>
              )}
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
          Rotate PDF Pages
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Visually preview and permanently rotate single pages or the entire document clockwise, counter-clockwise, or 180°.
        </p>
      </div>

      <PdfDropzone
        onFilesSelected={handleFileSelected}
        accept=".pdf,application/pdf"
        title="Drop a PDF to Rotate"
        subtitle="Individual page or batch rotation • 100% Client-Side & Free"
      />
    </div>
  );
}
