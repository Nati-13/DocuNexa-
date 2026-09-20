'use client';

import React, { useState } from 'react';
import { PdfDropzone } from '@/components/common/PdfDropzone';
import { ProcessingProgress } from '@/components/common/ProcessingProgress';
import { ResultPanel, ResultFileItem } from '@/components/common/ResultPanel';
import { decryptPdfFile, checkPdfIsEncrypted } from '@/lib/pdfEngine';
import { PDFDocument } from 'pdf-lib';
import { 
  Unlock, 
  Eye, 
  EyeOff, 
  KeyRound, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw 
} from 'lucide-react';

export function UnlockPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

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

    try {
      const buffer = await selected.arrayBuffer();
      const encInfo = await checkPdfIsEncrypted(buffer);

      if (!encInfo.encrypted) {
        // Warning if not encrypted, but still allow proceeding or inform user
        console.log('PDF is not encrypted according to header.');
      }

      setFile(selected);
      setFileBuffer(buffer);
    } catch (err: any) {
      console.error('File inspection error:', err);
      setFile(selected);
      setFileBuffer(await selected.arrayBuffer());
    }
  };

  const isFormValid = file !== null && fileBuffer !== null && password.trim().length > 0;

  const handleUnlockPdf = async () => {
    if (!isFormValid || !file || !fileBuffer) return;

    setIsProcessing(true);
    setProgress(25);
    setProgressStatus('Decrypting PDF cryptographic layers...');
    setErrorMessage(null);

    try {
      const freshBuf = await file.arrayBuffer();
      await new Promise((r) => setTimeout(r, 150));
      setProgress(60);
      setProgressStatus('Authenticating document cipher...');

      let decryptedBytes: Uint8Array;
      try {
        decryptedBytes = await decryptPdfFile(freshBuf, password);
      } catch (decryptErr: any) {
        throw new Error('Incorrect password or unable to unlock this PDF.');
      }

      setProgress(85);
      setProgressStatus('Verifying unlocked PDF readability...');

      // Post-processing Verification: Confirm decrypted bytes load cleanly with zero password
      let unlockedDoc: PDFDocument;
      try {
        unlockedDoc = await PDFDocument.load(decryptedBytes);
      } catch (verifyErr: any) {
        throw new Error('Incorrect password or unable to unlock this PDF.');
      }

      const verifiedPages = unlockedDoc.getPageCount();
      if (verifiedPages === 0) {
        throw new Error('Verification failed: decrypted document has 0 pages.');
      }

      setProgress(100);
      setProgressStatus('Document unlocked successfully!');
      await new Promise((r) => setTimeout(r, 150));

      const outputFilename = `${file.name.replace(/-protected/i, '').replace(/\.pdf$/i, '')}-unlocked.pdf`;

      setResultFiles([
        {
          name: outputFilename,
          bytes: decryptedBytes,
          size: decryptedBytes.byteLength,
        },
      ]);
    } catch (err: any) {
      console.error('Decryption failed:', err);
      setErrorMessage(err.message || 'Incorrect password or unable to unlock this PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setFileBuffer(null);
    setPassword('');
    setResultFiles(null);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-8">
      {resultFiles ? (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <h4 className="font-bold text-sm sm:text-base">PDF Unlocked Successfully!</h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                The password security and permission restrictions have been completely removed. Your downloaded document will open freely.
              </p>
            </div>
          </div>
          <ResultPanel files={resultFiles} onReset={resetAll} />
        </div>
      ) : isProcessing ? (
        <ProcessingProgress progress={progress} statusText={progressStatus} />
      ) : (
        <div className="space-y-8">
          {!file ? (
            <PdfDropzone
              onFilesSelected={handleFileSelected}
              accept=".pdf,application/pdf"
              multiple={false}
              title="Select password-protected PDF"
              subtitle="Upload an encrypted PDF file to remove its password and restrictions"
            />
          ) : (
            <div className="space-y-6">
              {/* File Info */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                      {file.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                      <span>•</span>
                      <span className="text-amber-600 dark:text-amber-400 font-medium">Locked Document</span>
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

              {/* Password Input */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <KeyRound size={18} className="text-brand-600 dark:text-brand-400" />
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Enter Document Password
                  </h3>
                </div>

                <div className="space-y-2 max-w-md">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    PDF Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="Enter the PDF password..."
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
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Passwords are never sent to a server or recorded. Decryption is performed entirely inside your browser.
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={!isFormValid || isProcessing}
                    onClick={handleUnlockPdf}
                    className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                      isFormValid
                        ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/25 cursor-pointer transform hover:-translate-y-0.5'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <Unlock size={18} />
                    <span>Unlock PDF</span>
                  </button>

                  {!isFormValid && (
                    <p className="text-center text-[11px] text-slate-600 dark:text-slate-300 mt-2">
                      Please enter the document password to enable unlocking
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
