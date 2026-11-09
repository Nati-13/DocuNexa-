/**
 * DocuNexa — Real-PDF Learning & Feedback IndexedDB Storage
 * Stores human evaluation records (CORRECT / INCORRECT) of PDF Unit Cutter detections.
 * Includes JSON export, import, record deletion, and query helpers.
 *
 * NOTE: This is client-side supervised feedback for regression testing and deterministic rule tuning.
 * It does not send PDFs or feedback to external AI APIs.
 */

export const DETECTOR_VERSION = '2.4.0-phase2';
const DB_NAME = 'docunexa_detector_feedback';
const DB_VERSION = 1;
const STORE_NAME = 'evaluations';

export interface BoundaryRecord {
  title: string;
  startPage: number;
  endPage: number;
  confidence?: string;
  notes?: string;
}

export interface FeedbackRecord {
  id: string; // Document fingerprint or unique identifier
  documentFingerprint: string;
  filename: string;
  pageCount: number;
  language?: string;
  extractedHeadingEvidence: string[];
  detectorVersion: string;
  originalBoundaries: BoundaryRecord[];
  correctedBoundaries?: BoundaryRecord[];
  decision: 'CORRECT' | 'INCORRECT';
  notes?: string;
  timestamp: string; // ISO 8601
}

// In-memory fallback store for Node.js / test environments where window.indexedDB is unavailable
const memoryFallbackStore = new Map<string, FeedbackRecord>();

/**
 * Computes a deterministic SHA-256 or fast hash fingerprint for a PDF document
 */
export async function computePdfFingerprint(
  buffer: ArrayBuffer,
  filename: string,
  totalPages: number
): Promise<string> {
  const byteLength = buffer.byteLength;
  const sampleSize = Math.min(byteLength, 4096);
  const sample = new Uint8Array(buffer, 0, sampleSize);

  let hash = 0;
  for (let i = 0; i < sample.length; i++) {
    hash = ((hash << 5) - hash + sample[i]) | 0;
  }

  const cleanName = filename.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  return `doc_${cleanName}_p${totalPages}_b${byteLength}_h${Math.abs(hash).toString(16)}`;
}

/**
 * Opens or creates the IndexedDB database
 */
export function openFeedbackDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db: IDBDatabase = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('by_decision', 'decision', { unique: false });
        store.createIndex('by_timestamp', 'timestamp', { unique: false });
        store.createIndex('by_fingerprint', 'documentFingerprint', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves or updates a feedback record in IndexedDB (or in-memory store in Node)
 */
export async function saveFeedbackRecord(record: FeedbackRecord): Promise<void> {
  const db = await openFeedbackDb();
  if (!db) {
    memoryFallbackStore.set(record.id, record);
    return;
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Retrieves all feedback records from the database
 */
export async function getAllFeedbackRecords(): Promise<FeedbackRecord[]> {
  const db = await openFeedbackDb();
  if (!db) {
    return Array.from(memoryFallbackStore.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const records: FeedbackRecord[] = req.result || [];
        records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(records);
      };
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Retrieves a single feedback record by id or fingerprint
 */
export async function getFeedbackRecord(id: string): Promise<FeedbackRecord | null> {
  const db = await openFeedbackDb();
  if (!db) {
    return memoryFallbackStore.get(id) || null;
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Deletes a single feedback record by id
 */
export async function deleteFeedbackRecord(id: string): Promise<void> {
  const db = await openFeedbackDb();
  if (!db) {
    memoryFallbackStore.delete(id);
    return;
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Clears all stored feedback records
 */
export async function clearAllFeedbackRecords(): Promise<void> {
  const db = await openFeedbackDb();
  if (!db) {
    memoryFallbackStore.clear();
    return;
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Exports all feedback records as a formatted JSON string
 */
export async function exportFeedbackJson(): Promise<string> {
  const records = await getAllFeedbackRecords();
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    detectorVersion: DETECTOR_VERSION,
    totalRecords: records.length,
    positiveCount: records.filter((r) => r.decision === 'CORRECT').length,
    correctedCount: records.filter((r) => r.decision === 'INCORRECT').length,
    records,
  };
  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Imports feedback records from a JSON string, validating the schema
 */
export async function importFeedbackJson(
  jsonString: string
): Promise<{ importedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let parsed: any;

  try {
    parsed = JSON.parse(jsonString);
  } catch (err: any) {
    return { importedCount: 0, errors: [`Invalid JSON: ${err.message}`] };
  }

  const recordsToImport: any[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.records)
    ? parsed.records
    : [];

  if (recordsToImport.length === 0) {
    return { importedCount: 0, errors: ['No valid feedback records found in file'] };
  }

  let importedCount = 0;

  for (let i = 0; i < recordsToImport.length; i++) {
    const raw = recordsToImport[i];
    if (!raw || typeof raw !== 'object') {
      errors.push(`Item ${i}: Expected an object`);
      continue;
    }

    if (!raw.id && !raw.documentFingerprint) {
      errors.push(`Item ${i}: Missing id or documentFingerprint`);
      continue;
    }

    if (!raw.filename || typeof raw.pageCount !== 'number') {
      errors.push(`Item ${i}: Missing filename or pageCount`);
      continue;
    }

    if (raw.decision !== 'CORRECT' && raw.decision !== 'INCORRECT') {
      errors.push(`Item ${i}: Decision must be CORRECT or INCORRECT`);
      continue;
    }

    const record: FeedbackRecord = {
      id: raw.id || raw.documentFingerprint,
      documentFingerprint: raw.documentFingerprint || raw.id,
      filename: String(raw.filename),
      pageCount: Number(raw.pageCount),
      language: raw.language ? String(raw.language) : undefined,
      extractedHeadingEvidence: Array.isArray(raw.extractedHeadingEvidence)
        ? raw.extractedHeadingEvidence.map(String)
        : [],
      detectorVersion: raw.detectorVersion || DETECTOR_VERSION,
      originalBoundaries: Array.isArray(raw.originalBoundaries) ? raw.originalBoundaries : [],
      correctedBoundaries: Array.isArray(raw.correctedBoundaries) ? raw.correctedBoundaries : undefined,
      decision: raw.decision,
      notes: raw.notes ? String(raw.notes) : undefined,
      timestamp: raw.timestamp || new Date().toISOString(),
    };

    try {
      await saveFeedbackRecord(record);
      importedCount++;
    } catch (saveErr: any) {
      errors.push(`Item ${i} (${record.filename}): ${saveErr.message}`);
    }
  }

  return { importedCount, errors };
}

