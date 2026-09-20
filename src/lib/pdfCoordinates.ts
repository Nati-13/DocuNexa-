/**
 * Utility library for bidirectional coordinate transformations between
 * screen/preview pixels and genuine PDF points (1/72 inch).
 *
 * In PDF specifications:
 *   - The origin (0, 0) is at the BOTTOM-LEFT.
 *   - Coordinates increase rightwards (X) and upwards (Y).
 *
 * In browser DOM / HTML5 Canvas:
 *   - The origin (0, 0) is at the TOP-LEFT.
 *   - Coordinates increase rightwards (X) and downwards (Y).
 */

export interface PageDimensions {
  width: number; // in PDF points
  height: number; // in PDF points
  rotation?: number; // 0, 90, 180, 270
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ScreenRect {
  x: number; // pixels from top-left of canvas
  y: number; // pixels from top-left of canvas
  width: number;
  height: number;
}

export interface PdfRect {
  x: number; // points from bottom-left of PDF page
  y: number; // points from bottom-left of PDF page
  width: number;
  height: number;
}

export type PresetPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/**
 * Converts screen/canvas coordinates to target PDF coordinates (in points).
 */
export function screenToPdfCoordinates(
  screen: { x: number; y: number; width?: number; height?: number },
  page: PageDimensions,
  scale: number
): { x: number; y: number; width: number; height: number } {
  const safeScale = Math.max(0.1, scale);
  const w = (screen.width ?? 0) / safeScale;
  const h = (screen.height ?? 0) / safeScale;
  const x = screen.x / safeScale;
  // In PDF, Y origin is bottom, so Y_pdf = PageHeight - (Y_screen + Height_screen) / scale
  const y = page.height - (screen.y / safeScale + h);

  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    width: Math.round(w * 100) / 100,
    height: Math.round(h * 100) / 100,
  };
}

/**
 * Converts PDF page coordinates (in points) to screen/canvas preview coordinates (in pixels).
 */
export function pdfToScreenCoordinates(
  pdf: { x: number; y: number; width?: number; height?: number },
  page: PageDimensions,
  scale: number
): { x: number; y: number; width: number; height: number } {
  const safeScale = Math.max(0.1, scale);
  const w = (pdf.width ?? 0) * safeScale;
  const h = (pdf.height ?? 0) * safeScale;
  const x = pdf.x * safeScale;
  // Y_screen = (PageHeight - Y_pdf - Height_pdf) * scale
  const y = (page.height - pdf.y - (pdf.height ?? 0)) * safeScale;

  return {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
    width: Math.round(w * 10) / 10,
    height: Math.round(h * 10) / 10,
  };
}

/**
 * Calculates screen coordinates for preset anchor positions (e.g. center, top-right).
 */
export function calculatePresetPosition(
  preset: PresetPosition,
  containerWidth: number,
  containerHeight: number,
  itemWidth: number,
  itemHeight: number,
  margin = 24
): { x: number; y: number } {
  switch (preset) {
    case 'top-left':
      return { x: margin, y: margin };
    case 'top-center':
      return { x: (containerWidth - itemWidth) / 2, y: margin };
    case 'top-right':
      return { x: containerWidth - itemWidth - margin, y: margin };
    case 'center':
      return {
        x: (containerWidth - itemWidth) / 2,
        y: (containerHeight - itemHeight) / 2,
      };
    case 'bottom-left':
      return { x: margin, y: containerHeight - itemHeight - margin };
    case 'bottom-center':
      return { x: (containerWidth - itemWidth) / 2, y: containerHeight - itemHeight - margin };
    case 'bottom-right':
      return { x: containerWidth - itemWidth - margin, y: containerHeight - itemHeight - margin };
    default:
      return {
        x: (containerWidth - itemWidth) / 2,
        y: (containerHeight - itemHeight) / 2,
      };
  }
}

/**
 * Clamps a rectangle within container bounds to prevent dragging off-page.
 */
export function clampRectangle(
  rect: { x: number; y: number; width: number; height: number },
  containerWidth: number,
  containerHeight: number
): { x: number; y: number; width: number; height: number } {
  const width = Math.min(rect.width, containerWidth);
  const height = Math.min(rect.height, containerHeight);
  const x = Math.max(0, Math.min(rect.x, containerWidth - width));
  const y = Math.max(0, Math.min(rect.y, containerHeight - height));

  return { x, y, width, height };
}
