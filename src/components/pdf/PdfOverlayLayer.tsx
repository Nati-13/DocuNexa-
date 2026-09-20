'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  screenToPdfCoordinates,
  pdfToScreenCoordinates,
  PageDimensions,
  ScreenRect,
} from '@/lib/pdfCoordinates';
import { Move, RotateCw, Check, X, Maximize2 } from 'lucide-react';

export interface WatermarkOverlayProps {
  text: string;
  fontSize: number;
  opacity: number;
  rotation: number;
  colorHex: string;
  position: { x: number; y: number }; // Screen pixels from top-left
  onPositionChange: (pos: { x: number; y: number }) => void;
  onRotationChange?: (rotation: number) => void;
}

export interface CropBoxOverlayProps {
  rect: ScreenRect;
  onRectChange: (rect: ScreenRect) => void;
  aspectRatio?: number | null;
}

export interface SignatureOverlayProps {
  signatureDataUrl?: string;
  typedText?: string;
  rect: ScreenRect;
  onRectChange: (rect: ScreenRect) => void;
}

export interface PageNumberOverlayProps {
  text: string;
  position: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-center' | 'top-left';
  fontSize: number;
  colorHex: string;
  margin: number;
}

export interface FormWidgetOverlayProps {
  name: string;
  type: 'text' | 'checkbox' | 'dropdown' | 'radio';
  rect: ScreenRect;
  value: string | boolean;
  options?: string[];
  onChange: (val: string | boolean) => void;
}

export interface PdfOverlayLayerProps {
  canvasWidth: number;
  canvasHeight: number;
  pageDimensions: PageDimensions;
  scale: number;
  rotation: number; // visual page rotation in degrees
  mode?: 'none' | 'watermark' | 'crop' | 'signature' | 'page-numbers' | 'forms' | 'edit';
  watermarkProps?: WatermarkOverlayProps;
  cropProps?: CropBoxOverlayProps;
  signatureProps?: SignatureOverlayProps;
  pageNumberProps?: PageNumberOverlayProps;
  formWidgets?: FormWidgetOverlayProps[];
}

export const PdfOverlayLayer: React.FC<PdfOverlayLayerProps> = ({
  canvasWidth,
  canvasHeight,
  pageDimensions,
  scale,
  rotation,
  mode = 'none',
  watermarkProps,
  cropProps,
  signatureProps,
  pageNumberProps,
  formWidgets = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------
  // 1. DRAGGABLE WATERMARK
  // -------------------------------------------------------------
  const [isDraggingWatermark, setIsDraggingWatermark] = useState(false);
  const dragStartOffset = useRef({ x: 0, y: 0 });

  const handleWatermarkPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDraggingWatermark(true);
    if (watermarkProps) {
      dragStartOffset.current = {
        x: e.clientX - watermarkProps.position.x,
        y: e.clientY - watermarkProps.position.y,
      };
    }
  };

  const handleWatermarkPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingWatermark || !watermarkProps) return;
    const newX = e.clientX - dragStartOffset.current.x;
    const newY = e.clientY - dragStartOffset.current.y;
    // Keep bounded inside canvas
    const clampedX = Math.max(0, Math.min(newX, canvasWidth - 80));
    const clampedY = Math.max(0, Math.min(newY, canvasHeight - 40));
    watermarkProps.onPositionChange({ x: clampedX, y: clampedY });
  };

  const handleWatermarkPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingWatermark(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // -------------------------------------------------------------
  // 2. DRAGGABLE & RESIZABLE CROP BOX
  // -------------------------------------------------------------
  const [isResizingCrop, setIsResizingCrop] = useState<string | null>(null);
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const cropStart = useRef({ mouseX: 0, mouseY: 0, rect: { x: 0, y: 0, width: 0, height: 0 } });

  const handleCropPointerDown = (
    e: React.PointerEvent,
    action: 'drag' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'
  ) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (!cropProps) return;
    if (action === 'drag') {
      setIsDraggingCrop(true);
    } else {
      setIsResizingCrop(action);
    }
    cropStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      rect: { ...cropProps.rect },
    };
  };

  const handleCropPointerMove = (e: React.PointerEvent) => {
    if (!cropProps) return;
    const dx = e.clientX - cropStart.current.mouseX;
    const dy = e.clientY - cropStart.current.mouseY;
    const orig = cropStart.current.rect;

    if (isDraggingCrop) {
      const x = Math.max(0, Math.min(orig.x + dx, canvasWidth - orig.width));
      const y = Math.max(0, Math.min(orig.y + dy, canvasHeight - orig.height));
      cropProps.onRectChange({ ...orig, x, y });
    } else if (isResizingCrop) {
      let { x, y, width, height } = orig;
      if (isResizingCrop.includes('e')) width = Math.max(40, Math.min(orig.width + dx, canvasWidth - x));
      if (isResizingCrop.includes('s')) height = Math.max(40, Math.min(orig.height + dy, canvasHeight - y));
      if (isResizingCrop.includes('w')) {
        const proposedW = orig.width - dx;
        if (proposedW >= 40 && orig.x + dx >= 0) {
          x = orig.x + dx;
          width = proposedW;
        }
      }
      if (isResizingCrop.includes('n')) {
        const proposedH = orig.height - dy;
        if (proposedH >= 40 && orig.y + dy >= 0) {
          y = orig.y + dy;
          height = proposedH;
        }
      }
      cropProps.onRectChange({ x, y, width, height });
    }
  };

  const handleCropPointerUp = (e: React.PointerEvent) => {
    setIsDraggingCrop(false);
    setIsResizingCrop(null);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // -------------------------------------------------------------
  // 3. DRAGGABLE SIGNATURE STAMP
  // -------------------------------------------------------------
  const [isDraggingSig, setIsDraggingSig] = useState(false);
  const sigStart = useRef({ mouseX: 0, mouseY: 0, rect: { x: 0, y: 0, width: 0, height: 0 } });

  const handleSigPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (!signatureProps) return;
    setIsDraggingSig(true);
    sigStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      rect: { ...signatureProps.rect },
    };
  };

  const handleSigPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingSig || !signatureProps) return;
    const dx = e.clientX - sigStart.current.mouseX;
    const dy = e.clientY - sigStart.current.mouseY;
    const orig = sigStart.current.rect;
    const x = Math.max(0, Math.min(orig.x + dx, canvasWidth - orig.width));
    const y = Math.max(0, Math.min(orig.y + dy, canvasHeight - orig.height));
    signatureProps.onRectChange({ ...orig, x, y });
  };

  const handleSigPointerUp = (e: React.PointerEvent) => {
    setIsDraggingSig(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
      style={{ width: canvasWidth, height: canvasHeight }}
    >
      {/* 1. WATERMARK OVERLAY */}
      {mode === 'watermark' && watermarkProps && (
        <div
          onPointerDown={handleWatermarkPointerDown}
          onPointerMove={handleWatermarkPointerMove}
          onPointerUp={handleWatermarkPointerUp}
          className="absolute pointer-events-auto cursor-grab active:cursor-grabbing p-3 rounded-xl border border-dashed border-brand-500/80 bg-brand-500/10 hover:bg-brand-500/15 backdrop-blur-xs transition-shadow shadow-lg group touch-none"
          style={{
            left: `${watermarkProps.position.x}px`,
            top: `${watermarkProps.position.y}px`,
            transform: `rotate(${watermarkProps.rotation}deg)`,
            transformOrigin: 'center center',
          }}
        >
          <div
            className="font-bold tracking-wider select-none whitespace-nowrap"
            style={{
              fontSize: `${Math.max(12, watermarkProps.fontSize * scale)}px`,
              opacity: watermarkProps.opacity,
              color: watermarkProps.colorHex || '#475569',
            }}
          >
            {watermarkProps.text || 'WATERMARK'}
          </div>

          <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-md text-xs cursor-move">
            <Move size={12} />
          </div>
        </div>
      )}

      {/* 2. CROP OVERLAY WITH SHADED OUTER BOUNDARY */}
      {mode === 'crop' && cropProps && (
        <div
          onPointerMove={handleCropPointerMove}
          onPointerUp={handleCropPointerUp}
          className="absolute pointer-events-auto touch-none"
          style={{
            left: `${cropProps.rect.x}px`,
            top: `${cropProps.rect.y}px`,
            width: `${cropProps.rect.width}px`,
            height: `${cropProps.rect.height}px`,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.65)',
            border: '2px dashed #0284c7',
          }}
        >
          {/* Main drag body */}
          <div
            onPointerDown={(e) => handleCropPointerDown(e, 'drag')}
            className="w-full h-full cursor-move flex items-center justify-center text-white/90 font-mono text-xs font-bold drop-shadow-md"
          >
            <span className="bg-slate-900/80 px-2 py-1 rounded-md">
              {Math.round(cropProps.rect.width / scale)} × {Math.round(cropProps.rect.height / scale)} pt
            </span>
          </div>

          {/* 8 Resize Handles */}
          {(['nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w'] as const).map((handle) => {
            let posStyle: React.CSSProperties = {};
            if (handle.includes('n')) posStyle.top = '-6px';
            if (handle.includes('s')) posStyle.bottom = '-6px';
            if (handle.includes('w')) posStyle.left = '-6px';
            if (handle.includes('e')) posStyle.right = '-6px';
            if (handle === 'n' || handle === 's') posStyle.left = 'calc(50% - 6px)';
            if (handle === 'w' || handle === 'e') posStyle.top = 'calc(50% - 6px)';

            return (
              <div
                key={handle}
                onPointerDown={(e) => handleCropPointerDown(e, handle)}
                style={posStyle}
                className="absolute w-3 h-3 bg-sky-400 border border-white rounded-xs shadow-md z-30 cursor-pointer"
              />
            );
          })}
        </div>
      )}

      {/* 3. SIGNATURE OVERLAY */}
      {mode === 'signature' && signatureProps && (
        <div
          onPointerDown={handleSigPointerDown}
          onPointerMove={handleSigPointerMove}
          onPointerUp={handleSigPointerUp}
          className="absolute pointer-events-auto cursor-grab active:cursor-grabbing p-2 rounded-xl border border-dashed border-indigo-500 bg-white/90 dark:bg-slate-900/90 shadow-xl touch-none group"
          style={{
            left: `${signatureProps.rect.x}px`,
            top: `${signatureProps.rect.y}px`,
            width: `${signatureProps.rect.width}px`,
            height: `${signatureProps.rect.height}px`,
          }}
        >
          {signatureProps.signatureDataUrl ? (
            <img
              src={signatureProps.signatureDataUrl}
              alt="Signature"
              className="w-full h-full object-contain pointer-events-none"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-serif italic text-slate-800 dark:text-slate-200 text-lg">
              {signatureProps.typedText || 'Signature'}
            </div>
          )}

          <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md text-xs cursor-move">
            <Move size={12} />
          </div>
        </div>
      )}

      {/* 4. PAGE NUMBER PREVIEW */}
      {mode === 'page-numbers' && pageNumberProps && (
        <div
          className="absolute px-2.5 py-1 rounded-md bg-slate-900/85 text-white font-mono font-semibold shadow-md pointer-events-none border border-slate-700"
          style={{
            fontSize: `${Math.max(10, pageNumberProps.fontSize * scale)}px`,
            ...(pageNumberProps.position.includes('bottom')
              ? { bottom: `${pageNumberProps.margin * scale}px` }
              : { top: `${pageNumberProps.margin * scale}px` }),
            ...(pageNumberProps.position.includes('left')
              ? { left: `${pageNumberProps.margin * scale}px` }
              : pageNumberProps.position.includes('right')
              ? { right: `${pageNumberProps.margin * scale}px` }
              : { left: '50%', transform: 'translateX(-50%)' }),
          }}
        >
          {pageNumberProps.text}
        </div>
      )}

      {/* 5. INTERACTIVE FORM WIDGETS OVERLAY */}
      {mode === 'forms' &&
        formWidgets.map((widget, i) => (
          <div
            key={i}
            className="absolute pointer-events-auto p-0.5 rounded border border-brand-500 bg-brand-50/70 dark:bg-brand-950/70 shadow-xs"
            style={{
              left: `${widget.rect.x}px`,
              top: `${widget.rect.y}px`,
              width: `${widget.rect.width}px`,
              height: `${widget.rect.height}px`,
            }}
          >
            {widget.type === 'text' && (
              <input
                type="text"
                value={(widget.value as string) || ''}
                onChange={(e) => widget.onChange(e.target.value)}
                placeholder={widget.name}
                className="w-full h-full px-1 text-xs bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border-none outline-hidden font-medium"
              />
            )}
            {widget.type === 'checkbox' && (
              <div className="w-full h-full flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={Boolean(widget.value)}
                  onChange={(e) => widget.onChange(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                />
              </div>
            )}
            {widget.type === 'dropdown' && widget.options && (
              <select
                value={(widget.value as string) || ''}
                onChange={(e) => widget.onChange(e.target.value)}
                className="w-full h-full text-xs bg-white dark:bg-slate-900 border-none rounded"
              >
                {widget.options.map((opt, idx) => (
                  <option key={idx} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
    </div>
  );
};
