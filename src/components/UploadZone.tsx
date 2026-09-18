'use client';

import React, { useRef, useState } from 'react';
import { 
  FileUp, 
  FileText, 
  Trash2, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle,
  FileCheck,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { PdfFileInfo } from '@/types';

interface UploadZoneProps {
  fileInfo: PdfFileInfo | null;
  onFileSelect: (file: File) => void;
  onRemoveFile: () => void;
  onAnalyze: () => void;
  onManualMode: () => void;
  isAnalyzing: boolean;
  analysisProgress: { current: number; total: number };
  onLoadSample: () => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  fileInfo,
  onFileSelect,
  onRemoveFile,
  onAnalyze,
  onManualMode,
  isAnalyzing,
  analysisProgress,
  onLoadSample,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setDragError(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        onFileSelect(file);
      } else {
        setDragError('Please drop a valid .pdf document.');
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDragError(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.name.toLowerCase().endsWith('.pdf')) {
        onFileSelect(file);
      } else {
        setDragError('Only PDF files are supported.');
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      {/* If no file is selected yet, show Dropzone */}
      {!fileInfo ? (
        <div className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
              isDragOver
                ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01] shadow-lg shadow-indigo-500/10'
                : 'border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50/50 shadow-xs'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".pdf,application/pdf"
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-inner group-hover:scale-105 transition-transform">
                <FileUp className="w-8 h-8 animate-bounce-subtle" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Drop your PDF here
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  or click to browse from your computer
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-md shadow-indigo-600/20 transition-all hover:shadow-indigo-600/30"
                >
                  Choose PDF
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Supports textbooks, course readers, syllabi, manuals • Up to hundreds of pages
              </p>
            </div>
          </div>

          {dragError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{dragError}</span>
            </div>
          )}

          {/* Quick Demo Sample Button */}
          <div className="flex items-center justify-center pt-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadSample();
              }}
              className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors border border-indigo-200/60"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Don&apos;t have a PDF ready? Try with a Sample Textbook
            </button>
          </div>
        </div>
      ) : (
        /* File Information Card */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-semibold text-slate-900 truncate max-w-md" title={fileInfo.name}>
                    {fileInfo.name}
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Ready
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-xs text-slate-500 mt-1">
                  <span>
                    <strong className="font-semibold text-slate-700">{fileInfo.totalPages}</strong> pages
                  </span>
                  <span>•</span>
                  <span>{formatFileSize(fileInfo.size)}</span>
                  <span>•</span>
                  <span>Avg {fileInfo.avgCharsPerPage} chars/page</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 self-end sm:self-center">
              <button
                type="button"
                onClick={onRemoveFile}
                disabled={isAnalyzing}
                className="inline-flex items-center px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Remove PDF
              </button>

              <button
                type="button"
                onClick={onAnalyze}
                disabled={isAnalyzing}
                className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all hover:shadow-indigo-600/30 disabled:opacity-60"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing ({analysisProgress.current}/{analysisProgress.total})...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Analyze PDF
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Scanned PDF Warning Alert */}
          {fileInfo.isScanned && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900">
                  <p className="font-semibold">This PDF appears to be scanned or image-based.</p>
                  <p className="text-amber-700 mt-0.5">
                    It contains very little extractable digital text. Automatic unit detection may not detect headings reliably.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-1 pl-8">
                <button
                  type="button"
                  onClick={onManualMode}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors"
                >
                  Switch to Manual Split
                </button>
                <button
                  type="button"
                  onClick={onAnalyze}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg text-amber-800 hover:bg-amber-100 border border-amber-300 transition-colors"
                >
                  Continue Analysis Anyway
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
