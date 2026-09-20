'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PdfDropzone } from '@/components/common/PdfDropzone';
import { ResultPanel, ResultFileItem } from '@/components/common/ResultPanel';
import { getPdfJs, getPdfJsDocumentParams } from '@/lib/pdfReader';
import { applySignatureToPdf } from '@/lib/pdfEngine';
import { sanitizeDownloadFilename } from '@/lib/downloadContract';
import { screenToPdfCoordinates, ScreenRect } from '@/lib/pdfCoordinates';
import { PDFDocument } from 'pdf-lib';
import { PdfWorkspace } from '@/components/pdf/PdfWorkspace';
import {
  PenTool,
  Type,
  Upload,
  RotateCcw,
  CheckCircle2,
  FileText,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export function SignPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [targetPage, setTargetPage] = useState<number>(1);

  // Signature mode: draw, type, upload
  const [signMode, setSignMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedName, setTypedName] = useState<string>('');
  const [uploadedSigUrl, setUploadedSigUrl] = useState<string | null>(null);

  // Signature placement rect on screen pixels
  const [sigRect, setSigRect] = useState<ScreenRect>({
    x: 350,
    y: 650,
    width: 180,
    height: 70,
  });

  // Canvas drawing
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Processing & Results
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultFiles, setResultFiles] = useState<ResultFileItem[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize canvas drawing settings
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
  }, [signMode]);

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setErrorMessage(null);
    setResultFiles(null);

    try {
      const buffer = await selected.arrayBuffer();
      const pdfjs = await getPdfJs();
      const task = pdfjs.getDocument(getPdfJsDocumentParams(buffer.slice(0)));
      const doc = await task.promise;

      setFile(selected);
      setFileBuffer(buffer);
      setTotalPages(doc.numPages);
      setTargetPage(doc.numPages); // Default to last page for signature
    } catch (err: any) {
      console.error('Failed to load PDF for signing:', err);
      setErrorMessage('The selected file could not be read or is corrupted.');
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedSigUrl(event.target?.result as string);
    };
    reader.readAsDataURL(uploaded);
  };

  const getSignatureDataUrl = (): string | null => {
    if (signMode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return null;
      return canvas.toDataURL('image/png');
    }

    if (signMode === 'upload') {
      return uploadedSigUrl;
    }

    if (signMode === 'type') {
      if (!typedName.trim()) return null;
      const offCanvas = document.createElement('canvas');
      offCanvas.width = 400;
      offCanvas.height = 160;
      const ctx = offCanvas.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = 'transparent';
      ctx.fillRect(0, 0, offCanvas.width, offCanvas.height);
      ctx.font = 'italic bold 44px "Brush Script MT", cursive, Georgia, serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName.trim(), offCanvas.width / 2, offCanvas.height / 2);

      return offCanvas.toDataURL('image/png');
    }

    return null;
  };

  const activeSigDataUrl = getSignatureDataUrl();
  const isSignatureReady = Boolean(activeSigDataUrl);

  const handleApplySignature = async () => {
    if (!file || !fileBuffer || !activeSigDataUrl) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const srcDoc = await PDFDocument.load(fileBuffer.slice(0));
      const pageIndex = Math.max(0, Math.min(targetPage - 1, srcDoc.getPageCount() - 1));
      const page = srcDoc.getPages()[pageIndex];
      const { width: pWidth, height: pHeight } = page.getSize();

      // Convert visual preview screen coordinates to target PDF coordinates
      const pdfCoords = screenToPdfCoordinates(sigRect, { width: pWidth, height: pHeight }, 1.0);

      const signedBytes = await applySignatureToPdf(
        fileBuffer,
        activeSigDataUrl,
        targetPage,
        Math.max(10, Math.min(pdfCoords.x, pWidth - 60)),
        Math.max(10, Math.min(pdfCoords.y, pHeight - 40)),
        Math.max(40, Math.min(pdfCoords.width, pWidth)),
        Math.max(20, Math.min(pdfCoords.height, pHeight))
      );

      const outputFilename = sanitizeDownloadFilename(file.name, 'pdf', 'signed');

      setResultFiles([
        {
          name: outputFilename,
          bytes: signedBytes,
          size: signedBytes.byteLength,
        },
      ]);
    } catch (err: any) {
      console.error('Signing error:', err);
      setErrorMessage(err.message || 'Failed to apply signature to PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setFileBuffer(null);
    setResultFiles(null);
    setErrorMessage(null);
    setUploadedSigUrl(null);
    setTypedName('');
    clearCanvas();
  };

  if (resultFiles) {
    return (
      <ResultPanel
        title="PDF Signed Successfully!"
        subtitle="Your signature appearance has been placed precisely on the document."
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
          title="Sign PDF — Document-First Placement"
          filename={file.name}
          totalPages={totalPages}
          pdfBuffer={fileBuffer}
          mode="signature"
          signatureProps={{
            signatureDataUrl: activeSigDataUrl || undefined,
            typedText: typedName || undefined,
            rect: sigRect,
            onRectChange: setSigRect,
          }}
          onApply={handleApplySignature}
          onReset={handleReset}
          isProcessing={isProcessing}
          applyButtonLabel="Stamp Signature & Download PDF"
          disabledApplyReason={!isSignatureReady ? 'Please create a signature first (draw, type, or upload)' : undefined}
        >
          {/* Right Panel Controls */}
          <div className="space-y-4">
            {/* Signature Creation Tabs */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
              <button
                type="button"
                onClick={() => setSignMode('draw')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  signMode === 'draw'
                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <PenTool size={13} />
                <span>Draw</span>
              </button>
              <button
                type="button"
                onClick={() => setSignMode('type')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  signMode === 'type'
                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Type size={13} />
                <span>Type</span>
              </button>
              <button
                type="button"
                onClick={() => setSignMode('upload')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  signMode === 'upload'
                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Upload size={13} />
                <span>Upload</span>
              </button>
            </div>

            {/* Mode 1: DRAW CANVAS */}
            {signMode === 'draw' && (
              <div className="space-y-2">
                <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-inner touch-none">
                  <canvas
                    ref={canvasRef}
                    width={320}
                    height={120}
                    onPointerDown={startDrawing}
                    onPointerMove={draw}
                    onPointerUp={stopDrawing}
                    className="w-full h-[120px] cursor-crosshair block"
                  />
                  {!hasDrawn && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-slate-400 font-medium">
                      Draw your signature here
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Clear Drawing
                </button>
              </div>
            )}

            {/* Mode 2: TYPE */}
            {signMode === 'type' && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Type your full name..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500 outline-hidden"
                />
                {typedName && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center font-serif italic text-xl text-slate-900 dark:text-white">
                    {typedName}
                  </div>
                )}
              </div>
            )}

            {/* Mode 3: UPLOAD */}
            {signMode === 'upload' && (
              <div className="space-y-2">
                <label className="block p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center cursor-pointer hover:border-brand-500 transition-colors">
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={handleSignatureUpload}
                    className="hidden"
                  />
                  <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                    Upload Signature Image (PNG/JPG)
                  </span>
                </label>
                {uploadedSigUrl && (
                  <div className="h-16 flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-xl p-2 border border-slate-200 dark:border-slate-700">
                    <img src={uploadedSigUrl} alt="Signature preview" className="max-h-full object-contain" />
                  </div>
                )}
              </div>
            )}

            {/* Page Selector for Signature Target */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Target Page
              </label>
              <select
                value={targetPage}
                onChange={(e) => setTargetPage(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p}>
                    Page {p} {p === totalPages ? '(Last Page)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-[11px] text-indigo-900 dark:text-indigo-200 space-y-1">
              <span className="font-bold block">💡 Drag to Position:</span>
              <p>
                Click and drag the signature box on the document preview to position it exactly above the signature line.
              </p>
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
        title="Drop PDF to sign"
        subtitle="Visual drag-and-drop signing, custom drawn or typed signatures, 100% client-side"
        accept=".pdf,application/pdf"
      />
    </div>
  );
}
