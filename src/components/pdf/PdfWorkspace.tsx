'use client';

import React, { useState } from 'react';
import { PdfThumbnailRail } from './PdfThumbnailRail';
import { PdfPageViewer } from './PdfPageViewer';
import { PdfWorkspaceToolbar } from './PdfWorkspaceToolbar';
import { PageDimensions } from '@/lib/pdfCoordinates';
import { PdfOverlayLayerProps } from './PdfOverlayLayer';
import { Sparkles, ArrowRight, RotateCcw, FileText } from 'lucide-react';

export interface PdfWorkspaceProps {
  title: string;
  subtitle?: string;
  pdfBuffer: ArrayBuffer | null;
  filename?: string;
  totalPages: number;
  mode?: PdfOverlayLayerProps['mode'];
  watermarkProps?: PdfOverlayLayerProps['watermarkProps'];
  cropProps?: PdfOverlayLayerProps['cropProps'];
  signatureProps?: PdfOverlayLayerProps['signatureProps'];
  pageNumberProps?: PdfOverlayLayerProps['pageNumberProps'];
  formWidgets?: PdfOverlayLayerProps['formWidgets'];
  rotations?: Record<number, number>;
  onRotatePage?: (page: number, delta: number) => void;
  selectedPages?: number[];
  onToggleSelectPage?: (page: number) => void;
  isMultiSelectMode?: boolean;
  onApply: () => void;
  onReset: () => void;
  isProcessing?: boolean;
  applyButtonLabel?: string;
  disabledApplyReason?: string;
  showThumbnailRail?: boolean;
  children: React.ReactNode; // Tool-specific controls
}

export const PdfWorkspace: React.FC<PdfWorkspaceProps> = ({
  title,
  subtitle,
  pdfBuffer,
  filename = 'document.pdf',
  totalPages,
  mode = 'none',
  watermarkProps,
  cropProps,
  signatureProps,
  pageNumberProps,
  formWidgets,
  rotations = {},
  onRotatePage,
  selectedPages,
  onToggleSelectPage,
  isMultiSelectMode = false,
  onApply,
  onReset,
  isProcessing = false,
  applyButtonLabel = 'Apply & Export PDF',
  disabledApplyReason,
  showThumbnailRail = true,
  children,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1.0);
  const [pageDims, setPageDims] = useState<PageDimensions>({ width: 595, height: 842 });

  const currentRotation = rotations[currentPage] || 0;

  const handleRotateCurrentLeft = () => {
    onRotatePage?.(currentPage, -90);
  };

  const handleRotateCurrentRight = () => {
    onRotatePage?.(currentPage, 90);
  };

  const handleFitWidth = () => {
    setZoom(1.2);
  };

  const handleFitPage = () => {
    setZoom(0.85);
  };

  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Document Workspace Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 shadow-inner">
            <FileText size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">{title}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
              <span className="truncate">{filename}</span>
              <span>•</span>
              <span>{totalPages} page(s)</span>
              {currentRotation !== 0 && (
                <span className="text-amber-500 font-bold">({currentRotation}° rotated)</span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
        >
          <RotateCcw size={13} />
          <span>Change Document</span>
        </button>
      </div>

      {/* Main Workspace Stage */}
      {/* Desktop: 3-column layout. Mobile: stacked controls -> preview -> thumbnails -> apply */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: Page Thumbnails Rail (Desktop) */}
        {showThumbnailRail && totalPages > 0 && (
          <div className="hidden lg:block lg:col-span-3 xl:col-span-2 h-[680px]">
            <PdfThumbnailRail
              pdfBuffer={pdfBuffer}
              totalPages={totalPages}
              currentPage={currentPage}
              onPageSelect={setCurrentPage}
              rotations={rotations}
              onRotatePage={onRotatePage}
              selectedPages={selectedPages}
              onToggleSelectPage={onToggleSelectPage}
              isMultiSelectMode={isMultiSelectMode}
            />
          </div>
        )}

        {/* CENTER COLUMN: Central Large Page Preview Stage */}
        <div
          className={`flex flex-col gap-3 ${
            showThumbnailRail && totalPages > 0
              ? 'lg:col-span-6 xl:col-span-7'
              : 'lg:col-span-8'
          }`}
        >
          {/* Toolbar */}
          <PdfWorkspaceToolbar
            currentPage={currentPage}
            totalPages={totalPages}
            zoom={zoom}
            onPageChange={setCurrentPage}
            onZoomChange={setZoom}
            onFitWidth={handleFitWidth}
            onFitPage={handleFitPage}
            onRotateCurrentLeft={onRotatePage ? handleRotateCurrentLeft : undefined}
            onRotateCurrentRight={onRotatePage ? handleRotateCurrentRight : undefined}
            showRotationControls={Boolean(onRotatePage)}
          />

          {/* Canvas Viewer with Interactive Overlays */}
          <div className="h-[620px] rounded-3xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 shadow-inner overflow-auto flex items-center justify-center relative scrollbar-thin">
            <PdfPageViewer
              pdfBuffer={pdfBuffer}
              currentPage={currentPage}
              scale={zoom}
              rotation={currentRotation}
              mode={mode}
              watermarkProps={watermarkProps}
              cropProps={cropProps}
              signatureProps={signatureProps}
              pageNumberProps={pageNumberProps}
              formWidgets={formWidgets}
              onPageDimensionsLoaded={setPageDims}
            />
          </div>

          {/* Mobile Thumbnail Selector (Horizontal scroll under preview) */}
          {showThumbnailRail && totalPages > 1 && (
            <div className="block lg:hidden overflow-x-auto py-2 px-1">
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 transition-all ${
                      currentPage === p
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Page {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Tool Controls & Live Parameters */}
        <div className="lg:col-span-3 xl:col-span-3 flex flex-col gap-4">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 text-left">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Sparkles size={16} className="text-brand-600 dark:text-brand-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Configuration
              </h3>
            </div>

            {/* Custom Tool Controls Component Mounted Here */}
            {children}

            {/* Apply & Export Action Button */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={Boolean(disabledApplyReason) || isProcessing}
                onClick={onApply}
                className={`w-full py-4 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                  disabledApplyReason || isProcessing
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                    : 'bg-brand-600 hover:bg-brand-700 text-white hover:scale-[1.01]'
                }`}
              >
                <span>{isProcessing ? 'Applying Operation...' : applyButtonLabel}</span>
                {!isProcessing && <ArrowRight size={16} />}
              </button>

              {disabledApplyReason && (
                <p className="text-xs text-center text-slate-500 dark:text-slate-400 font-medium mt-2">
                  {disabledApplyReason}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
