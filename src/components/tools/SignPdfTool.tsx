'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PdfDropzone } from '@/components/common/PdfDropzone';
import { ProcessingProgress } from '@/components/common/ProcessingProgress';
import { ResultPanel, ResultFileItem } from '@/components/common/ResultPanel';
import { getPdfJs, getPdfJsDocumentParams } from '@/lib/pdfReader';
import { applySignatureToPdf } from '@/lib/pdfEngine';
import { sanitizeDownloadFilename } from '@/lib/downloadContract';
import { PDFDocument } from 'pdf-lib';
import { 
  PenTool, 
  Type, 
  Upload, 
  RotateCcw, 
  CheckCircle2, 
  FileText, 
  RefreshCw, 
  AlertCircle 
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

  // Placement
  const [placement, setPlacement] = useState<'bottom-right' | 'bottom-left' | 'center' | 'bottom-center'>('bottom-right');

  // Canvas drawing
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Processing & Results
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [resultFiles, setResultFiles] = useState<ResultFileItem[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Canvas drawing handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e293b';
  }, [signMode]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
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
      const task = pdfjs.getDocument(getPdfJsDocumentParams(buffer));
      const doc = await task.promise;

      setFile(selected);
      setFileBuffer(buffer);
      setTotalPages(doc.numPages);
      setTargetPage(doc.numPages); // default to last page for signature
    } catch (err: any) {
      console.error('Failed to load PDF for signing:', err);
      setErrorMessage('The selected file could not be read or is corrupted.');
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedSigUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const getSignatureDataUrl = (): string | null => {
    if (signMode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return null;
      return canvas.toDataURL('image/png');
    }
    if (signMode === 'type') {
      if (!typedName.trim()) return null;
      // Render typed signature to offscreen canvas
      const offscreen = document.createElement('canvas');
      offscreen.width = 400;
      offscreen.height = 120;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return null;
      ctx.font = 'italic 44px "Brush Script MT", "Segoe Script", cursive, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName, 200, 60);
      return offscreen.toDataURL('image/png');
    }
    if (signMode === 'upload') {
      return uploadedSigUrl;
    }
    return null;
  };

  const isFormValid = Boolean(
    file &&
    fileBuffer &&
    ((signMode === 'draw' && hasDrawn) ||
     (signMode === 'type' && typedName.trim().length > 0) ||
     (signMode === 'upload' && uploadedSigUrl))
  );

  const handleSignPdf = async () => {
    if (!isFormValid || !file || !fileBuffer) return;

    const signatureDataUrl = getSignatureDataUrl();
    if (!signatureDataUrl) {
      setErrorMessage('Please create or upload your signature.');
      return;
    }

    setIsProcessing(true);
    setProgress(30);
    setErrorMessage(null);

    try {
      const freshBuf = await file.arrayBuffer();
      // Calculate coordinates based on page dimensions
      const srcDoc = await PDFDocument.load(freshBuf.slice(0));
      const pages = srcDoc.getPages();
      const pageIndex = Math.max(0, Math.min(targetPage - 1, pages.length - 1));
      const targetPdfPage = pages[pageIndex];
      const { width: pageWidth, height: pageHeight } = targetPdfPage.getSize();

      const sigWidth = 160;
      const sigHeight = 60;
      let x = pageWidth - sigWidth - 50;
      let y = 60;

      if (placement === 'bottom-left') {
        x = 50;
        y = 60;
      } else if (placement === 'center') {
        x = (pageWidth - sigWidth) / 2;
        y = (pageHeight - sigHeight) / 2;
      } else if (placement === 'bottom-center') {
        x = (pageWidth - sigWidth) / 2;
        y = 60;
      }

      setProgress(60);
      const signedBytes = await applySignatureToPdf(
        freshBuf,
        signatureDataUrl,
        targetPage,
        x,
        y,
        sigWidth,
        sigHeight
      );

      setProgress(90);
      // Verify signed document
      const verifiedDoc = await PDFDocument.load(signedBytes);
      if (verifiedDoc.getPageCount() === 0) {
        throw new Error('Verification failed: Signed PDF produced 0 pages.');
      }

      setProgress(100);
      await new Promise((r) => setTimeout(r, 150));

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

  const resetAll = () => {
    setFile(null);
    setFileBuffer(null);
    setResultFiles(null);
    clearCanvas();
    setTypedName('');
    setUploadedSigUrl(null);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-8">
      {resultFiles ? (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <h4 className="font-bold text-sm sm:text-base">Document Signed Successfully!</h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Your signature has been embedded into page {targetPage} of the document.
              </p>
            </div>
          </div>
          <ResultPanel files={resultFiles} onReset={resetAll} />
        </div>
      ) : isProcessing ? (
        <ProcessingProgress progress={progress} statusText="Embedding signature into PDF document..." />
      ) : (
        <div className="space-y-8">
          {!file ? (
            <PdfDropzone
              onFilesSelected={handleFileSelected}
              accept=".pdf,application/pdf"
              multiple={false}
              title="Select PDF to Sign"
              subtitle="Upload a contract, agreement, or form to apply your signature"
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

              {/* Signature Creator */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <PenTool size={18} className="text-brand-600 dark:text-brand-400" />
                    Create Your Signature
                  </h3>

                  {/* Mode Selector */}
                  <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                    <button
                      type="button"
                      onClick={() => setSignMode('draw')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        signMode === 'draw'
                          ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <PenTool size={13} /> Draw
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignMode('type')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        signMode === 'type'
                          ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Type size={13} /> Type
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignMode('upload')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        signMode === 'upload'
                          ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Upload size={13} /> Upload
                    </button>
                  </div>
                </div>

                {/* Draw Mode */}
                {signMode === 'draw' && (
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-2 bg-slate-50 dark:bg-slate-950 flex flex-col items-center">
                      <canvas
                        ref={canvasRef}
                        width={460}
                        height={160}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full max-w-md h-40 bg-white dark:bg-slate-900 rounded-xl cursor-crosshair touch-none"
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Sign with your mouse, trackpad, or finger</span>
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="text-slate-500 hover:text-rose-500 flex items-center gap-1 font-semibold"
                      >
                        <RotateCcw size={13} /> Clear
                      </button>
                    </div>
                  </div>
                )}

                {/* Type Mode */}
                {signMode === 'type' && (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      placeholder="Type your full name..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-brand-500"
                    />
                    {typedName && (
                      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                        <span className="text-3xl italic text-slate-900 dark:text-white font-serif tracking-wide">
                          {typedName}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Upload Mode */}
                {signMode === 'upload' && (
                  <div className="space-y-3">
                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-brand-500">
                      <Upload size={24} className="text-slate-400 mb-2" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Upload signature image (PNG or JPG)
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        onChange={handleSignatureUpload}
                        className="hidden"
                      />
                    </label>
                    {uploadedSigUrl && (
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex justify-center">
                        <img src={uploadedSigUrl} alt="Signature preview" className="max-h-20 object-contain" />
                      </div>
                    )}
                  </div>
                )}

                {/* Placement & Target Page */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Target Page
                    </label>
                    <select
                      value={targetPage}
                      onChange={(e) => setTargetPage(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium"
                    >
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <option key={p} value={p}>
                          Page {p} {p === totalPages ? '(Last Page)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Position on Page
                    </label>
                    <select
                      value={placement}
                      onChange={(e) => setPlacement(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium"
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-center">Bottom Center</option>
                      <option value="center">Center</option>
                    </select>
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Sign Action Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={!isFormValid || isProcessing}
                    onClick={handleSignPdf}
                    className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                      isFormValid
                        ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/25 cursor-pointer transform hover:-translate-y-0.5'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <PenTool size={18} />
                    <span>Apply Signature to PDF</span>
                  </button>

                  {!isFormValid && (
                    <p className="text-center text-[11px] text-slate-600 dark:text-slate-300 mt-2">
                      Please draw, type, or upload your signature to enable signing
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
