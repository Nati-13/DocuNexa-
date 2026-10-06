'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * Standard QR Code component using the industry-standard qrcode library.
 * Encodes the receiving Bybit USDT Polygon address into a standard SVG QR matrix
 * with Reed-Solomon error correction recognizable by any camera or wallet scanner.
 */
export function QrCode({ value, size = 150, className = '' }: QrCodeProps) {
  const [svgHtml, setSvgHtml] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    if (!value) return;

    QRCode.toString(value, {
      type: 'svg',
      margin: 1,
      width: size,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then(svg => {
        if (isMounted) setSvgHtml(svg);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  if (!svgHtml) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`inline-flex items-center justify-center p-2 bg-white rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm animate-pulse ${className}`}
      />
    );
  }

  return (
    <div
      className={`inline-block p-2 bg-white rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
}
