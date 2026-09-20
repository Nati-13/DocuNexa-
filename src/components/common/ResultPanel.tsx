'use client';

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Download, 
  Archive, 
  FolderDown, 
  RotateCcw, 
  FileText,
  Share2,
  Sparkles
} from 'lucide-react';
import { downloadFile, isFileSystemAccessSupported, createZipBundle } from '@/lib/cutter';

export interface ResultFileItem {
  name: string;
  bytes: Uint8Array | Blob;
  size?: number;
}

interface ResultPanelProps {
  title?: string;
  subtitle?: string;
  files: ResultFileItem[];
  originalSize?: number;
  newSize?: number;
  onReset: () => void;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({
  title = 'Task Completed Successfully!',
  subtitle = 'Your files are ready for instant, lossless download.',
  files,
  originalSize,
  newSize,
  onReset,
}) => {
  const [isZipping, setIsZipping] = useState(false);
  const [folderSaved, setFolderSaved] = useState<string | null>(null);

  const hasMultiple = files.length > 1;

  // Single file direct download
  const handleDownloadSingle = (file: ResultFileItem) => {
    downloadFile(file.bytes, file.name);
  };

  // Download all files individually with brief delay
  const handleDownloadAll = () => {
    files.forEach((file, index) => {
      setTimeout(() => {
        downloadFile(file.bytes, file.name);
      }, index * 250);
    });
  };

  // Bundle into a ZIP archive
  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const items = files.map((f) => ({
        filename: f.name,
        bytes: f.bytes instanceof Blob ? new Uint8Array() : f.bytes,
      }));
      // For any blob, convert
      const prepared = await Promise.all(
        files.map(async (f) => {
          if (f.bytes instanceof Uint8Array) {
            return { filename: f.name, bytes: f.bytes };
          } else {
            const ab = await (f.bytes as Blob).arrayBuffer();
            return { filename: f.name, bytes: new Uint8Array(ab) };
          }
        })
      );
      const zipBlob = await createZipBundle(prepared);
      downloadFile(zipBlob, `DocuNexa - Processed Files.zip`);
    } catch (err) {
      console.error('ZIP generation error:', err);
      alert('Could not generate ZIP archive.');
    } finally {
      setIsZipping(false);
    }
  };

  // Save directly to folder via File System Access API
  const handleSaveToFolder = async () => {
    if (!isFileSystemAccessSupported()) {
      alert('Your browser does not support the File System Access API. Please use normal download or ZIP.');
      return;
    }
    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      for (const file of files) {
        const fileHandle = await dirHandle.getFileHandle(file.name, { create: true });
        const writable = await fileHandle.createWritable();
        writable.write(file.bytes);
        await writable.close();
      }
      setFolderSaved(`Saved to ${dirHandle.name}`);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        alert(`Could not save to folder: ${err.message || err}`);
      }
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
      {/* Success Badge */}
      <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
        <CheckCircle2 size={36} />
      </div>

      <div>
        <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="text-xs md:text-sm text-slate-700 dark:text-slate-200 mt-1">{subtitle}</p>
      </div>

      {/* Compression stats if provided */}
      {originalSize !== undefined && newSize !== undefined && (
        <div className="inline-flex items-center gap-4 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <span>Original: {(originalSize / (1024 * 1024)).toFixed(2)} MB</span>
          <span>→</span>
          <span>New: {(newSize / (1024 * 1024)).toFixed(2)} MB</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
            {Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100))}% smaller
          </span>
        </div>
      )}

      {/* Output Files Summary Box */}
      <div className="max-h-56 overflow-y-auto p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-left divide-y divide-slate-200 dark:divide-slate-700/50">
        {files.map((file, idx) => (
          <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText size={16} className="text-brand-600 dark:text-brand-400 shrink-0" />
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {file.name}
              </span>
            </div>
            <button
              onClick={() => handleDownloadSingle(file)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:border-brand-500 text-slate-700 dark:text-slate-200 text-xs font-semibold shrink-0 transition-colors shadow-2xs"
            >
              <Download size={13} />
              <span>Download</span>
            </button>
          </div>
        ))}
      </div>

      {/* Main Download Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {hasMultiple ? (
          <>
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-md shadow-brand-500/25 transition-all hover:scale-[1.02]"
            >
              <Archive size={17} />
              <span>{isZipping ? 'Generating ZIP...' : 'Download All as ZIP'}</span>
            </button>

            <button
              onClick={handleDownloadAll}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-bold transition-all"
            >
              <Download size={17} />
              <span>Download Files Individually</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => handleDownloadSingle(files[0])}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-md shadow-brand-500/25 transition-all hover:scale-[1.02]"
          >
            <Download size={18} />
            <span>
              {files[0]?.name.toLowerCase().endsWith('.docx')
                ? 'Download Word Document (.docx)'
                : files[0]?.name.toLowerCase().endsWith('.pptx')
                ? 'Download PowerPoint (.pptx)'
                : files[0]?.name.toLowerCase().endsWith('.xlsx')
                ? 'Download Excel (.xlsx)'
                : files[0]?.name.toLowerCase().endsWith('.zip')
                ? 'Download ZIP Archive'
                : 'Download PDF'}
            </span>
          </button>
        )}

        {/* Browser File System Access */}
        {typeof window !== 'undefined' && 'showDirectoryPicker' in window && (
          <button
            onClick={handleSaveToFolder}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-bold transition-all"
          >
            <FolderDown size={17} />
            <span>{folderSaved || 'Save Directly to Folder'}</span>
          </button>
        )}
      </div>

      {/* Reset & Start Over */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
        >
          <RotateCcw size={13} />
          <span>Process another document</span>
        </button>
      </div>
    </div>
  );
};
