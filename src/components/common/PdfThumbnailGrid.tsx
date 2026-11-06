'use client';

import React, { useEffect, useRef, useState } from 'react';
import { getPdfJs, getPdfJsDocumentParams } from '@/lib/pdfReader';
import { Check, RotateCw, Trash2 } from 'lucide-react';

interface PageThumbnailItem {
  pageNumber: number; // 1-indexed
  rotation?: number; // 0, 90, 180, 270
}

interface PdfThumbnailGridProps {
  fileBuffer: ArrayBuffer;
  totalPages: number;
  selectedPages?: number[];
  onTogglePage?: (pageNumber: number) => void;
  onRotatePage?: (pageNumber: number) => void;
  onDeletePage?: (pageNumber: number) => void;
  actionType?: 'select' | 'organize' | 'view';
}

export const PdfThumbnailGrid: React.FC<PdfThumbnailGridProps> = ({
  fileBuffer,
  totalPages,
  selectedPages = [],
  onTogglePage,
  onRotatePage,
  onDeletePage,
  actionType = 'select',
}) => {
  const [renderedThumbnails, setRenderedThumbnails] = useState<Record<number, string>>({});
  const selectedSet = new Set(selectedPages);

  useEffect(() => {
    let isCancelled = false;

    async function loadThumbnails() {
      try {
        const pdfjs = await getPdfJs();
        const loadingTask = pdfjs.getDocument(getPdfJsDocumentParams(fileBuffer));
        const pdfDoc = await loadingTask.promise;

        const maxPages = Math.min(totalPages, 50); // limit batch rendering for speed
        for (let p = 1; p <= maxPages; p++) {
          if (isCancelled) break;
          const page = await pdfDoc.getPage(p);
          const viewport = page.getViewport({ scale: 0.35 });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            if (!isCancelled) {
              setRenderedThumbnails((prev) => ({ ...prev, [p]: dataUrl }));
            }
          }
        }
      } catch (err) {
        console.error('Thumbnail generation error:', err);
      }
    }

    if (fileBuffer && fileBuffer.byteLength > 0) {
      loadThumbnails();
    }

    return () => {
      isCancelled = true;
    };
  }, [fileBuffer, totalPages]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4 max-h-[520px] overflow-y-auto rounded-md bg-slate-100/70 dark:bg-slate-800/40 border border-border/60">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
        const isSelected = selectedSet.has(pageNum);
        const thumbUrl = renderedThumbnails[pageNum];

        return (
          <div
            key={pageNum}
            onClick={() => onTogglePage && onTogglePage(pageNum)}
            className={`group relative flex flex-col items-center rounded-md p-2.5 transition-all cursor-pointer ${
              isSelected
                ? 'bg-brand/10 border-2 border-brand shadow-subtle scale-[1.02]'
                : 'bg-surface border border-border hover:border-brand/40 shadow-subtle'
            }`}
          >
            {/* Thumbnail Canvas / Image: authentic white document sheet */}
            <div className="relative w-full aspect-[3/4] bg-white rounded-md overflow-hidden flex items-center justify-center border border-border/50">
              {thumbUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={thumbUrl}
                  alt={`Page ${pageNum}`}
                  className="w-full h-full object-contain pointer-events-none"
                />
              ) : (
                <span className="text-xs text-muted font-mono">P.{pageNum}</span>
              )}

              {/* Selection Checkmark Badge */}
              {actionType === 'select' && (
                <div
                  className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-transform ${
                    isSelected
                      ? 'bg-brand text-brand-fg shadow-subtle scale-100'
                      : 'bg-paper border border-border text-transparent opacity-0 group-hover:opacity-100 scale-90'
                  }`}
                >
                  <Check size={14} />
                </div>
              )}

              {/* Organize Controls */}
              {actionType === 'organize' && (
                <div className="absolute inset-x-0 bottom-0 p-1.5 bg-ink/70 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onRotatePage && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRotatePage(pageNum);
                      }}
                      title="Rotate Page"
                      className="p-1 rounded-md bg-surface text-ink hover:bg-paper transition-colors"
                    >
                      <RotateCw size={13} />
                    </button>
                  )}
                  {onDeletePage && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePage(pageNum);
                      }}
                      title="Delete Page"
                      className="p-1 rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Page Number Label */}
            <span className="mt-2 text-xs font-semibold text-ink">
              Page {pageNum}
            </span>
          </div>
        );
      })}
    </div>
  );
};
