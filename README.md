# DocuNexa

> **"Every PDF tool. One simple workspace."**

DocuNexa is a **100% completely free, privacy-first PDF and document productivity platform** built to make document work accessible, effortless, and fast for students, educators, researchers, and professionals worldwide.

DocuNexa is released as a public good resource:
- **Zero paid plans or subscriptions**
- **Zero paywalls or daily document throttles**
- **Zero account registration required**
- **100% client-side in-browser privacy** (your confidential files never leave your computer)

---

## 🌟 Flagship Features

### 1. 📚 PDF Unit Cutter
Specially crafted for educators and students who need to decompose massive textbooks (300+ pages) into focused modular lesson files:
- **Automatic Unit Detection**: Scans bookmarks, outlines, and header hierarchies.
- **Table of Contents Assistant**: Automatically matches page numbers to chapter titles.
- **Visual Overlap & Missing Page Auditing**: Real-time warnings for page gaps or overlaps.
- **Direct Folder Saving**: Uses the standard **File System Access API** (Chrome, Edge) to write slices directly into your chosen directory on disk without manual unzipping.
- **ZIP Bundle Fallback**: Universal fallback for Firefox, Safari, and mobile browsers.

---

## 🛠️ Complete Tool Suite (34 Tools Across 7 Categories)

### 📂 Organize PDF
- **PDF Unit Cutter**: Intelligently divide textbooks into clean chapters.
- **Merge PDF**: Combine multiple PDFs into a single unified file with drag-and-drop reordering.
- **Split PDF**: Extract ranges (`1-5, 6-10`) or chunk into equal parts every *N* pages.
- **Remove Pages**: Interactive page grid selector to delete unwanted pages.
- **Extract Pages**: Select and isolate specific pages into a new clean document.
- **Organize PDF**: Reorder, rotate, and sort individual pages visually.
- **Scan to PDF**: Capture camera snaps or photos and compile into high-res PDF.

### ⚡ Optimize PDF
- **Compress PDF**: Lossless stream compaction and object dictionary optimization.
- **Repair PDF**: Reconstruct corrupted PDF cross-reference tables and broken headers.
- **OCR PDF**: Multilingual optical character recognition (English, Amharic, etc.).

### 🔄 Convert to PDF
- **JPG to PDF**: Compile images (JPG, PNG, WEBP) with customizable margins and page sizes.
- **Word to PDF**: Convert `.docx` manuscripts into formatted PDFs.
- **PowerPoint to PDF**: Convert `.pptx` presentations into slide-based PDFs.
- **Excel to PDF**: Transform spreadsheets (`.xlsx`, `.csv`) into structured printable tables.
- **HTML to PDF**: Convert web pages and HTML markup into clean PDF format.

### 📄 Convert from PDF
- **PDF to JPG**: Render every page as high-res images with single or ZIP download.
- **PDF to Word**: Extract text structures into editable `.docx` files.
- **PDF to PowerPoint**: Extract slide presentations into `.pptx` decks.
- **PDF to Excel**: Tabular data extraction into structured `.csv` / `.xlsx` sheets.
- **PDF to PDF/A**: Inject ISO-19005 standard archiving metadata for long-term storage.

### ✏️ Edit PDF
- **Rotate PDF**: Rotate individual or all pages clockwise by 90°, 180°, or 270°.
- **Add Page Numbers**: Custom positions, page ranges, starting offsets, and styles.
- **Add Watermark**: Stamp text watermarks with custom opacity, rotation, and font size.
- **Crop PDF**: Trim outer scanner margins, headers, or footers losslessly.
- **Edit PDF**: Add text annotations, shapes, and highlights directly onto documents.
- **PDF Forms**: Fill and save interactive AcroForm fields.

### 🔒 PDF Security
- **Protect PDF**: Genuine **AES-256 standard encryption** with configurable permission locks (printing, copying, modifying). The resulting PDF strictly requires your password in all standard PDF readers (Adobe Acrobat, Chrome, Preview).
- **Unlock PDF**: Authenticate and strip passwords from encrypted PDFs locally.
- **Sign PDF**: Place visual signatures (drawn on canvas, typed with calligraphic font, or uploaded PNG) onto any page.
- **Redact PDF**: Apply permanent blackout zones to obscure confidential headers and sensitive data.
- **Compare PDF**: Dual-document side-by-side discrepancy auditor showing page count diffs and text differences.

### 🧠 PDF Intelligence
- **AI Summarizer**: Generate executive summaries, key takeaways, and study questions.
- **Translate PDF**: Multilingual translation between English, Amharic, Spanish, French, and German.
- **PDF to Markdown**: Convert document structures into clean GitHub-flavored Markdown.

---

## 📊 Functional Classification Matrix (Audit of All 34 Tools)

DocuNexa is committed to complete engineering honesty and transparency. Every tool is categorized across four operational tiers:

| Tier | Tools | Implementation Status & Honest Disclosures |
| :--- | :--- | :--- |
| **Fully Working** (24 Tools) | **PDF Unit Cutter**, **Merge PDF**, **Split PDF**, **Remove Pages**, **Extract Pages**, **Organize PDF**, **Compress PDF**, **Rotate PDF**, **Add Page Numbers**, **Add Watermark**, **Crop PDF**, **Protect PDF** (AES-256), **Unlock PDF**, **Sign PDF**, **Compare PDF**, **JPG to PDF**, **PDF to JPG**, **Scan to PDF**, **PDF Forms** (AcroForm read/fill), **PDF to Excel** (SheetJS `.xlsx`), **PDF to Word** (genuine `.docx`), **PDF to PowerPoint** (`.pptx`), **PDF to Markdown**, **HTML to PDF** | 100% functional client-side engines. Real file outputs verified with unit tests and ZIP package inspections. |
| **Partially Working** (4 Tools) | **Word to PDF**, **Excel to PDF**, **PowerPoint to PDF**, **Repair PDF** | Office-to-PDF uses structured content and table reconstruction. Repair PDF performs conservative cross-reference table and page dictionary recovery (unrecoverable streams return diagnostic error). |
| **Limited by Technical Constraint** (6 Tools) | **Redact PDF**, **PDF to PDF/A**, **OCR PDF**, **Edit PDF**, **AI Summarizer**, **Translate PDF** | • **Redact PDF**: Visual blackout overlay (underlying text stream is not destroyed without vector sanitation).<br>• **PDF to PDF/A**: ISO-19005 metadata injection (experimental; not certified).<br>• **OCR PDF**: Client Web Worker Tesseract.js (dependent on image contrast & browser memory).<br>• **Edit PDF**: Canvas annotation layer.<br>• **Document Summarizer & Translate**: Local rule-based heuristic intelligence engine (labeled honestly as *Local Document Summarizer* and *Basic Local Translation* unless an external LLM API key is supplied). |
| **Not Implemented** (0 Tools) | *None* | Zero fake or placeholder fallback tools. The generic reloading fallback has been permanently eradicated. |

---

## 🔒 Privacy & Architecture

1. **Local Browser Processing**: Unlike legacy online PDF converters that upload your confidential files to remote third-party servers, DocuNexa executes PDF parsing, slicing, encryption, and decryption **locally in your browser sandbox** via WebAssembly and JavaScript.
2. **Zero File Retention**: We do not possess servers that retain your documents. Closing your browser tab permanently purges all loaded files from memory.
3. **No Passwords Stored**: When encrypting or unlocking files, your passwords are processed strictly in-memory using the standard Web Crypto API (`crypto.subtle`) and are never transmitted anywhere.

---

## 💻 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Components)
- **UI & Styling**: [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/)
- **PDF & Office Conversion Engines**:
  - [`pdf-lib`](https://pdf-lib.js.org/) (Lossless manipulation, merging, splitting, watermarking, stamping, AcroForms)
  - [`pdfjs-dist`](https://mozilla.github.io/pdf.js/) (High-fidelity client rendering & text extraction)
  - [`@pdfsmaller/pdf-encrypt`](https://github.com/pdfsmaller/pdf-encrypt) (Standard AES-256 PDF encryption)
  - [`@pdfsmaller/pdf-decrypt`](https://github.com/pdfsmaller/pdf-decrypt) (Standard PDF decryption)
  - [`xlsx`](https://sheetjs.com/) (Tabular dataset reconstruction and `.xlsx` generation)
  - [`docx`](https://docx.js.org/) (True OpenXML `.docx` Word document packaging)
  - [`pptxgenjs`](https://gitbrent.github.io/PptxGenJS/) (True OpenXML `.pptx` PowerPoint presentation generation)
  - [`mammoth`](https://github.com/mwilliamson/mammoth.js) (Word document HTML conversion)
  - [`tesseract.js`](https://tesseract.projectnaptha.com/) (Web Worker multilingual OCR engine)
  - [`jszip`](https://stuk.github.io/jszip/) (Client-side ZIP bundle packaging)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.18+ or 20+
- npm or yarn or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/docunexa.git
   cd docunexa
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) Copy environment template:
   ```bash
   cp .env.example .env.local
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run start
```

---

## 🌐 Browser Capabilities & Direct Folder Saving

DocuNexa leverages the modern W3C **File System Access API**:
- **Supported Browsers**: Google Chrome, Microsoft Edge, Brave, Opera (Desktop).
- **Behavior**: Prompts you to pick a target directory on your computer once. Slices are written directly to your disk, skipping ZIP download and extraction.
- **Fallback**: In Mozilla Firefox, Apple Safari, or mobile browsers, DocuNexa automatically compiles your outputs into a compressed `.zip` archive for immediate one-click download.

---

## 🤝 Contributing

DocuNexa is dedicated to remaining a completely free, open resource for everyone. Contributions are warmly welcomed:
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. Free for personal, educational, and commercial use without fees or restrictions.
