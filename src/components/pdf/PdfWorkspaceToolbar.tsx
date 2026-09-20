'use client';

import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  RotateCw,
} from 'lucide-react';

export interface PdfWorkspaceToolbarProps {
  currentPage: number;
  totalPages: number;
  zoom: number;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
  onFitWidth?: () => void;
  onFitPage?: () => void;
  onRotateCurrentLeft?: () => void;
  onRotateCurrentRight?: () => void;
  showRotationControls?: boolean;
}

export const PdfWorkspaceToolbar: React.FC<PdfWorkspaceToolbarProps> = ({
  currentPage,
  totalPages,
  zoom,
  onPageChange,
  onZoomChange,
  onFitWidth,
  onFitPage,
  onRotateCurrentLeft,
  onRotateCurrentRight,
  showRotationControls = true,
}) => {
  const zoomPercent = Math.round(zoom * 100);

  const handleZoomOut = () => {
    onZoomChange(Math.max(0.4, Math.round((zoom - 0.15) * 100) / 100));
  };

  const handleZoomIn = () => {
    onZoomChange(Math.min(2.5, Math.round((zoom + 0.15) * 100) / 100));
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900/90 text-white rounded-2xl shadow-xl backdrop-blur-md border border-slate-700/60 select-none text-xs z-20">
      {/* Page Navigation */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous Page"
          className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-1 px-2 font-mono font-semibold">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1 && val <= totalPages) {
                onPageChange(val);
              }
            }}
            className="w-10 text-center bg-slate-800 text-white rounded px-1 py-0.5 border border-slate-700 text-xs focus:ring-1 focus:ring-brand-500 outline-hidden"
          />
          <span className="text-slate-400">/ {totalPages}</span>
        </div>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next Page"
          className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-1 border-x border-slate-700/60 px-2">
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoom <= 0.4}
          aria-label="Zoom Out"
          className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 transition-colors"
        >
          <ZoomOut size={15} />
        </button>

        <span className="w-12 text-center font-mono font-semibold text-[11px] text-slate-300">
          {zoomPercent}%
        </span>

        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoom >= 2.5}
          aria-label="Zoom In"
          className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 transition-colors"
        >
          <ZoomIn size={15} />
        </button>

        {onFitWidth && (
          <button
            type="button"
            onClick={onFitWidth}
            title="Fit to Width"
            className="px-2 py-1 rounded-lg hover:bg-slate-800 text-[11px] font-medium text-slate-300 transition-colors"
          >
            Fit Width
          </button>
        )}

        {onFitPage && (
          <button
            type="button"
            onClick={onFitPage}
            title="Fit Page"
            className="px-2 py-1 rounded-lg hover:bg-slate-800 text-[11px] font-medium text-slate-300 transition-colors"
          >
            Fit Page
          </button>
        )}
      </div>

      {/* Quick Rotation Buttons if applicable */}
      {showRotationControls && onRotateCurrentLeft && onRotateCurrentRight && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onRotateCurrentLeft}
            aria-label="Rotate Page Left 90°"
            title="Rotate Left 90°"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <RotateCcw size={15} />
          </button>

          <button
            type="button"
            onClick={onRotateCurrentRight}
            aria-label="Rotate Page Right 90°"
            title="Rotate Right 90°"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <RotateCw size={15} />
          </button>
        </div>
      )}
    </div>
  );
};
