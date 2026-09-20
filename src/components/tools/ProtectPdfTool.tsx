'use client';

import React, { useState } from 'react';
import { PdfDropzone } from '@/components/common/PdfDropzone';
import { ProcessingProgress } from '@/components/common/ProcessingProgress';
import { ResultPanel, ResultFileItem } from '@/components/common/ResultPanel';
import { getPdfJs, getPdfJsDocumentParams } from '@/lib/pdfReader';
import { encryptPdfFile } from '@/lib/pdfEngine';
import { PDFDocument } from 'pdf-lib';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Printer,
  Copy,
  Edit3
} from 'lucide-react';

export function ProtectPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);

  // Password fields
  const [password, setPassword] = useState<string>('');
  const [repeatPassword, setRepeatPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState<boolean>(false);

  // Permissions
  const [allowPrinting, setAllowPrinting] = useState<boolean>(true);
  const [allowCopying, setAllowCopying] = useState<boolean>(false);
  const [allowModifying, setAllowModifying] = useState<boolean>(false);

  // Processing & Results
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [resultFiles, setResultFiles] = useState<ResultFileItem[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setErrorMessage(null);
    setResultFiles(null);
    setPassword('');
    setRepeatPassword('');

    try {
      const buffer = await selected.arrayBuffer();
      const pdfjs = await getPdfJs();
      const task = pdfjs.getDocument(getPdfJsDocumentParams(buffer));
      const doc = await task.promise;

      setFile(selected);
      setFileBuffer(buffer);
      setPageCount(doc.numPages);
    } catch (err: any) {
      console.error('Failed to read PDF:', err);
      setErrorMessage('The selected file could not be read or is already encrypted.');
      setFile(null);
      setFileBuffer(null);
      setPageCount(0);
    }
  };

  // Validation
  const hasMinLength = password.length >= 6;
  const passwordsMatch = password.length > 0 && password === repeatPassword;
  const isFormValid = file !== null && fileBuffer !== null && hasMinLength && passwordsMatch;

  const handleProtectPdf = async () => {
    if (!isFormValid || !file || !fileBuffer) return;

    setIsProcessing(true);
    setProgress(20);
    setProgressStatus('Initializing AES-256 standard encryption...');
    setErrorMessage(null);

    try {
      const freshBuf = await file.arrayBuffer();
      await new Promise((r) => setTimeout(r, 150));
      setProgress(50);
      setProgressStatus('Applying password security & permission locks...');

      const protectedBytes = await encryptPdfFile(freshBuf, password, {
        allowPrinting,
        allowCopying,
        allowModifying,
      });

      setProgress(80);
      setProgressStatus('Verifying protected PDF output integrity...');

      // Acceptance Verification: Ensure that attempting to load without password throws encryption error
      let verifiedLocked = false;
      try {
        await PDFDocument.load(protectedBytes);
      } catch (e: any) {
        // Expected behavior: document is encrypted and rejects unauthenticated load
        verifiedLocked = true;
      }

      if (!verifiedLocked) {
        throw new Error('Encryption verification failed: output document was not properly locked.');
      }

      setProgress(100);
      setProgressStatus('PDF protected successfully!');
      await new Promise((r) => setTimeout(r, 200));

      const outputFilename = `${file.name.replace(/\.pdf$/i, '')}-protected.pdf`;

      setResultFiles([
        {
          name: outputFilename,
          bytes: protectedBytes,
          size: protectedBytes.byteLength,
        },
      ]);
    } catch (err: any) {
      console.error('Encryption error:', err);
      setErrorMessage(err.message || 'An error occurred while protecting the PDF file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setFileBuffer(null);
    setPageCount(0);
    setPassword('');
    setRepeatPassword('');
    setResultFiles(null);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-8">
      {/* Result Panel when complete */}
      {resultFiles ? (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <h4 className="font-bold text-sm sm:text-base">PDF Protected Successfully!</h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Your document is encrypted with industry-standard AES-256 encryption. Anyone opening it will be required to enter your password.
              </p>
            </div>
          </div>
          <ResultPanel files={resultFiles} onReset={resetAll} />
        </div>
      ) : isProcessing ? (
        <ProcessingProgress progress={progress} statusText={progressStatus} />
      ) : (
        <div className="space-y-8">
          {/* STEP 1: Upload Dropzone if no file selected */}
          {!file ? (
            <PdfDropzone
              onFilesSelected={handleFileSelected}
              accept=".pdf,application/pdf"
              multiple={false}
              title="Select PDF file to protect"
              subtitle="Choose a PDF document from your device to encrypt with AES-256 security"
            />
          ) : (
            <div className="space-y-6">
              {/* STEP 2: File Info Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                      {file.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                      <span>•</span>
                      <span>{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Ready to encrypt</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetAll}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw size={13} />
                  Change PDF
                </button>
              </div>

              {/* STEP 3 & 4: Password Form & Validation */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <Lock size={18} className="text-brand-600 dark:text-brand-400" />
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Set Document Password
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Password field */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Type password..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className={`text-[11px] ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>
                      {hasMinLength ? '✓ Meets minimum length' : 'Minimum 6 characters'}
                    </p>
                  </div>

                  {/* Repeat password field */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Repeat Password
                    </label>
                    <div className="relative">
                      <input
                        type={showRepeatPassword ? 'text' : 'password'}
                        value={repeatPassword}
                        onChange={(e) => setRepeatPassword(e.target.value)}
                        placeholder="Repeat password..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                        aria-label={showRepeatPassword ? 'Hide repeat password' : 'Show repeat password'}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showRepeatPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className={`text-[11px] ${passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : repeatPassword ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}`}>
                      {passwordsMatch ? '✓ Passwords match' : repeatPassword ? '✗ Passwords do not match' : 'Re-enter identical password'}
                    </p>
                  </div>
                </div>

                {/* Permissions configuration */}
                <div className="pt-2 space-y-3">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Document Permissions
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowPrinting}
                        onChange={(e) => setAllowPrinting(e.target.checked)}
                        className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                      />
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                        <Printer size={14} /> Allow Printing
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowCopying}
                        onChange={(e) => setAllowCopying(e.target.checked)}
                        className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                      />
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                        <Copy size={14} /> Allow Copying Text
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowModifying}
                        onChange={(e) => setAllowModifying(e.target.checked)}
                        className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                      />
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                        <Edit3 size={14} /> Allow Modifying
                      </div>
                    </label>
                  </div>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* STEP 5: Main Button (Enabled ONLY when valid) */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={!isFormValid || isProcessing}
                    onClick={handleProtectPdf}
                    className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                      isFormValid
                        ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/25 cursor-pointer transform hover:-translate-y-0.5'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <ShieldCheck size={18} />
                    <span>Protect PDF</span>
                  </button>

                  {!isFormValid && (
                    <p className="text-center text-[11px] text-slate-600 dark:text-slate-300 mt-2">
                      {!hasMinLength
                        ? 'Password must be at least 6 characters'
                        : !passwordsMatch
                        ? 'Passwords do not match'
                        : 'Please complete the password fields to continue'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
