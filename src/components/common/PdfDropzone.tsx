'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, AlertCircle, Plus, Sparkles } from 'lucide-react';

interface PdfDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
  supportedFormats?: string;
}

export const PdfDropzone: React.FC<PdfDropzoneProps> = ({
  onFilesSelected,
  accept = '.pdf,application/pdf',
  multiple = false,
  title = 'Drop your PDF here',
  subtitle = 'or click to browse your files from your computer',
  className = '',
  supportedFormats = 'PDF documents up to 250 MB',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      onFilesSelected(filesArray);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesSelected(filesArray);
    }
    // Reset so same file can be chosen again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`group relative rounded-3xl border-2 border-dashed p-8 md:p-12 text-center cursor-pointer transition-all duration-200 ${
        isDragOver
          ? 'border-brand-500 bg-brand-50/70 dark:bg-brand-950/40 scale-[1.01]'
          : 'border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 hover:border-brand-400 dark:hover:border-brand-500 hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
      } shadow-sm hover:shadow-md ${className}`}
    >
      <input
        ref={fileInputRef}
        id="docunexa-file-input"
        data-testid="file-input"
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
      />

      <div className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
        {/* Upload Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-200">
          <UploadCloud size={32} />
        </div>

        {/* Text */}
        <div>
          <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
            {title}
          </h3>
          <p className="text-xs md:text-sm text-slate-700 dark:text-slate-200 mt-1">
            {subtitle}
          </p>
        </div>

        {/* Action Button Indicator */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 group-hover:bg-brand-700 text-white text-xs md:text-sm font-semibold shadow-sm transition-colors">
          <Plus size={16} />
          <span>Choose {multiple ? 'Files' : 'File'}</span>
        </div>

        {/* Formats & Privacy Guarantee */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 text-[11px] text-slate-600 dark:text-slate-300">
          <span>{supportedFormats}</span>
          <span className="hidden sm:inline">•</span>
          <span className="text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            100% Client-Side Safe
          </span>
        </div>
      </div>
    </div>
  );
};
