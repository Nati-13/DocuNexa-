export type DetectionSource = 'outline' | 'toc' | 'heading' | 'heuristic' | 'manual';
export type DocumentTextClassification = 'text' | 'mixed' | 'scanned-only';

export interface DocumentSection {
  id: string;
  title: string;
  level: number;               // 1 = Unit / Chapter / Top level, 2 = Section, 3 = Sub-section
  startPage: number;           // 1-indexed PDF page index
  endPage: number;             // 1-indexed PDF page index
  printedStartPage?: string | number; // e.g. "ix", "1", "15" from TOC / page label
  confidence: number;          // 0 - 100 evidence-based confidence
  source: DetectionSource;     // original detection source
  notes?: string;              // Diagnostic info on how section was identified
  isUnresolved?: boolean;      // True if outline destination could not be directly resolved
  isUserModified?: boolean;    // Tracked separately so original detection source is preserved
}

export interface DocumentStructure {
  sections: DocumentSection[];
  hasOutline: boolean;
  hasToc: boolean;
  classification: DocumentTextClassification; // 'text' | 'mixed' | 'scanned-only'
  tocPages?: number[];
  pageOffset?: number;         // PDF page index minus printed page number
  detectionSummary: string;
  totalPages: number;
}

export interface StructureValidationIssue {
  type: 'error' | 'warning';
  message: string;
  sectionId?: string;
  pages?: number[];
}

export interface StructureValidationResult {
  isValid: boolean;
  issues: StructureValidationIssue[];
}
