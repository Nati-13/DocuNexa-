export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export interface DetectedPart {
  id: string;
  title: string;
  startPage: number;
  endPage: number;
  filename: string;
  confidence: ConfidenceLevel;
  source?: 'heading' | 'toc' | 'manual';
  originalHeading?: string;
}

export interface PdfFileInfo {
  file: File;
  name: string;
  size: number;
  totalPages: number;
  isScanned: boolean;
  avgCharsPerPage: number;
}

export interface PageTextData {
  pageNumber: number;
  rawText: string;
  lines: string[];
  hasSubstantialText: boolean;
}

export interface OverlapInfo {
  partA: string;
  partB: string;
  startPage: number;
  endPage: number;
}

export interface GapInfo {
  startPage: number;
  endPage: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  overlaps: OverlapInfo[];
  gaps: GapInfo[];
  duplicateFilenames: string[];
}

export interface ProjectData {
  version: string;
  originalFileName: string;
  totalPages: number;
  createdAt: string;
  parts: DetectedPart[];
  namingPattern?: string;
  frontMatterMode?: 'include' | 'separate' | 'exclude';
}

export interface CutProgressItem {
  id: string;
  title: string;
  filename: string;
  status: 'waiting' | 'processing' | 'done' | 'error';
  progress: number; // 0 to 100
  bytes?: Uint8Array;
  error?: string;
}

export interface CutProgressState {
  isCutting: boolean;
  currentIndex: number;
  total: number;
  items: CutProgressItem[];
  completedCount: number;
  isCancelled: boolean;
}

// ----------------------------------------------------
// DocuNexa Platform Types
// ----------------------------------------------------

export type ToolCategory =
  | 'organize'
  | 'optimize'
  | 'convert-to'
  | 'convert-from'
  | 'edit'
  | 'security'
  | 'intelligence';

export interface ToolItem {
  id: string;
  name: string;
  slug: string;
  category: ToolCategory;
  description: string;
  iconName: string;
  badge?: 'Popular' | 'New' | 'Featured' | 'AI';
  isFlagship?: boolean;
  clientSide: boolean;
  supportedInputTypes: string[]; // e.g. ['.pdf'], ['.jpg', '.png']
  keywords: string[];
}

export interface ToolCategoryInfo {
  id: ToolCategory;
  name: string;
  tagline: string;
  accentColor: string; // Tailwind color class or hex
  accentBg: string;
  accentBorder: string;
  accentText: string;
}

export interface UserHistoryItem {
  id: string;
  toolId: string;
  toolName: string;
  fileName: string;
  timestamp: number;
  status: 'success' | 'cancelled' | 'error';
}
