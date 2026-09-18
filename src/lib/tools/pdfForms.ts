import { PDFDocument } from 'pdf-lib';

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
}

/**
 * Scans a PDF document for genuine interactive AcroForm fields using pdf-lib's PDFForm API.
 */
export async function detectPdfFormFields(pdfBuffer: ArrayBuffer): Promise<DetectFormFieldsResult> {
  const doc = await PDFDocument.load(pdfBuffer.slice(0), { ignoreEncryption: true });

  let form: any = null;
  try {
    form = doc.getForm();
  } catch {
    return { hasForm: false, fields: [] };
  }

  if (!form) {
    return { hasForm: false, fields: [] };
  }

  let rawFields: any[] = [];
  try {
    rawFields = form.getFields();
  } catch {
    return { hasForm: false, fields: [] };
  }

  if (!rawFields || rawFields.length === 0) {
    return { hasForm: false, fields: [] };
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
  };
}

/**
 * Populates form fields with user-provided values and exports the filled PDF.
 */
export async function fillPdfForm(
  pdfBuffer: ArrayBuffer,
  fieldValues: Record<string, string | boolean>,
  baseName: string
): Promise<{ filename: string; bytes: Uint8Array }> {
  const doc = await PDFDocument.load(pdfBuffer.slice(0), { ignoreEncryption: true });
  const form = doc.getForm();

  for (const [name, val] of Object.entries(fieldValues)) {
    try {
      // Try text field
      try {
        const tf = form.getTextField(name);
        tf.setText(String(val));
        continue;
      } catch {}

      // Try checkbox
      try {
        const cb = form.getCheckBox(name);
        if (val === true || val === 'true') {
          cb.check();
        } else {
          cb.uncheck();
        }
        continue;
      } catch {}

      // Try dropdown
      try {
        const dd = form.getDropdown(name);
        if (typeof val === 'string') {
          dd.select(val);
        }
        continue;
      } catch {}

      // Try radio group
      try {
        const rg = form.getRadioGroup(name);
        if (typeof val === 'string') {
          rg.select(val);
        }
        continue;
      } catch {}
    } catch {
      // Ignore failures on individual non-editable fields
    }
  }

  const filledBytes = await doc.save();
  return {
    filename: `${baseName} - (Filled).pdf`,
    bytes: filledBytes,
  };
}
