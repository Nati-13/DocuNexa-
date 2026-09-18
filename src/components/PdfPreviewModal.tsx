'use client';

import React, { useEffect, useRef, useState } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RefreshCw, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { DetectedPart } from '@/types';
import { renderPdfPageToCanvas } from '@/lib/pdfReader';

interface PdfPreviewModalProps {
  part: DetectedPart | null;
  fileBuffer: ArrayBuffer | null;
  totalPages: number;
  onClose: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  part,
  fileBuffer,
  totalPages,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);

  const startPage = part ? Math.max(1, part.startPage) : 1;
  const endPage = part ? Math.min(totalPages, part.endPage) : totalPages;

  useEffect(() => {
    if (part) {
      setCurrentPage(startPage);
    }
  }, [part, startPage]);

  useEffect(() => {
    let isCancelled = false;

    async function renderCurrentPage() {
      if (!fileBuffer || !canvasRef.current || !part) return;

      setIsLoading(true);
      setRenderError(null);

      try {
        await renderPdfPageToCanvas(
          fileBuffer,
          currentPage,
          canvasRef.current,
          scale
        );
        if (!isCancelled) {
          setIsLoading(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Render error:', err);
          setRenderError(err.message || 'Failed to render PDF page');
          setIsLoading(false);
        }
      }
    }

    renderCurrentPage();

    return () => {
      isCancelled = true;
    };
  }, [fileBuffer, currentPage, scale, part]);

  if (!part) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center">
              <FileText className="w-5 h-5 text-indigo-600 mr-2" />
              {part.title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Assigned Range: Pages {startPage}–{endPage} ({endPage - startPage + 1} pages) • File: {part.filename}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Navigation & Zoom */}
        <div className="px-6 py-2.5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Previous / Next buttons */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={currentPage <= startPage}
              onClick={() => setCurrentPage((p) => Math.max(startPage, p - 1))}
              className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous Page
            </button>

            <span className="px-3 py-1.5 font-mono font-semibold bg-slate-100 rounded-lg text-slate-800">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= endPage}
              onClick={() => setCurrentPage((p) => Math.min(endPage, p + 1))}
              className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              Next Page
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-600 text-xs w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas Display Viewport */}
        <div className="flex-1 bg-slate-100 overflow-auto p-4 flex items-center justify-center relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center space-y-2 z-10">
              <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
              <span className="text-xs font-medium text-slate-600">Rendering Page {currentPage}...</span>
            </div>
          )}

          {renderError ? (
            <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-semibold">Unable to preview page {currentPage}</p>
                <p className="text-red-500 mt-0.5">{renderError}</p>
              </div>
            </div>
          ) : (
            <div className="shadow-lg border border-slate-300 rounded bg-white">
              <canvas ref={canvasRef} className="block max-w-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
