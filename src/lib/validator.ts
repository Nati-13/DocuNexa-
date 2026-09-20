import { DetectedPart, ValidationResult, OverlapInfo, GapInfo } from '@/types';

/**
 * Sanitizes invalid Windows and cross-platform filename characters:
 * Invalid: < > : " / \ | ? * and control characters (0-31)
 */
export function sanitizeFilename(input: string, fallback = 'output.pdf'): string {
  if (!input || !input.trim()) {
    return fallback;
  }

  let cleaned = input.trim();

  // Replace invalid characters with a hyphen
  cleaned = cleaned.replace(/[<>:"/\\|?*\x00-\x1F]/g, '-');

  // Collapse multiple hyphens or underscores
  cleaned = cleaned.replace(/[-_]+/g, '-');

  // Strip leading/trailing dots and spaces
  cleaned = cleaned.replace(/^[.\s-]+|[.\s-]+$/g, '');

  if (!cleaned) {
    cleaned = 'document';
  }

  // Remove stacked extensions if present (e.g. file.docx.pdf -> file.docx, file.xlsx.pdf -> file.xlsx)
  const stackedMatch = cleaned.match(/^(.+?\.(docx|pptx|xlsx|png|jpe?g|txt|md|zip|json))\.pdf$/i);
  if (stackedMatch) {
    cleaned = stackedMatch[1];
  }

  // If it already ends with a known canonical extension, do not append anything
  const hasKnownExt = /\.(pdf|docx|pptx|xlsx|png|jpe?g|txt|md|zip|json)$/i.test(cleaned);
  if (hasKnownExt) {
    return cleaned;
  }

  // If no known extension, append fallback extension
  const fallbackExt = fallback.match(/\.[^.]+$/)?.[0] || '.pdf';
  return `${cleaned}${fallbackExt}`;
}

/**
 * Generates an automated filename for a section
 */
export function generateAutoFilename(
  prefix: string,
  partIndex: number,
  title: string
): string {
  const cleanPrefix = prefix.replace(/\.pdf$/i, '').trim();
  const cleanTitle = title.trim();
  
  if (cleanTitle) {
    return sanitizeFilename(`${cleanPrefix ? `${cleanPrefix} - ` : ''}${cleanTitle}.pdf`);
  }
  return sanitizeFilename(`${cleanPrefix ? `${cleanPrefix} - ` : ''}Part ${partIndex + 1}.pdf`);
}

/**
 * Comprehensive validation of parts against total pages
 */
export function validateParts(parts: DetectedPart[], totalPages: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const overlaps: OverlapInfo[] = [];
  const gaps: GapInfo[] = [];
  const duplicateFilenames: string[] = [];

  if (parts.length === 0) {
    return {
      isValid: false,
      errors: ['No parts defined. Add at least one part to split the PDF.'],
      warnings: [],
      overlaps: [],
      gaps: [],
      duplicateFilenames: [],
    };
  }

  // 1. Basic bounds validation for each part
  parts.forEach((part, index) => {
    const label = part.title || `Part #${index + 1}`;

    if (isNaN(part.startPage) || isNaN(part.endPage)) {
      errors.push(`${label}: Start and end page numbers must be valid numbers.`);
      return;
    }

    if (part.startPage < 1) {
      errors.push(`${label}: Start page (${part.startPage}) must be at least 1.`);
    }

    if (part.endPage > totalPages) {
      errors.push(
        `${label}: End page (${part.endPage}) exceeds total document pages (${totalPages}).`
      );
    }

    if (part.startPage > part.endPage) {
      errors.push(
        `${label}: Start page (${part.startPage}) cannot be greater than end page (${part.endPage}).`
      );
    }

    if (!part.filename || !part.filename.trim()) {
      errors.push(`${label}: Filename cannot be empty.`);
    }
  });

  // 2. Duplicate filename check (case-insensitive)
  const filenameMap = new Map<string, number>();
  parts.forEach((part) => {
    const lowerName = (part.filename || '').trim().toLowerCase();
    if (lowerName) {
      filenameMap.set(lowerName, (filenameMap.get(lowerName) || 0) + 1);
    }
  });

  filenameMap.forEach((count, name) => {
    if (count > 1) {
      duplicateFilenames.push(name);
      warnings.push(`Duplicate filename: "${name}" is used by ${count} parts.`);
    }
  });

  // 3. Overlap check between parts
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      const p1 = parts[i];
      const p2 = parts[j];

      // Check if [p1.start, p1.end] and [p2.start, p2.end] intersect
      const overlapStart = Math.max(p1.startPage, p2.startPage);
      const overlapEnd = Math.min(p1.endPage, p2.endPage);

      if (overlapStart <= overlapEnd && p1.startPage <= p1.endPage && p2.startPage <= p2.endPage) {
        const overlap: OverlapInfo = {
          partA: p1.title || `Part #${i + 1}`,
          partB: p2.title || `Part #${j + 1}`,
          startPage: overlapStart,
          endPage: overlapEnd,
        };
        overlaps.push(overlap);
        warnings.push(
          `Page overlap: "${overlap.partA}" (pages ${p1.startPage}–${p1.endPage}) and "${overlap.partB}" (pages ${p2.startPage}–${p2.endPage}) share pages ${overlapStart}–${overlapEnd}.`
        );
      }
    }
  }

  // 4. Gap check across entire document range [1..totalPages]
  // Sort parts by startPage to inspect coverage
  const sorted = [...parts]
    .filter((p) => p.startPage <= p.endPage && p.startPage >= 1 && p.endPage <= totalPages)
    .sort((a, b) => a.startPage - b.startPage);

  if (sorted.length > 0) {
    // Gap before first part
    if (sorted[0].startPage > 1) {
      gaps.push({ startPage: 1, endPage: sorted[0].startPage - 1 });
    }

    // Gaps between parts
    let maxCovered = sorted[0].endPage;
    for (let i = 1; i < sorted.length; i++) {
      const curr = sorted[i];
      if (curr.startPage > maxCovered + 1) {
        gaps.push({ startPage: maxCovered + 1, endPage: curr.startPage - 1 });
      }
      maxCovered = Math.max(maxCovered, curr.endPage);
    }

    // Gap after last part
    if (maxCovered < totalPages) {
      gaps.push({ startPage: maxCovered + 1, endPage: totalPages });
    }

    gaps.forEach((g) => {
      const gapRange = g.startPage === g.endPage ? `page ${g.startPage}` : `pages ${g.startPage}–${g.endPage}`;
      warnings.push(`Unassigned gap: ${gapRange} ${g.startPage === g.endPage ? 'is' : 'are'} not assigned to any part.`);
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    overlaps,
    gaps,
    duplicateFilenames,
  };
}
