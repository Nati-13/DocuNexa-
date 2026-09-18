'use client';

import React from 'react';
import { 
  CheckCircle2, 
  Download, 
  Archive, 
  FolderCheck, 
  RotateCcw, 
  FileText, 
  ExternalLink,
  FolderOpen
} from 'lucide-react';
import { CutProgressItem } from '@/types';
import { downloadFile } from '@/lib/cutter';

interface CompletionModalProps {
  originalFileName: string;
  items: CutProgressItem[];
  onDownloadAll: () => void;
  onDownloadZip: () => void;
  onSaveToFolder: () => void;
  isFolderSupported: boolean;
  onStartNew: () => void;
  onClose: () => void;
}

export const CompletionModal: React.FC<CompletionModalProps> = ({
  originalFileName,
  items,
  onDownloadAll,
  onDownloadZip,
  onSaveToFolder,
  isFolderSupported,
  onStartNew,
  onClose,
}) => {
  const completedItems = items.filter((i) => i.status === 'done' && i.bytes);

  const formatBytes = (bytes?: Uint8Array): string => {
    if (!bytes) return '0 B';
    const size = bytes.byteLength;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 sm:p-8 space-y-6">
        {/* Celebration Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            PDF Splitting Completed!
          </h3>
          <p className="text-sm text-slate-600">
            Successfully generated <strong className="text-slate-900">{completedItems.length}</strong> individual PDF files.
          </p>
          <div className="inline-flex items-center text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
            Source: {originalFileName}
          </div>
        </div>

        {/* Output Files Scrollable Box */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between text-xs font-semibold text-slate-600">
            <span>Generated Files</span>
            <span>File Size</span>
          </div>
          <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 p-2">
            {completedItems.map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-50 rounded-lg group transition-colors"
              >
                <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="font-medium text-slate-800 truncate" title={item.filename}>
                    {item.filename}
                  </span>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <span className="font-mono text-slate-400 text-[11px]">
                    {formatBytes(item.bytes)}
                  </span>
                  <button
                    type="button"
                    onClick={() => item.bytes && downloadFile(item.bytes, item.filename)}
                    className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
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
            className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition-all hover:shadow-indigo-600/30"
          >
            <Archive className="w-4 h-4 mr-2" />
            Download as ZIP Archive
          </button>

          {/* Direct Folder Save (if supported) or Download All */}
          {isFolderSupported ? (
            <button
              type="button"
              onClick={onSaveToFolder}
              className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-md transition-all"
            >
              <FolderCheck className="w-4 h-4 mr-2" />
              Save Directly to Folder
            </button>
          ) : (
            <button
              type="button"
              onClick={onDownloadAll}
              className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-md transition-all"
            >
              <Download className="w-4 h-4 mr-2" />
              Download All Files
            </button>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 font-medium"
          >
            Back to Editor
          </button>

          <button
            type="button"
            onClick={onStartNew}
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Start New PDF
          </button>
        </div>
      </div>
    </div>
  );
};
