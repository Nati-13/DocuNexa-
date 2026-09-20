'use client';

import React, { useState } from 'react';
import { PdfDropzone } from '@/components/common/PdfDropzone';
import { ResultPanel, ResultFileItem } from '@/components/common/ResultPanel';
import { getPdfJs, getPdfJsDocumentParams } from '@/lib/pdfReader';
import { detectPdfFormFields, fillPdfForm, FormFieldInfo } from '@/lib/tools/pdfForms';
import { sanitizeDownloadFilename } from '@/lib/downloadContract';
import { PDFDocument } from 'pdf-lib';
import { normalizePdfInput } from '@/lib/pdfInputNormalizer';
import { PdfWorkspace } from '@/components/pdf/PdfWorkspace';
import {
  CheckSquare,
  FileText,
  AlertCircle,
  Sparkles,
  Info,
  AlertTriangle,
  Layers
} from 'lucide-react';

export function PdfFormsTool() {
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Form detection state
  const [formFields, setFormFields] = useState<FormFieldInfo[] | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string | boolean>>({});
  const [hasScannedNotice, setHasScannedNotice] = useState<boolean>(false);
  const [xfaNotice, setXfaNotice] = useState<string | null>(null);

  // Processing & Results
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultFiles, setResultFiles] = useState<ResultFileItem[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setErrorMessage(null);
    setResultFiles(null);
    setHasScannedNotice(false);
    setXfaNotice(null);

    try {
      const norm = await normalizePdfInput(selected, { toolName: 'PDF Forms' });
      const pdfjs = await getPdfJs();
      const task = pdfjs.getDocument(getPdfJsDocumentParams(norm.uint8Array.slice(0)));
      const doc = await task.promise;

      setFile(selected);
      setFileBuffer(norm.arrayBuffer);
      setTotalPages(doc.numPages);

      // Detect fields
      const detection = await detectPdfFormFields(norm.arrayBuffer);
      if (detection.isXfa && detection.xfaNotice) {
        setXfaNotice(detection.xfaNotice);
      } else if (!detection.hasForm || detection.fields.length === 0) {
        setHasScannedNotice(true);
        setFormFields([]);
      } else {
        setFormFields(detection.fields);
        const initialVals: Record<string, string | boolean> = {};
        detection.fields.forEach((f) => {
          initialVals[f.name] = f.value;
        });
        setFormValues(initialVals);
      }
    } catch (err: any) {
      console.error('Failed to load PDF for forms:', err);
      setErrorMessage(err.message || 'The selected file could not be read or is corrupted.');
    }
  };

  const handleFieldValueChange = (name: string, val: string | boolean) => {
    setFormValues((prev) => ({ ...prev, [name]: val }));
  };

  const handleApplyFormFill = async () => {
    if (!file || !fileBuffer) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const norm = await normalizePdfInput(file, { toolName: 'PDF Forms' });
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const fillResult = await fillPdfForm(norm.arrayBuffer, formValues, baseName);

      // Verify output
      const verifiedDoc = await PDFDocument.load(fillResult.bytes.slice(0));
      if (verifiedDoc.getPageCount() === 0) {
        throw new Error('Form filling failed: Output PDF contains 0 pages.');
      }

      setResultFiles([
        {
          name: fillResult.filename,
          bytes: fillResult.bytes,
          size: fillResult.bytes.byteLength,
        },
      ]);
    } catch (err: any) {
      console.error('Form filling error:', err);
      setErrorMessage(err.message || 'Failed to fill PDF form.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setFileBuffer(null);
    setResultFiles(null);
    setErrorMessage(null);
    setFormFields(null);
    setFormValues({});
    setHasScannedNotice(false);
    setXfaNotice(null);
  };

  if (resultFiles) {
    return (
      <ResultPanel
        title="Form Filled Successfully!"
        subtitle="Your responses have been committed into the PDF AcroForm fields."
        files={resultFiles}
        onReset={handleReset}
      />
    );
  }

  if (file && fileBuffer) {
    return (
      <div className="w-full space-y-4">
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <PdfWorkspace
          title="Fill PDF Forms — Visual Interactive Editor"
          filename={file.name}
          totalPages={totalPages}
          pdfBuffer={fileBuffer}
          mode="forms"
          formWidgets={
            formFields && formFields.length > 0
              ? formFields.map((f, i) => ({
                  name: f.name,
                  type: (f.type as any) || 'text',
                  rect: { x: 30, y: 100 + i * 40, width: 220, height: 26 },
                  value: formValues[f.name] ?? '',
                  options: f.options,
                  onChange: (val) => handleFieldValueChange(f.name, val),
                }))
              : []
          }
          onApply={handleApplyFormFill}
          onReset={handleReset}
          isProcessing={isProcessing}
          disabledApplyReason={
            xfaNotice
              ? 'Dynamic XFA forms cannot be modified client-side'
              : hasScannedNotice
              ? 'No editable AcroForm fields detected in document'
              : undefined
          }
          applyButtonLabel="Export Completed PDF Form"
        >
          {/* Side Panel Form Field Editor */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Form Fields ({formFields ? formFields.length : 0})
              </label>
              {formFields && formFields.length > 0 && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckSquare size={12} /> Interactive AcroForm
                </span>
              )}
            </div>

            {xfaNotice ? (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle size={15} />
                  <span>Adobe XFA Detected</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {xfaNotice}
                </p>
              </div>
            ) : hasScannedNotice ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <Info size={15} className="text-brand-500" />
                  <span>Flat Document (No AcroForms)</span>
                </div>
                <p className="leading-relaxed">
                  This PDF contains static text/scanned pages rather than digital interactive AcroForm fields.
                </p>
                <p className="text-[11px] text-slate-500">
                  Tip: To add text anywhere on this document, use the <strong>Edit PDF</strong> or <strong>Sign PDF</strong> tools.
                </p>
              </div>
            ) : formFields && formFields.length > 0 ? (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {formFields.map((field) => (
                  <div
                    key={field.name}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {field.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
                        {field.type}
                      </span>
                    </div>

                    {field.type === 'checkbox' ? (
                      <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={Boolean(formValues[field.name])}
                          onChange={(e) => handleFieldValueChange(field.name, e.target.checked)}
                          className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          {Boolean(formValues[field.name]) ? 'Checked' : 'Unchecked'}
                        </span>
                      </label>
                    ) : field.type === 'dropdown' && field.options && field.options.length > 0 ? (
                      <select
                        value={(formValues[field.name] as string) || ''}
                        onChange={(e) => handleFieldValueChange(field.name, e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        {field.options.map((opt, oIdx) => (
                          <option key={oIdx} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={(formValues[field.name] as string) || ''}
                        onChange={(e) => handleFieldValueChange(field.name, e.target.value)}
                        placeholder="Enter value..."
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-1 focus:ring-brand-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </PdfWorkspace>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Fill PDF Forms
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Inspect, fill, and export interactive AcroForm PDF documents with real-time field preview and zero data loss.
        </p>
      </div>

      <PdfDropzone
        onFilesSelected={handleFileSelected}
        accept=".pdf,application/pdf"
        title="Drop a PDF Form to Fill"
        subtitle="Genuine AcroForm scanning • Interactive typing • 100% Client-Side & Free"
      />
    </div>
  );
}
