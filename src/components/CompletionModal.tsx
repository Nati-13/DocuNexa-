'use client';

import React from 'react';
import { 
  CheckCircle2, 
  Download, 
  FolderCheck, 
  Archive, 
  RotateCcw, 
  FileText 
} from 'lucide-react';
import { CutProgressItem } from '@/types';
import { downloadFile } from '@/lib/cutter';

interface CompletionModalProps {
  completedItems: CutProgressItem[] | null;
  originalFileName: string;
  isFolderSupported: boolean;
  onDownloadZip: () => void;
  onSaveToFolder: () => void;
  onDownloadAll: () => void;
  onStartNew: () => void;
  onClose: () => void;
}

export const CompletionModal: React.FC<CompletionModalProps> = ({
  completedItems,
  originalFileName,
  isFolderSupported,
  onDownloadZip,
  onSaveToFolder,
  onDownloadAll,
  onStartNew,
  onClose,
}) => {
  if (!completedItems || completedItems.length === 0) return null;

  const formatBytes = (bytes?: Uint8Array): string => {
    if (!bytes) return '0 B';
    const size = bytes.byteLength;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 animate-in fade-in duration-150">
      <div className="bg-surface rounded-md border border-border text-ink max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-subtle">
        {/* Celebration Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-md bg-paper border border-border flex items-center justify-center text-brand mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-serif font-bold text-ink">
            PDF Splitting Completed!
          </h3>
          <p className="text-sm text-muted">
            Successfully generated <strong className="text-ink">{completedItems.length}</strong> individual PDF files.
          </p>
          <div className="inline-flex items-center text-xs font-mono text-muted bg-paper border border-border px-2.5 py-1 rounded-md">
            Source: {originalFileName}
          </div>
        </div>

        {/* Output Files Scrollable Box */}
        <div className="border border-border rounded-md overflow-hidden bg-surface">
          <div className="bg-paper px-4 py-2 border-b border-border flex justify-between text-xs font-semibold text-muted">
            <span>Generated Files</span>
            <span>File Size</span>
          </div>
          <div className="max-h-52 overflow-y-auto divide-y divide-border p-2">
            {completedItems.map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex items-center justify-between px-3 py-2 text-xs hover:bg-paper rounded group transition-colors"
              >
                <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                  <FileText className="w-4 h-4 text-brand shrink-0" />
                  <span className="font-medium text-ink truncate" title={item.filename}>
                    {item.filename}
                  </span>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <span className="font-mono text-muted text-[11px]">
                    {formatBytes(item.bytes)}
                  </span>
                  <button
                    type="button"
                    onClick={() => item.bytes && downloadFile(item.bytes, item.filename)}
                    className="p-1 rounded text-muted hover:text-brand hover:bg-paper transition-colors cursor-pointer"
                    title="Download this file"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Download Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Download ZIP */}
          <button
            type="button"
            onClick={onDownloadZip}
            className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-md bg-brand hover:bg-brand/90 text-brand-fg font-semibold text-sm transition-colors cursor-pointer"
          >
            <Archive className="w-4 h-4 mr-2" />
            Download as ZIP Archive
          </button>

          {/* Direct Folder Save (if supported) or Download All */}
          {isFolderSupported ? (
            <button
              type="button"
              onClick={onSaveToFolder}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-md bg-surface hover:bg-paper border border-border text-ink font-semibold text-sm transition-colors cursor-pointer"
            >
              <FolderCheck className="w-4 h-4 mr-2 text-brand" />
              Save Directly to Folder
            </button>
          ) : (
            <button
              type="button"
              onClick={onDownloadAll}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-md bg-surface hover:bg-paper border border-border text-ink font-semibold text-sm transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 mr-2" />
              Download All Files
            </button>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink font-medium cursor-pointer"
          >
            Back to Editor
          </button>

          <button
            type="button"
            onClick={onStartNew}
            className="inline-flex items-center text-brand hover:underline font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Start New PDF
          </button>
        </div>
      </div>
    </div>
  );
};
