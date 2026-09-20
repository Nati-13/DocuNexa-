'use client';

import React, { useEffect, useRef, useState } from 'react';
import { getPdfJs, getPdfJsDocumentParams } from '@/lib/pdfReader';
import { RotateCcw, RotateCw, Check } from 'lucide-react';

export interface PdfThumbnailRailProps {
  pdfBuffer: ArrayBuffer | null;
  totalPages: number;
  currentPage: number;
  onPageSelect: (pageNumber: number) => void;
  rotations?: Record<number, number>; // pageNumber (1-indexed) -> degrees (0, 90, 180, 270)
  onRotatePage?: (pageNumber: number, delta: number) => void;
  selectedPages?: number[];
  onToggleSelectPage?: (pageNumber: number) => void;
  isMultiSelectMode?: boolean;
}

interface ThumbnailItemProps {
  pdfDoc: any;
  pageNum: number;
  isActive: boolean;
  rotation: number;
  isSelected: boolean;
  isMultiSelectMode: boolean;
  onSelect: () => void;
  onToggleSelect?: () => void;
  onRotate?: (delta: number) => void;
}

const ThumbnailItem: React.FC<ThumbnailItemProps> = ({
  pdfDoc,
  pageNum,
  isActive,
  rotation,
  isSelected,
  isMultiSelectMode,
  onSelect,
  onToggleSelect,
  onRotate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Lazy loading via IntersectionObserver
  useEffect(() => {
    if (!containerRef.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '250px' }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function renderThumbnail() {
      if (!isVisible || !pdfDoc || !canvasRef.current) return;
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (isCancelled) return;

        // Render at low resolution for high performance
        const viewport = page.getViewport({ scale: 0.25 });
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!isCancelled) {
          setRendered(true);
        }
      } catch (err) {
        // Thumbnail render error ignored gracefully
      }
    }

    renderThumbnail();

    return () => {
      isCancelled = true;
    };
  }, [isVisible, pdfDoc, pageNum]);

  return (
    <div
      ref={containerRef}
      onClick={onSelect}
      className={`group relative flex flex-col items-center p-2 rounded-2xl cursor-pointer transition-all duration-150 border-2 ${
        isActive
          ? 'bg-brand-50/90 dark:bg-brand-950/40 border-brand-500 shadow-md ring-2 ring-brand-500/20'
          : isSelected
          ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-400'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Checkbox for multi-page selection */}
      {isMultiSelectMode && onToggleSelect && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-md flex items-center justify-center text-xs transition-colors shadow-xs ${
            isSelected
              ? 'bg-brand-600 text-white'
              : 'bg-white/90 dark:bg-slate-800 text-transparent border border-slate-300 dark:border-slate-600 hover:text-slate-400'
          }`}
        >
          <Check size={12} strokeWidth={3} />
        </button>
      )}

      {/* Rotation Badge */}
      {rotation !== 0 && (
        <span className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold shadow-xs">
          {rotation}°
        </span>
      )}

      {/* Canvas wrapper with visual rotation */}
      <div
        className="w-24 h-32 flex items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 transition-transform duration-200"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <canvas ref={canvasRef} className="max-w-full max-h-full object-contain shadow-2xs" />
        {!rendered && (
          <div className="w-6 h-6 border-2 border-slate-300 border-t-brand-600 rounded-full animate-spin" />
        )}
      </div>

      {/* Page Label & Quick Actions */}
      <div className="mt-2 w-full flex items-center justify-between text-xs px-1">
        <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
          Page {pageNum}
        </span>

        {onRotate && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRotate(-90);
              }}
              title="Rotate Left 90°"
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900"
            >
              <RotateCcw size={11} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRotate(90);
              }}
              title="Rotate Right 90°"
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900"
            >
              <RotateCw size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const PdfThumbnailRail: React.FC<PdfThumbnailRailProps> = ({
  pdfBuffer,
  totalPages,
  currentPage,
  onPageSelect,
  rotations = {},
  onRotatePage,
  selectedPages = [],
  onToggleSelectPage,
  isMultiSelectMode = false,
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadDoc() {
      if (!pdfBuffer) {
        setPdfDoc(null);
        return;
      }
      try {
        const pdfjs = await getPdfJs();
        const loadingTask = pdfjs.getDocument(getPdfJsDocumentParams(pdfBuffer));
        const doc = await loadingTask.promise;
        if (!isCancelled) {
          setPdfDoc(doc);
        }
      } catch (err) {
        console.error('Failed to load document for thumbnail rail:', err);
      }
    }

    loadDoc();

    return () => {
      isCancelled = true;
    };
  }, [pdfBuffer]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50/80 dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 p-3 shadow-inner">
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200 dark:border-slate-800 px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Pages ({totalPages})
        </span>
        {isMultiSelectMode && (
          <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">
            {selectedPages.length} selected
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
          <ThumbnailItem
            key={pageNum}
            pdfDoc={pdfDoc}
            pageNum={pageNum}
            isActive={currentPage === pageNum}
            rotation={rotations[pageNum] || 0}
            isSelected={selectedPages.includes(pageNum)}
            isMultiSelectMode={isMultiSelectMode}
            onSelect={() => onPageSelect(pageNum)}
            onToggleSelect={onToggleSelectPage ? () => onToggleSelectPage(pageNum) : undefined}
            onRotate={onRotatePage ? (delta) => onRotatePage(pageNum, delta) : undefined}
          />
        ))}
      </div>
    </div>
  );
};
