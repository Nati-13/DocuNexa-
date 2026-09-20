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
  Stamp,
  Sliders,
  Type,
  Palette,
  RotateCw,
  Eye,
  AlertCircle,
  Sparkles,
  Move
} from 'lucide-react';

const COLOR_PRESETS = [
  { name: 'Slate Gray', hex: '#64748b', rgb: { r: 0.39, g: 0.45, b: 0.55 } },
  { name: 'Crimson Red', hex: '#e11d48', rgb: { r: 0.88, g: 0.11, b: 0.28 } },
  { name: 'Navy Blue', hex: '#2563eb', rgb: { r: 0.15, g: 0.39, b: 0.92 } },
  { name: 'Amber Gold', hex: '#d97706', rgb: { r: 0.85, g: 0.47, b: 0.02 } },
  { name: 'Emerald Green', hex: '#059669', rgb: { r: 0.02, g: 0.59, b: 0.41 } },
  { name: 'Charcoal Black', hex: '#0f172a', rgb: { r: 0.06, g: 0.09, b: 0.16 } },
];

export function WatermarkPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Watermark parameters
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENTIAL');
  const [opacity, setOpacity] = useState<number>(0.25);
  const [rotation, setRotation] = useState<number>(45);
  const [fontSize, setFontSize] = useState<number>(48);
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  const [position, setPosition] = useState<ScreenPoint>({ x: 200, y: 350 });
  const [isCustomDragged, setIsCustomDragged] = useState<boolean>(false);
  const [pageScope, setPageScope] = useState<'all' | 'first' | 'even' | 'odd'>('all');

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
      const norm = await normalizePdfInput(selected, { toolName: 'Add Watermark' });
      const pdfjs = await getPdfJs();
      const task = pdfjs.getDocument(getPdfJsDocumentParams(norm.uint8Array.slice(0)));
      const doc = await task.promise;

      setFile(selected);
      setFileBuffer(norm.arrayBuffer);
      setTotalPages(doc.numPages);
    } catch (err: any) {
      console.error('Failed to load PDF for watermark:', err);
      setErrorMessage(err.message || 'The selected file could not be read or is corrupted.');
    }
  };

  const handleApplyWatermark = async () => {
    if (!file || !fileBuffer) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const norm = await normalizePdfInput(file, { toolName: 'Add Watermark' });
      const srcDoc = await PDFDocument.load(norm.uint8Array.slice(0));
      const firstPage = srcDoc.getPages()[0];
      const { width: pWidth, height: pHeight } = firstPage.getSize();

      let targetPages: number[] | undefined;
      const count = srcDoc.getPageCount();
      if (pageScope === 'first') {
        targetPages = [1];
      } else if (pageScope === 'even') {
        targetPages = Array.from({ length: count }, (_, i) => i + 1).filter((p) => p % 2 === 0);
      } else if (pageScope === 'odd') {
        targetPages = Array.from({ length: count }, (_, i) => i + 1).filter((p) => p % 2 !== 0);
      }

      let pdfX: number | undefined;
      let pdfY: number | undefined;

      if (isCustomDragged) {
        // Convert screen pixel position to PDF points
        const pdfCoords = screenToPdfCoordinates(
          { x: position.x, y: position.y, width: 0, height: 0 },
          { width: pWidth, height: pHeight },
          1.0
        );
        pdfX = pdfCoords.x;
        pdfY = pdfCoords.y;
      }

      const watermarkedBytes = await addWatermarkToPdf(norm.arrayBuffer, {
        text: watermarkText,
        opacity,
        rotation,
        fontSize,
        color: selectedColor.rgb,
        x: pdfX,
        y: pdfY,
        targetPages,
      });

      // Verify output
      const verifiedDoc = await PDFDocument.load(watermarkedBytes.slice(0));
      if (verifiedDoc.getPageCount() === 0) {
        throw new Error('Watermark processing failed: Document contains 0 pages.');
      }

      const outputFilename = sanitizeDownloadFilename(file.name, 'pdf', 'watermarked');

      setResultFiles([
        {
          name: outputFilename,
          bytes: watermarkedBytes,
          size: watermarkedBytes.byteLength,
        },
      ]);
    } catch (err: any) {
      console.error('Watermark error:', err);
      setErrorMessage(err.message || 'Failed to apply watermark to PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setFileBuffer(null);
    setResultFiles(null);
    setErrorMessage(null);
    setIsCustomDragged(false);
  };

  if (resultFiles) {
    return (
      <ResultPanel
        title="Watermark Applied Successfully!"
        subtitle="Your custom watermark stamp has been embedded directly into every target page."
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
          title="Add Watermark — Interactive Visual Stamping"
          filename={file.name}
          totalPages={totalPages}
          pdfBuffer={fileBuffer}
          mode="watermark"
          watermarkProps={{
            text: watermarkText,
            fontSize,
            opacity,
            rotation,
            colorHex: selectedColor.hex,
            position,
            onPositionChange: (newPos) => {
              setPosition(newPos);
              setIsCustomDragged(true);
            },
            onRotationChange: setRotation,
          }}
          onApply={handleApplyWatermark}
          onReset={handleReset}
          isProcessing={isProcessing}
          applyButtonLabel="Apply Watermark & Download PDF"
        >
          {/* Controls Side Panel */}
          <div className="space-y-4">
            {/* Watermark Text Input */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Watermark Text
              </label>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="e.g. CONFIDENTIAL, DRAFT, SAMPLE"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-brand-500 outline-hidden"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['CONFIDENTIAL', 'DRAFT', 'DO NOT COPY', 'SAMPLE'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setWatermarkText(preset)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Position Preset / Drag Notice */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Position
                </label>
                {isCustomDragged && (
                  <button
                    type="button"
                    onClick={() => {
                      setPosition({ x: 200, y: 350 });
                      setIsCustomDragged(false);
                    }}
                    className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline font-semibold"
                  >
                    Center Reset
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPosition({ x: 200, y: 350 });
                    setIsCustomDragged(false);
                  }}
                  className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all ${
                    !isCustomDragged
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Page Center
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPosition({ x: 40, y: 60 });
                    setIsCustomDragged(true);
                  }}
                  className="py-1.5 px-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  Top Left
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPosition({ x: 200, y: 680 });
                    setIsCustomDragged(true);
                  }}
                  className="py-1.5 px-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  Bottom Footer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPosition({ x: 300, y: 60 });
                    setIsCustomDragged(true);
                  }}
                  className="py-1.5 px-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  Top Right
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                <Move size={12} /> Drag the watermark directly on the document preview!
              </p>
            </div>

            {/* Opacity Slider */}
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
                min="0.05"
                max="0.9"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full accent-brand-600 cursor-pointer"
              />
            </div>

            {/* Rotation Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Rotation Angle
                </label>
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                  {rotation}°
                </span>
              </div>
              <input
                type="range"
                min="-90"
                max="90"
                step="5"
                value={rotation}
                onChange={(e) => setRotation(parseInt(e.target.value, 10))}
                className="w-full accent-brand-600 cursor-pointer"
              />
              <div className="flex gap-1.5 mt-1.5">
                {[0, 45, -45].map((ang) => (
                  <button
                    key={ang}
                    type="button"
                    onClick={() => setRotation(ang)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    {ang === 0 ? 'Horizontal (0°)' : `${ang}°`}
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
                min="16"
                max="96"
                step="4"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                className="w-full accent-brand-600 cursor-pointer"
              />
            </div>

            {/* Color Palette */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Stamp Color
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {COLOR_PRESETS.map((col) => (
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

            {/* Target Pages */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Target Pages
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'all', label: 'All Pages' },
                  { id: 'first', label: 'First Only' },
                  { id: 'even', label: 'Even Pages' },
                  { id: 'odd', label: 'Odd Pages' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPageScope(opt.id as any)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                      pageScope === opt.id
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
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
          Add Watermark to PDF
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Position, rotate, and style a custom watermark stamp directly onto your PDF pages with real-time interactive preview.
        </p>
      </div>

      <PdfDropzone
        onFilesSelected={handleFileSelected}
        accept=".pdf,application/pdf"
        title="Drop a PDF to Add Watermark"
        subtitle="Visual, draggable positioning • 100% Client-Side & Free"
      />
    </div>
  );
}
