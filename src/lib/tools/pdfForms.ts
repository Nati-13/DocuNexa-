import { PDFDocument, PDFName } from 'pdf-lib';

export type FormFieldType = 'text' | 'checkbox' | 'dropdown' | 'radio' | 'unknown';

export interface FormFieldInfo {
  name: string;
  type: FormFieldType;
  value: string | boolean;
  options?: string[];
  isReadOnly: boolean;
}

export interface DetectFormFieldsResult {
  hasForm: boolean;
  fields: FormFieldInfo[];
  isXfa?: boolean;
  xfaNotice?: string;
}

/**
 * Scans a PDF document for genuine interactive AcroForm fields using pdf-lib's PDFForm API.
 * Accurately detects unsupported proprietary form technologies (such as Adobe XFA).
 */
export async function detectPdfFormFields(pdfBuffer: ArrayBuffer): Promise<DetectFormFieldsResult> {
  const doc = await PDFDocument.load(pdfBuffer.slice(0), { ignoreEncryption: true });

  // Detect proprietary Adobe XFA forms
  let isXfa = false;
  try {
    const root = doc.context.lookup(doc.context.trailerInfo.Root) as any;
    const acroForm = root?.get?.(PDFName.of('AcroForm'));
    if (acroForm && typeof acroForm.has === 'function') {
      isXfa = acroForm.has(PDFName.of('XFA'));
    }
  } catch {}

  const xfaNotice = isXfa
    ? 'This document uses Adobe XML Forms Architecture (XFA), which is a proprietary dynamic form format distinct from standard AcroForms. Dynamic XFA fields cannot be modified client-side.'
    : undefined;

  let form: any = null;
  try {
    form = doc.getForm();
  } catch {
    return { hasForm: false, fields: [], isXfa, xfaNotice };
  }

  if (!form) {
    return { hasForm: false, fields: [], isXfa, xfaNotice };
  }

  let rawFields: any[] = [];
  try {
    rawFields = form.getFields();
  } catch {
    return { hasForm: false, fields: [], isXfa, xfaNotice };
  }

  if (!rawFields || rawFields.length === 0) {
    return { hasForm: false, fields: [], isXfa, xfaNotice };
  }

  const fields: FormFieldInfo[] = [];

  for (const f of rawFields) {
    try {
      const name = typeof f.getName === 'function' ? f.getName() : 'unnamed_field';
      const ctorName = f.constructor?.name || '';
      let type: FormFieldType = 'unknown';
      let value: string | boolean = '';
      let options: string[] | undefined;
      const isReadOnly = typeof f.isReadOnly === 'function' ? f.isReadOnly() : false;

      if (ctorName === 'PDFTextField' || typeof f.getText === 'function') {
        type = 'text';
        value = typeof f.getText === 'function' ? f.getText() || '' : '';
      } else if (ctorName === 'PDFCheckBox' || typeof f.isChecked === 'function') {
        type = 'checkbox';
        value = typeof f.isChecked === 'function' ? f.isChecked() : false;
      } else if (ctorName === 'PDFDropdown' || typeof f.getOptions === 'function') {
        type = 'dropdown';
        options = typeof f.getOptions === 'function' ? f.getOptions() : [];
        const selected = typeof f.getSelected === 'function' ? f.getSelected() : [];
        value = selected.length > 0 ? selected[0] : '';
      } else if (ctorName === 'PDFRadioGroup') {
        type = 'radio';
        options = typeof f.getOptions === 'function' ? f.getOptions() : [];
        value = typeof f.getSelected === 'function' ? f.getSelected() || '' : '';
      } else if (ctorName === 'PDFOptionList') {
        type = 'dropdown';
        options = typeof f.getOptions === 'function' ? f.getOptions() : [];
        const selected = typeof f.getSelected === 'function' ? f.getSelected() : [];
        value = selected.length > 0 ? selected[0] : '';
      }

      fields.push({
        name,
        type,
        value,
        options,
        isReadOnly,
      });
    } catch {
      // Continue inspecting remaining fields
    }
  }

  return {
    hasForm: fields.length > 0,
    fields,
    isXfa,
    xfaNotice,
  };
}

/**
 * Populates form fields with user-provided values and exports the filled PDF.
 * Validates that the document actually contains editable AcroForm fields.
 */
export async function fillPdfForm(
  pdfBuffer: ArrayBuffer,
  fieldValues: Record<string, string | boolean>,
  baseName: string
): Promise<{ filename: string; bytes: Uint8Array; modifiedCount: number }> {
  const doc = await PDFDocument.load(pdfBuffer.slice(0), { ignoreEncryption: true });

  // Detect proprietary Adobe XFA forms
  try {
    const root = doc.context.lookup(doc.context.trailerInfo.Root) as any;
    const acroForm = root?.get?.(PDFName.of('AcroForm'));
    if (acroForm && typeof acroForm.has === 'function' && acroForm.has(PDFName.of('XFA'))) {
      throw new Error(
        'Unsupported Form Technology: This document uses Adobe XML Forms Architecture (XFA). Dynamic XFA fields cannot be modified client-side.'
      );
    }
  } catch (err: any) {
    if (err.message && err.message.includes('Unsupported Form Technology')) {
      throw err;
    }
  }

  let form: any;
  try {
    form = doc.getForm();
  } catch {
    throw new Error('This document does not contain an interactive AcroForm structure.');
  }

  if (!form) {
    throw new Error('This document does not contain an interactive AcroForm structure.');
  }

  let rawFields: any[] = [];
  try {
    rawFields = form.getFields();
  } catch {
    throw new Error('This document does not contain any readable interactive form fields.');
  }

  if (!rawFields || rawFields.length === 0) {
    throw new Error('This document contains no interactive AcroForm fields that can be edited.');
  }

  const editableFields = rawFields.filter((f) => (typeof f.isReadOnly === 'function' ? !f.isReadOnly() : true));
  if (editableFields.length === 0) {
    throw new Error('All form fields in this document are marked read-only and cannot be modified.');
  }

  let modifiedCount = 0;

  for (const [name, val] of Object.entries(fieldValues)) {
    try {
      // Try text field
      try {
        const tf = form.getTextField(name);
        if (typeof tf.isReadOnly === 'function' && tf.isReadOnly()) continue;
        const strVal = String(val ?? '');
        try {
          tf.setText(strVal);
        } catch {
          tf.setText(strVal.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, ' '));
        }
        modifiedCount++;
        continue;
      } catch {}

      // Try checkbox
      try {
        const cb = form.getCheckBox(name);
        if (typeof cb.isReadOnly === 'function' && cb.isReadOnly()) continue;
        if (val === true || val === 'true' || val === '1' || val === 'on') {
          cb.check();
        } else {
          cb.uncheck();
        }
        modifiedCount++;
        continue;
      } catch {}

      // Try dropdown
      try {
        const dd = form.getDropdown(name);
        if (typeof dd.isReadOnly === 'function' && dd.isReadOnly()) continue;
        if (typeof val === 'string' && val.length > 0) {
          const opts = dd.getOptions();
          if (opts.includes(val)) {
            dd.select(val);
          } else if (opts.length > 0) {
            dd.select(opts[0]);
          }
        }
        modifiedCount++;
        continue;
      } catch {}

      // Try radio group
      try {
        const rg = form.getRadioGroup(name);
        if (typeof rg.isReadOnly === 'function' && rg.isReadOnly()) continue;
        if (typeof val === 'string' && val.length > 0) {
          const opts = rg.getOptions();
          if (opts.includes(val)) {
            rg.select(val);
          }
        }
        modifiedCount++;
        continue;
      } catch {}
    } catch {
      // Ignore failures on individual fields
    }
  }

  const filledBytes = await doc.save();
  const verifyDoc = await PDFDocument.load(filledBytes);
  if (verifyDoc.getPageCount() === 0) {
    throw new Error('Form export verification failed: Output PDF contains 0 pages.');
  }

  return {
    filename: `${baseName} - (Filled).pdf`,
    bytes: filledBytes,
    modifiedCount,
  };
}
