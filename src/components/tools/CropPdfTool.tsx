'use client';

import React, { useState } from 'react';
import { PdfDropzone } from '@/components/common/PdfDropzone';
import { ResultPanel, ResultFileItem } from '@/components/common/ResultPanel';
import { getPdfJs, getPdfJsDocumentParams } from '@/lib/pdfReader';
import { cropPdf } from '@/lib/pdfEngine';
import { sanitizeDownloadFilename } from '@/lib/downloadContract';
import { screenToPdfCoordinates, ScreenRect } from '@/lib/pdfCoordinates';
import { PDFDocument } from 'pdf-lib';
import { normalizePdfInput } from '@/lib/pdfInputNormalizer';
import { PdfWorkspace } from '@/components/pdf/PdfWorkspace';
import { Crop, FileText, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export function CropPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Visual Crop State in screen pixels
  const [cropRect, setCropRect] = useState<ScreenRect>({
    x: 40,
    y: 40,
    width: 480,
    height: 680,
  });

  const [cropPreset, setCropPreset] = useState<'custom' | 'margins-5' | 'margins-10' | 'header' | 'footer'>('custom');
  const [targetPagesMode, setTargetPagesMode] = useState<'all' | 'current'>('all');

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

  const handleApplyCrop = async () => {
    if (!file || !fileBuffer) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const norm = await normalizePdfInput(file, { toolName: 'Crop PDF' });
      const srcDoc = await PDFDocument.load(norm.uint8Array.slice(0));
      const firstPage = srcDoc.getPages()[0];
      const { width: pWidth, height: pHeight } = firstPage.getSize();

      let cropInput: any;

      if (cropPreset === 'margins-5') {
        cropInput = { marginPercent: 5 };
      } else if (cropPreset === 'margins-10') {
        cropInput = { marginPercent: 10 };
      } else if (cropPreset === 'header') {
        cropInput = { trimTopPercent: 15 };
      } else if (cropPreset === 'footer') {
        cropInput = { trimBottomPercent: 15 };
      } else {
        // Compute PDF coordinates from visual preview
        // Default preview canvas is roughly 595 width at zoom 1.0
        const pdfCoords = screenToPdfCoordinates(cropRect, { width: pWidth, height: pHeight }, 1.0);
        cropInput = {
          cropBox: {
            x: Math.max(0, pdfCoords.x),
            y: Math.max(0, pdfCoords.y),
            width: Math.max(20, Math.min(pdfCoords.width, pWidth)),
            height: Math.max(20, Math.min(pdfCoords.height, pHeight)),
          },
        };
      }

      const targetPages = targetPagesMode === 'all' ? undefined : [1];
      const croppedBytes = await cropPdf(norm.arrayBuffer, cropInput, targetPages);

      // Verify output
      const verifiedDoc = await PDFDocument.load(croppedBytes.slice(0));
      if (verifiedDoc.getPageCount() === 0) {
        throw new Error('Verification failed: Cropped PDF produced 0 pages.');
      }

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

  const handleReset = () => {
    setFile(null);
    setFileBuffer(null);
    setResultFiles(null);
    setErrorMessage(null);
    setCropPreset('custom');
  };

  if (resultFiles) {
    return (
      <ResultPanel
        title="PDF Cropped Successfully!"
        subtitle="Your document has been precisely trimmed with clean bounds."
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
          title="Crop PDF — Interactive Boundary Editor"
          filename={file.name}
          totalPages={totalPages}
          pdfBuffer={fileBuffer}
          mode="crop"
          cropProps={{
            rect: cropRect,
            onRectChange: setCropRect,
          }}
          onApply={handleApplyCrop}
          onReset={handleReset}
          isProcessing={isProcessing}
          applyButtonLabel="Apply Crop & Download PDF"
        >
          {/* Right Panel Controls */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                Crop Presets
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCropPreset('custom');
                    setCropRect({ x: 30, y: 30, width: 500, height: 720 });
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    cropPreset === 'custom'
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Custom Drag
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCropPreset('margins-5');
                    setCropRect({ x: 28, y: 40, width: 538, height: 760 });
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    cropPreset === 'margins-5'
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Trim 5% Margins
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCropPreset('header');
                    setCropRect({ x: 0, y: 120, width: 595, height: 722 });
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    cropPreset === 'header'
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Trim Header
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCropPreset('footer');
                    setCropRect({ x: 0, y: 0, width: 595, height: 720 });
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    cropPreset === 'footer'
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Trim Footer
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                Apply Scope
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTargetPagesMode('all')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    targetPagesMode === 'all'
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  All {totalPages} Pages
                </button>
                <button
                  type="button"
                  onClick={() => setTargetPagesMode('current')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    targetPagesMode === 'current'
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Current Page Only
                </button>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Crop Width:</span>
                <span className="font-mono font-bold">{Math.round(cropRect.width)} pt</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Crop Height:</span>
                <span className="font-mono font-bold">{Math.round(cropRect.height)} pt</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Left / Top Offset:</span>
                <span className="font-mono font-bold">
                  {Math.round(cropRect.x)}, {Math.round(cropRect.y)}
                </span>
              </div>
            </div>
          </div>
        </PdfWorkspace>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 text-center">
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <PdfDropzone
        onFilesSelected={handleFileSelected}
        title="Drop PDF to visually crop margins"
        subtitle="Live boundary box preview, draggable margins, and lossless client-side export"
        accept=".pdf,application/pdf"
      />
    </div>
  );
}
