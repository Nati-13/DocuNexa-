'use client';

import React, { useEffect, useRef, useState } from 'react';
import { getPdfJs, getPdfJsDocumentParams } from '@/lib/pdfReader';
import { PageDimensions } from '@/lib/pdfCoordinates';
import { PdfOverlayLayer, PdfOverlayLayerProps } from './PdfOverlayLayer';
import { AlertCircle, RefreshCw } from 'lucide-react';

export interface PdfPageViewerProps {
  pdfBuffer: ArrayBuffer | null;
  currentPage: number;
  scale: number;
  rotation?: number; // visual page rotation in degrees
  mode?: PdfOverlayLayerProps['mode'];
  watermarkProps?: PdfOverlayLayerProps['watermarkProps'];
  cropProps?: PdfOverlayLayerProps['cropProps'];
  signatureProps?: PdfOverlayLayerProps['signatureProps'];
  pageNumberProps?: PdfOverlayLayerProps['pageNumberProps'];
  formWidgets?: PdfOverlayLayerProps['formWidgets'];
  onPageDimensionsLoaded?: (dims: PageDimensions) => void;
}

export const PdfPageViewer: React.FC<PdfPageViewerProps> = ({
  pdfBuffer,
  currentPage,
  scale,
  rotation = 0,
  mode = 'none',
  watermarkProps,
  cropProps,
  signatureProps,
  pageNumberProps,
  formWidgets,
  onPageDimensionsLoaded,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [pageDims, setPageDims] = useState<PageDimensions>({ width: 595, height: 842, rotation: 0 });

  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    let isCancelled = false;

    async function renderPage() {
      if (!pdfBuffer || !canvasRef.current) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      // Cancel ongoing render if any
      if (renderTaskRef.current && typeof renderTaskRef.current.cancel === 'function') {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }

      try {
        const pdfjs = await getPdfJs();
        const loadingTask = pdfjs.getDocument(getPdfJsDocumentParams(pdfBuffer));
        const pdfDoc = await loadingTask.promise;
        if (isCancelled) return;

        const safePageNum = Math.max(1, Math.min(currentPage, pdfDoc.numPages));
        const page = await pdfDoc.getPage(safePageNum);
        if (isCancelled) return;

        // Unrotated native dimensions in points
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const dims: PageDimensions = {
          width: unscaledViewport.width,
          height: unscaledViewport.height,
          rotation: page.rotate || 0,
        };
        setPageDims(dims);
        onPageDimensionsLoaded?.(dims);

        // Compute viewport with visual rotation applied
        const effectiveRotation = ((page.rotate || 0) + (rotation || 0) + 360) % 360;
        const viewport = page.getViewport({ scale, rotation: effectiveRotation });

        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        setCanvasDimensions({ width: viewport.width, height: viewport.height });

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const renderContext = {
          canvasContext: ctx,
          viewport,
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;

        if (!isCancelled) {
          setIsLoading(false);
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException' && !isCancelled) {
          console.error('Page render error:', err);
          setError(err.message || 'Failed to render PDF page');
          setIsLoading(false);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current && typeof renderTaskRef.current.cancel === 'function') {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfBuffer, currentPage, scale, rotation]);

  return (
    <div className="relative flex items-center justify-center p-4 sm:p-8 min-h-[400px] w-full overflow-auto">
      {/* Canvas and Overlay Container */}
      <div
        className="relative shadow-2xl rounded-lg bg-white overflow-hidden transition-all duration-150"
        style={{
          width: canvasDimensions.width || 'auto',
          height: canvasDimensions.height || 'auto',
        }}
      >
        <canvas ref={canvasRef} className="block mx-auto max-w-none" />

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-xs text-white z-20 transition-opacity">
            <RefreshCw size={28} className="animate-spin text-brand-400 mb-2" />
            <span className="text-xs font-semibold tracking-wide">Rendering Page {currentPage}...</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-950/80 text-white p-6 z-20 text-center">
            <AlertCircle size={32} className="text-rose-400 mb-2" />
            <p className="text-xs font-semibold max-w-xs">{error}</p>
          </div>
        )}

        {/* Interactive Overlay Layer */}
        {!isLoading && !error && canvasDimensions.width > 0 && (
          <PdfOverlayLayer
            canvasWidth={canvasDimensions.width}
            canvasHeight={canvasDimensions.height}
            pageDimensions={pageDims}
            scale={scale}
            rotation={rotation}
            mode={mode}
            watermarkProps={watermarkProps}
            cropProps={cropProps}
            signatureProps={signatureProps}
            pageNumberProps={pageNumberProps}
            formWidgets={formWidgets}
          />
        )}
      </div>
    </div>
  );
};
