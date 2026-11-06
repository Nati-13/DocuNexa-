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
  AlertCircle,
  SkipBack,
  SkipForward
} from 'lucide-react';
import { DetectedPart } from '@/types';
import { renderPdfPageToCanvas } from '@/lib/pdfReader';

interface PdfPreviewModalProps {
  part: DetectedPart | null;
  fileBuffer: ArrayBuffer | null;
  totalPages: number;
  initialPage?: number;
  onClose: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  part,
  fileBuffer,
  totalPages,
  initialPage,
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
      if (initialPage && initialPage >= startPage && initialPage <= endPage) {
        setCurrentPage(initialPage);
      } else {
        setCurrentPage(startPage);
      }
    }
  }, [part, startPage, endPage, initialPage]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ink/40 animate-in fade-in duration-150">
      <div className="bg-surface rounded-md border border-border text-ink max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden shadow-subtle">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface">
          <div>
            <h3 className="font-semibold text-ink text-base sm:text-lg flex items-center">
              <FileText className="w-5 h-5 text-brand mr-2" />
              {part.title}
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Assigned Range: Pages {startPage}–{endPage} ({endPage - startPage + 1} pages) • File: {part.filename}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted hover:text-ink hover:bg-paper transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Navigation, Boundary Jumps & Zoom */}
        <div className="px-6 py-2.5 bg-paper border-b border-border flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Boundary Quick-Jump & Stepping Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(startPage)}
              className={`inline-flex items-center px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                currentPage === startPage
                  ? 'bg-brand text-brand-fg border-brand font-semibold'
                  : 'bg-surface border-border text-ink hover:bg-paper'
              }`}
              title={`Jump to first page of this unit (Page ${startPage})`}
            >
              <SkipBack className="w-3.5 h-3.5 mr-1" />
              First Page ({startPage})
            </button>

            <button
              type="button"
              disabled={currentPage <= startPage}
              onClick={() => setCurrentPage((p) => Math.max(startPage, p - 1))}
              className="inline-flex items-center px-2.5 py-1.5 rounded-md border border-border bg-surface text-ink hover:bg-paper font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 mr-0.5" />
              Prev
            </button>

            <span className="px-3 py-1.5 font-mono font-medium bg-surface border border-border rounded-md text-ink">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= endPage}
              onClick={() => setCurrentPage((p) => Math.min(endPage, p + 1))}
              className="inline-flex items-center px-2.5 py-1.5 rounded-md border border-border bg-surface text-ink hover:bg-paper font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-0.5" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage(endPage)}
              className={`inline-flex items-center px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                currentPage === endPage
                  ? 'bg-brand text-brand-fg border-brand font-semibold'
                  : 'bg-surface border-border text-ink hover:bg-paper'
              }`}
              title={`Jump to last page of this unit (Page ${endPage})`}
            >
              Last Page ({endPage})
              <SkipForward className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
              className="p-1.5 rounded-md border border-border bg-surface text-muted hover:text-ink hover:bg-paper transition-colors cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-muted text-xs w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
              className="p-1.5 rounded-md border border-border bg-surface text-muted hover:text-ink hover:bg-paper transition-colors cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas Display Viewport: Neutral paper background, authentic white document paper (no canvas color inversion) */}
        <div className="flex-1 bg-paper overflow-auto p-4 flex items-center justify-center relative">
          {isLoading && (
            <div className="absolute inset-0 bg-surface/80 flex flex-col items-center justify-center space-y-2 z-10">
              <RefreshCw className="w-6 h-6 text-brand animate-spin" />
              <span className="text-xs font-medium text-muted">Rendering Page {currentPage}...</span>
            </div>
          )}

          {renderError ? (
            <div className="p-4 bg-accent/10 border border-accent/20 rounded-md text-xs text-accent flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-semibold">Unable to preview page {currentPage}</p>
                <p className="mt-0.5">{renderError}</p>
              </div>
            </div>
          ) : (
            <div className="border border-border rounded-sm bg-white p-0.5 shadow-subtle">
              <canvas ref={canvasRef} className="block max-w-full bg-white" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
