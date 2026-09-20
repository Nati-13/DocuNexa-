'use client';

import React, { useState } from 'react';
import { PdfDropzone } from '@/components/common/PdfDropzone';
import { ResultPanel, ResultFileItem } from '@/components/common/ResultPanel';
import { getPdfJs, getPdfJsDocumentParams } from '@/lib/pdfReader';
import { addWatermarkToPdf } from '@/lib/pdfEngine';
import { sanitizeDownloadFilename } from '@/lib/downloadContract';
import { screenToPdfCoordinates, ScreenPoint } from '@/lib/pdfCoordinates';
import { PDFDocument } from 'pdf-lib';
import { normalizePdfInput } from '@/lib/pdfInputNormalizer';
import { PdfWorkspace } from '@/components/pdf/PdfWorkspace';
import {
  Type,
  Sliders,
  Move,
  AlertCircle,
  Sparkles,
  FileText,
  AlignLeft,
  Check
} from 'lucide-react';

const ANNOTATION_COLORS = [
  { name: 'Pitch Black', hex: '#0f172a', rgb: { r: 0.06, g: 0.09, b: 0.16 } },
  { name: 'Royal Blue', hex: '#2563eb', rgb: { r: 0.15, g: 0.39, b: 0.92 } },
  { name: 'Ruby Red', hex: '#dc2626', rgb: { r: 0.86, g: 0.15, b: 0.15 } },
  { name: 'Emerald Green', hex: '#059669', rgb: { r: 0.02, g: 0.59, b: 0.41 } },
  { name: 'Amber Orange', hex: '#d97706', rgb: { r: 0.85, g: 0.47, b: 0.02 } },
  { name: 'Purple Violet', hex: '#7c3aed', rgb: { r: 0.49, g: 0.23, b: 0.93 } },
];

export function EditPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Annotation text parameters
  const [annotationText, setAnnotationText] = useState<string>('Approved by DocuNexa');
  const [fontSize, setFontSize] = useState<number>(18);
  const [opacity, setOpacity] = useState<number>(1.0);
  const [selectedColor, setSelectedColor] = useState(ANNOTATION_COLORS[0]);
  const [position, setPosition] = useState<ScreenPoint>({ x: 100, y: 150 });
  const [pageScope, setPageScope] = useState<'current' | 'all'>('current');

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
      const norm = await normalizePdfInput(selected, { toolName: 'Edit PDF' });
      const pdfjs = await getPdfJs();
      const task = pdfjs.getDocument(getPdfJsDocumentParams(norm.uint8Array.slice(0)));
      const doc = await task.promise;

      setFile(selected);
      setFileBuffer(norm.arrayBuffer);
      setTotalPages(doc.numPages);
    } catch (err: any) {
      console.error('Failed to load PDF for editing:', err);
      setErrorMessage(err.message || 'The selected file could not be read or is corrupted.');
    }
  };

  const handleApplyAnnotation = async () => {
    if (!file || !fileBuffer) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const norm = await normalizePdfInput(file, { toolName: 'Edit PDF' });
      const srcDoc = await PDFDocument.load(norm.uint8Array.slice(0));
      const firstPage = srcDoc.getPages()[0];
      const { width: pWidth, height: pHeight } = firstPage.getSize();

      const pdfCoords = screenToPdfCoordinates(
        { x: position.x, y: position.y, width: 0, height: 0 },
        { width: pWidth, height: pHeight },
        1.0
      );

      const targetPages = pageScope === 'current' ? [1] : undefined;

      const editedBytes = await addWatermarkToPdf(norm.arrayBuffer, {
        text: annotationText,
        opacity,
        rotation: 0, // Horizontal text for annotation
        fontSize,
        color: selectedColor.rgb,
        x: pdfCoords.x,
        y: pdfCoords.y,
        targetPages,
      });

      // Verify output
      const verifiedDoc = await PDFDocument.load(editedBytes.slice(0));
      if (verifiedDoc.getPageCount() === 0) {
        throw new Error('Edit processing failed: Output document contains 0 pages.');
      }

      const outputFilename = sanitizeDownloadFilename(file.name, 'pdf', 'edited');

      setResultFiles([
        {
          name: outputFilename,
          bytes: editedBytes,
          size: editedBytes.byteLength,
        },
      ]);
    } catch (err: any) {
      console.error('Edit PDF error:', err);
      setErrorMessage(err.message || 'Failed to edit PDF document.');
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
        title="PDF Edited Successfully!"
        subtitle="Your text annotations have been permanently embedded onto the document."
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
          title="Edit PDF — Visual Text Annotation"
          filename={file.name}
          totalPages={totalPages}
          pdfBuffer={fileBuffer}
          mode="watermark"
          watermarkProps={{
            text: annotationText,
            fontSize,
            opacity,
            rotation: 0,
            colorHex: selectedColor.hex,
            position,
            onPositionChange: setPosition,
          }}
          onApply={handleApplyAnnotation}
          onReset={handleReset}
          isProcessing={isProcessing}
          applyButtonLabel="Apply Text & Download PDF"
        >
          {/* Side Panel Controls */}
          <div className="space-y-4">
            {/* Annotation Text Input */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Annotation Text
              </label>
              <textarea
                value={annotationText}
                onChange={(e) => setAnnotationText(e.target.value)}
                placeholder="Type text to place onto the document..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-brand-500 outline-hidden"
              />
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <Move size={12} /> Drag the text box anywhere directly on the PDF!
              </p>
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
                min="10"
                max="48"
                step="2"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                className="w-full accent-brand-600 cursor-pointer"
              />
            </div>

            {/* Opacity */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Opacity
                </label>
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                  {Math.round(opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.1"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full accent-brand-600 cursor-pointer"
              />
            </div>

            {/* Color Palette */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Text Color
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {ANNOTATION_COLORS.map((col) => (
                  <button
                    key={col.name}
                    type="button"
                    onClick={() => setSelectedColor(col)}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      selectedColor.name === col.name
                        ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/20"
                      style={{ backgroundColor: col.hex }}
                    />
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                      {col.name.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Page Scope */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Apply Text To
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPageScope('current')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    pageScope === 'current'
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Current Page Only
                </button>
                <button
                  type="button"
                  onClick={() => setPageScope('all')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    pageScope === 'all'
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  All {totalPages} Pages
                </button>
              </div>
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
          Edit PDF — Add Text & Annotations
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Type and visually drag text, comments, or headers onto your PDF pages with exact coordinate precision.
        </p>
      </div>

      <PdfDropzone
        onFilesSelected={handleFileSelected}
        accept=".pdf,application/pdf"
        title="Drop a PDF to Edit"
        subtitle="Draggable text stamps • Live canvas preview • 100% Client-Side & Free"
      />
    </div>
  );
}
