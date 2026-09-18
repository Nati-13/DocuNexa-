import { DetectedPart, ProjectData } from '@/types';
import { sanitizeFilename } from './validator';

/**
 * Creates a downloadable .project.json file containing parts configuration
 */
export function exportProjectFile(
  originalFileName: string,
  totalPages: number,
  parts: DetectedPart[],
  settings?: { namingPattern?: string; frontMatterMode?: 'include' | 'separate' | 'exclude' }
): void {
  const project: ProjectData = {
    version: '1.0.0',
    originalFileName,
    totalPages,
    createdAt: new Date().toISOString(),
    parts,
    namingPattern: settings?.namingPattern,
    frontMatterMode: settings?.frontMatterMode,
  };

  const jsonString = JSON.stringify(project, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const baseName = originalFileName.replace(/\.pdf$/i, '').trim() || 'Document';
  const downloadName = `${sanitizeFilename(baseName)}.project.json`;

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = downloadName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Parses and validates an uploaded project JSON file
 */
export async function importProjectFile(file: File): Promise<ProjectData> {
  const text = await file.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid project file: Not valid JSON.');
  }

  if (!parsed || !Array.isArray(parsed.parts)) {
    throw new Error('Invalid project file structure: Missing parts list.');
  }

  // Validate each part structure
  const validatedParts: DetectedPart[] = parsed.parts.map((p: any, idx: number) => ({
    id: p.id || `imported-part-${Date.now()}-${idx + 1}`,
    title: String(p.title || `Part ${idx + 1}`),
    startPage: Number(p.startPage) || 1,
    endPage: Number(p.endPage) || 1,
    filename: sanitizeFilename(String(p.filename || `Part ${idx + 1}.pdf`)),
    confidence: (['High', 'Medium', 'Low'].includes(p.confidence) ? p.confidence : 'Medium') as any,
    source: p.source || 'manual',
    originalHeading: p.originalHeading,
  }));

  return {
    version: parsed.version || '1.0.0',
    originalFileName: parsed.originalFileName || 'Document.pdf',
    totalPages: Number(parsed.totalPages) || 0,
    createdAt: parsed.createdAt || new Date().toISOString(),
    parts: validatedParts,
    namingPattern: parsed.namingPattern,
    frontMatterMode: parsed.frontMatterMode,
  };
}
