'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  SkipForward,
  RotateCcw
} from 'lucide-react';
import { DetectedPart } from '@/types';
import { renderPdfPageToCanvas, cancelActiveCanvasRender, getPdfJs, getPdfJsDocumentParams } from '@/lib/pdfReader';

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
  const pdfDocRef = useRef<any>(null);
  const currentBufferRef = useRef<ArrayBuffer | null>(null);
  const renderSeqRef = useRef<number>(0);
  const activeAbortRef = useRef<AbortController | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState<number>(0);

  const startPage = part ? Math.max(1, part.startPage) : 1;
  const endPage = part ? Math.min(totalPages, part.endPage) : totalPages;

  // Initialize or update current page when part/initialPage changes
  useEffect(() => {
    if (part) {
      if (initialPage && initialPage >= startPage && initialPage <= endPage) {
        setCurrentPage(initialPage);
      } else {
        setCurrentPage(startPage);
      }
    }
  }, [part, startPage, endPage, initialPage]);

  // Handle PDF document instance caching & cleanup when fileBuffer changes or unmounts
  useEffect(() => {
    if (currentBufferRef.current !== fileBuffer) {
      if (pdfDocRef.current) {
        try {
          pdfDocRef.current.destroy();
        } catch {
          // ignore cleanup error
        }
        pdfDocRef.current = null;
      }
      currentBufferRef.current = fileBuffer;
    }

    return () => {
      if (pdfDocRef.current) {
        try {
          pdfDocRef.current.destroy();
        } catch {
          // ignore cleanup error
        }
        pdfDocRef.current = null;
      }
    };
  }, [fileBuffer]);

  // Main render lifecycle effect
  useEffect(() => {
    let isCancelled = false;
    const seq = ++renderSeqRef.current;

    // Abort prior in-flight controller
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
    }
    const abortController = new AbortController();
    activeAbortRef.current = abortController;

    async function executeRender() {
      if (!fileBuffer || !canvasRef.current || !part) return;

      setIsLoading(true);
      setRenderError(null);

      try {
        // 1. Ensure active canvas operations from previous renders are cancelled
        if (canvasRef.current) {
          await cancelActiveCanvasRender(canvasRef.current);
        }

        if (isCancelled || abortController.signal.aborted) {
          return;
        }

        // 2. Ensure pdfDoc is ready
        let doc = pdfDocRef.current;
        if (!doc) {
          const pdfjs = await getPdfJs();
          const loadingTask = pdfjs.getDocument(getPdfJsDocumentParams(fileBuffer));
          doc = await loadingTask.promise;
          if (isCancelled || abortController.signal.aborted) {
            try {
              await doc.destroy();
            } catch {
              // ignore
            }
            return;
          }
          pdfDocRef.current = doc;
        }

        if (isCancelled || !canvasRef.current || abortController.signal.aborted) {
          return;
        }

        // 3. Render page cleanly with signal
        await renderPdfPageToCanvas(
          doc,
          currentPage,
          canvasRef.current,
          {
            scale,
            signal: abortController.signal,
          }
        );

        if (!isCancelled && renderSeqRef.current === seq) {
          setIsLoading(false);
          setRenderError(null);
        }
      } catch (err: any) {
        if (
          err?.name === 'RenderingCancelledException' ||
          err?.message?.includes('Rendering cancelled') ||
          abortController.signal.aborted ||
          isCancelled
        ) {
          // Normal cancellation, suppress error
          return;
        }

        if (!isCancelled && renderSeqRef.current === seq) {
          console.error(`Preview render error on page ${currentPage}:`, err);
          setRenderError(err?.message || 'Failed to render PDF page. You can retry below.');
          setIsLoading(false);
        }
      }
    }

    const currentCanvas = canvasRef.current;

    executeRender();

    return () => {
      isCancelled = true;
      abortController.abort();
      if (currentCanvas) {
        cancelActiveCanvasRender(currentCanvas).catch(() => {});
      }
    };
  }, [fileBuffer, currentPage, scale, part, retryNonce]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        setCurrentPage((p) => Math.max(startPage, p - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentPage((p) => Math.min(endPage, p + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startPage, endPage, onClose]);

  const handleRetry = useCallback(() => {
    setRenderError(null);
    setRetryNonce((n) => n + 1);
  }, []);

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

        {/* Canvas Display Viewport: Neutral paper background */}
        <div className="flex-1 bg-paper overflow-auto p-4 flex items-center justify-center relative">
          {isLoading && (
            <div className="absolute inset-0 bg-surface/80 flex flex-col items-center justify-center space-y-2 z-10">
              <RefreshCw className="w-6 h-6 text-brand animate-spin" />
              <span className="text-xs font-medium text-muted">Rendering Page {currentPage}...</span>
            </div>
          )}

          {renderError && (
            <div className="p-4 bg-accent/10 border border-accent/20 rounded-md text-xs text-accent flex flex-col items-center max-w-md mx-auto space-y-3 z-10">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 shrink-0 text-accent" />
                <p className="font-semibold text-sm">Unable to preview page {currentPage}</p>
              </div>
              <p className="text-muted text-center break-words">{renderError}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center px-3 py-1.5 rounded-md bg-brand text-brand-fg font-medium hover:opacity-90 transition-opacity cursor-pointer shadow-xs text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Retry Page {currentPage}
              </button>
            </div>
          )}

          {/* Canvas container: always keep canvas mounted so canvasRef.current is ready */}
          <div className={`border border-border rounded-sm bg-white p-0.5 shadow-subtle ${renderError ? 'hidden' : 'block'}`}>
            <canvas ref={canvasRef} className="block max-w-full bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
};
