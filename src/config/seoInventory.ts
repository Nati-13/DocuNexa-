import { ALL_TOOLS, getToolBySlug } from './tools';
import { ToolCategory } from '@/types';

export interface ToolSeoRecord {
  slug: string;
  name: string;
  category: ToolCategory;
  title: string;
  description: string;
  h1: string;
  canonicalUrl: string;
  inputFormat: string;
  outputFormat: string;
  whatItDoes: string;
  capabilities: string[];
  limitations: string[];
  howToSteps: string[];
  keywords: string[];
  isFlagship?: boolean;
}

export const CANONICAL_BASE = 'https://docunexa.pro.et';

export const SEO_TOOL_RECORDS: ToolSeoRecord[] = [
  // 1. PDF Unit Cutter (Flagship)
  {
    slug: 'pdf-unit-cutter',
    name: 'PDF Unit Cutter',
    category: 'organize',
    isFlagship: true,
    title: 'PDF Unit Cutter — Split Textbooks & Documents by Chapters | DocuNexa',
    description:
      'Extract chapters, units, and sections from PDF textbooks. Features outline detection, TOC parsing with printed-page offset calibration, visual preview, and PDF export.',
    h1: 'PDF Unit Cutter',
    canonicalUrl: `${CANONICAL_BASE}/tools/pdf-unit-cutter`,
    inputFormat: 'PDF (.pdf)',
    outputFormat: 'PDF (.pdf), ZIP bundle (.zip), Project (.json)',
    whatItDoes:
      'PDF Unit Cutter analyzes multi-unit textbooks, syllabi, and long course documents to detect structural boundaries and split them into separate, cleanly organized chapter PDFs.',
    capabilities: [
      'Multi-engine structure detection: embedded PDF outline/bookmarks, Table of Contents parsing, and heading heuristics',
      'Automatic printed-page to PDF page offset calibration for accurate section boundaries',
      'Confidence indicators (High, Medium, Low) for each detected unit boundary',
      'Side-by-side Visual Structure Workspace with live PDF page preview',
      'Interactive section boundary editing: split, merge, adjust start/end page numbers',
      'Manual section creation for custom splits without pre-existing headings',
      'Export individual chapters as separate PDFs or as a packaged ZIP archive',
      'Save and restore cutting plans via lightweight JSON project files',
    ],
    limitations: [
      'Purely scanned image-only PDFs require running OCR PDF first to generate a text layer for heading and TOC detection',
      'Processing extremely large multi-gigabyte files is bounded by client device RAM and browser memory',
      'Non-standard heading numbering schemes may require manual boundary adjustment',
    ],
    howToSteps: [
      'Upload your textbook or course PDF document into the workspace.',
      'Click "Analyze & Detect Units" to run multi-engine structure detection.',
      'Review detected units, confidence scores, and preview page boundaries in the visual workspace.',
      'Adjust, split, or merge sections as needed, then click "Process & Download Units".',
    ],
    keywords: [
      'PDF Unit Cutter',
      'split textbook PDF',
      'split PDF by chapters',
      'split textbook into units',
      'extract chapters from PDF',
      'textbook splitter',
      'syllabus divider',
    ],
  },

  // 2. Split PDF
  {
    slug: 'split-pdf',
    name: 'Split PDF',
    category: 'organize',
    title: 'Split PDF Online — Divide PDF by Custom Page Ranges | DocuNexa',
    description:
      'Split PDF files into custom page ranges or separate equal page intervals directly in your browser. Fast, free, and private client-side processing.',
    h1: 'Split PDF',
    canonicalUrl: `${CANONICAL_BASE}/tools/split-pdf`,
    inputFormat: 'PDF (.pdf)',
    outputFormat: 'PDF (.pdf)',
    whatItDoes:
      'Split PDF divides a single document into multiple distinct PDF files based on custom page ranges or equal page increments.',
    capabilities: [
      'Split by arbitrary comma-separated ranges (e.g. 1-5, 6-10, 15)',
      'Split document into equal intervals of every N pages',
      'Visual thumbnail grid for quick page number reference',
      'Lossless page extraction preserving fonts, vector graphics, and metadata',
    ],
    limitations: [
      'Page numbers must be within valid document range',
      'Password-protected documents must be unlocked before splitting',
    ],
    howToSteps: [
      'Upload your PDF document into the dropzone.',
      'Select your preferred splitting mode: custom page ranges or every N pages.',
      'Enter the target page ranges or interval.',
      'Click "Process Document" to generate and download the split PDF parts.',
    ],
    keywords: ['split pdf', 'cut pdf', 'separate pdf pages', 'divide pdf', 'pdf page range splitter'],
  },

  // 3. Merge PDF
  {
    slug: 'merge-pdf',
    name: 'Merge PDF',
    category: 'organize',
    title: 'Merge PDF Online — Combine Multiple PDFs into One | DocuNexa',
    description:
      'Combine multiple PDF documents into a single organized file in your desired order. 100% client-side with zero file uploads for complete privacy.',
    h1: 'Merge PDF',
    canonicalUrl: `${CANONICAL_BASE}/tools/merge-pdf`,
    inputFormat: 'PDF (.pdf, 2 or more files)',
    outputFormat: 'PDF (.pdf)',
    whatItDoes:
      'Merge PDF joins two or more separate PDF files into a single, cohesive document arranged in the order you specify.',
    capabilities: [
      'Combine unlimited PDF documents in custom sequence',
      'Interactive file list with move-up, move-down, and removal controls',
      'Preserves original page orientations, vector graphics, and embedded fonts',
      'Fast client-side assembly using pdf-lib',
    ],
    limitations: [
      'Requires at least 2 PDF documents to perform a merge',
      'Encrypted or password-protected files must be unlocked prior to merging',
      'Very large multi-file batches are limited by client device memory',
    ],
    howToSteps: [
      'Select or drop two or more PDF files into the upload zone.',
      'Arrange files in your preferred sequence using the up/down controls.',
      'Click "Merge PDF" to compile documents into a single unified file.',
      'Download your merged PDF immediately.',
    ],
    keywords: ['merge pdf', 'combine pdf files', 'join pdf', 'concatenate pdf', 'put pdfs together'],
  },

  // 4. Remove Pages
  {
    slug: 'remove-pages',
    name: 'Remove Pages',
    category: 'organize',
    title: 'Remove Pages from PDF Online — Delete Unwanted Pages | DocuNexa',
    description:
      'Select and delete unwanted, blank, or duplicate pages from your PDF document in seconds. 100% private in-browser document editing.',
    h1: 'Remove Pages',
    canonicalUrl: `${CANONICAL_BASE}/tools/remove-pages`,
    inputFormat: 'PDF (.pdf)',
    outputFormat: 'PDF (.pdf)',
    whatItDoes:
      'Remove Pages lets you visually select unwanted, redundant, or blank pages from a PDF document and delete them permanently.',
    capabilities: [
      'Visual thumbnail grid showing every page of your document',
      'Click-to-select page deletion workflow with clear visual highlighting',
      'Delete multiple non-contiguous or contiguous pages in a single operation',
      'Preserves remaining page quality, text layers, and embedded media',
    ],
    limitations: [
      'At least one page must remain in the document; cannot delete all pages',
      'Initial thumbnail generation requires brief client-side rendering for long documents',
    ],
    howToSteps: [
      'Upload your PDF to view generated page thumbnails.',
      'Click the page thumbnails you wish to remove from the document.',
      'Review your selection and click "Remove Pages".',
      'Download the trimmed PDF document.',
    ],
    keywords: ['remove pages from pdf', 'delete pdf pages', 'cut pages out of pdf', 'remove blank pages pdf'],
  },

  // 5. Extract Pages
  {
    slug: 'extract-pages',
    name: 'Extract Pages',
    category: 'organize',
    title: 'Extract Pages from PDF Online — Save Specific Pages | DocuNexa',
    description:
      'Select specific pages from a PDF to generate a new standalone document. Private, browser-based extraction with zero file uploads.',
    h1: 'Extract Pages',
    canonicalUrl: `${CANONICAL_BASE}/tools/extract-pages`,
    inputFormat: 'PDF (.pdf)',
    outputFormat: 'PDF (.pdf)',
    whatItDoes:
      'Extract Pages isolates chosen pages from an existing PDF file and packages them into a fresh, standalone document.',
    capabilities: [
      'Interactive visual thumbnail grid for pinpoint page selection',
      'Extract any combination of contiguous or non-contiguous pages',
      'Retains exact resolution, vector paths, and searchable text of selected pages',
      'Quick single-click extraction directly in the browser',
    ],
    limitations: [
      'Must select at least one page to extract',
      'Original outline links pointing outside the extracted subset may become inactive',
    ],
    howToSteps: [
      'Upload your PDF file to populate the page thumbnail preview.',
      'Click each page you want to include in your extracted document.',
      'Click "Extract Pages" to compile the chosen sheets.',
      'Download your extracted PDF.',
    ],
    keywords: ['extract pages from pdf', 'save specific pdf pages', 'pull pages from pdf', 'isolate pdf pages'],
  },

  // 6. Organize PDF
  {
    slug: 'organize-pdf',
    name: 'Organize PDF',
    category: 'organize',
    title: 'Organize PDF Online — Reorder and Arrange Pages | DocuNexa',
    description:
      'Rearrange and reorder PDF pages visually in your browser. Drag and sort page sequences with complete privacy and zero server uploads.',
    h1: 'Organize PDF',
    canonicalUrl: `${CANONICAL_BASE}/tools/organize-pdf`,
    inputFormat: 'PDF (.pdf)',
    outputFormat: 'PDF (.pdf)',
    whatItDoes:
      'Organize PDF provides a visual workspace to review, reorder, and restructure the page flow of your PDF documents.',
    capabilities: [
      'Visual thumbnail grid displaying all document pages in sequence',
      'Rearrange and compile pages into an updated order',
      'Lossless client-side re-indexing using pdf-lib',
      'Instant preview and quick document export',
    ],
    limitations: [
      'Documents with hundreds of pages require device memory to render all thumbnails simultaneously',
    ],
    howToSteps: [
      'Upload your PDF document to load page thumbnails.',
      'Review and arrange the page order to your desired sequence.',
      'Click "Process Document" to compile the restructured file.',
      'Download your organized PDF.',
    ],
    keywords: ['organize pdf', 'reorder pdf pages', 'rearrange pdf pages', 'sort pdf pages'],
  },

  // 7. Scan to PDF
  {
    slug: 'scan-to-pdf',
    name: 'Scan to PDF',
    category: 'organize',
    title: 'Scan to PDF Online — Convert Camera Photos & Scans to PDF | DocuNexa',
    description:
      'Capture photos from your device camera or upload image scans to compile into a multi-page PDF document. Fast, free, and completely client-side.',
    h1: 'Scan to PDF',
    canonicalUrl: `${CANONICAL_BASE}/tools/scan-to-pdf`,
    inputFormat: 'Image files (image/*) or camera capture',
    outputFormat: 'PDF (.pdf)',
    whatItDoes:
      'Scan to PDF captures photos from your camera or imports scanned image files to generate a multi-page PDF document.',
    capabilities: [
      'Direct browser camera access to snap physical document pages',
      'Import existing scanned image files (JPG, PNG, WEBP)',
      'Multi-image batching into a single structured PDF file',
      'Automatic page sizing based on image dimensions',
    ],
    limitations: [
      'Camera capture requires granting camera permissions in your browser',
      'Document clarity depends on device camera sensor and ambient lighting',
      'Does not perform automatic optical deskewing or edge cropping',
    ],
    howToSteps: [
      'Open your camera or select scanned image files from your computer.',
      'Review the captured pages in the preview list.',
      'Click "Compile Scanned PDF" to generate the document.',
      'Download your newly scanned PDF.',
    ],
    keywords: ['scan to pdf', 'camera to pdf', 'photo to pdf scanner', 'convert scan to pdf'],
  },

  // 8. Compress PDF
  {
    slug: 'compress-pdf',
    name: 'Compress PDF',
    category: 'optimize',
    title: 'Compress PDF Online — Reduce PDF File Size Privately | DocuNexa',
    description:
      'Reduce PDF file size while preserving readability. Choose from low, balanced, or strong compression profiles with honest byte delta reporting.',
    h1: 'Compress PDF',
    canonicalUrl: `${CANONICAL_BASE}/tools/compress-pdf`,
    inputFormat: 'PDF (.pdf)',
    outputFormat: 'PDF (.pdf)',
    whatItDoes:
      'Compress PDF optimizes internal PDF structures, stream dictionaries, and embedded objects to reduce overall file size for easier sharing.',
    capabilities: [
      'Three selectable compression profiles: Low, Balanced, and Strong',
      'Stream optimization and redundant object deduplication via pdf-lib',
      'Dual-parser verification (PDF.js + pdf-lib) ensuring structural document validity',
      'Honest, unfabricated reporting of original bytes, compressed bytes, and actual reduction delta',
    ],
    limitations: [
      'Files that already contain pre-compressed raster images or zero redundant metadata may yield minimal size reduction (0% delta reported honestly)',
      'Does not downsample high-resolution images below readable thresholds client-side',
    ],
    howToSteps: [
      'Upload your PDF file into the dropzone.',
      'Select your desired optimization level (Low, Balanced, or Strong).',
      'Click "Compress Document" to optimize streams and dictionaries.',
      'Inspect the authentic size reduction report and download the optimized PDF.',
    ],
    keywords: ['compress pdf', 'reduce pdf size', 'shrink pdf', 'optimize pdf', 'make pdf smaller'],
  },

  // 9. Repair PDF
  {
    slug: 'repair-pdf',
    name: 'Repair PDF',
    category: 'optimize',
    title: 'Repair PDF Online — Fix Corrupt & Damaged PDF Documents | DocuNexa',
    description:
      'Diagnose and reconstruct damaged, corrupted, or unreadable PDF documents client-side. Dual-parser recovery with 4 honest diagnostic states.',
    h1: 'Repair PDF',
    canonicalUrl: `${CANONICAL_BASE}/tools/repair-pdf`,
    inputFormat: 'PDF (.pdf)',
    outputFormat: 'PDF (.pdf) or Diagnostic Report',
    whatItDoes:
      'Repair PDF analyzes damaged PDF byte streams, repairs broken cross-reference tables, and reconstructs trailers to recover readable pages.',
    capabilities: [
      'Dual-parser cross-validation testing with both PDF.js and pdf-lib engines',
      'Cross-reference (xref) table rebuild and trailer reconstruction',
      'Four honest diagnostic states: Healthy, Repaired, Partially Recovered, or Corrupt/Unrecoverable',
      'Extracts and preserves salvageable pages from damaged file containers',
    ],
    limitations: [
      'Completely destroyed byte streams or zero-byte files cannot be reconstructed',
      'Password-encrypted corrupted files cannot be repaired without the decryption key',
    ],
    howToSteps: [
      'Upload the damaged or unreadable PDF document.',
      'Click "Diagnose & Repair" to run dual-parser stream inspection.',
      'Review the authentic diagnostic findings and page recovery count.',
      'Download the repaired PDF if salvageable streams were reconstructed.',
    ],
    keywords: ['repair pdf', 'fix corrupt pdf', 'recover damaged pdf', 'restore unreadable pdf'],
  },

  // 10. OCR PDF
  {
    slug: 'ocr-pdf',
    name: 'OCR PDF',
    category: 'optimize',
    title: 'OCR PDF Online — Make Scanned PDFs Searchable | DocuNexa',
    description:
      'Recognize text in scanned PDF documents and images using client-side Tesseract.js. Supports English and Amharic with complete browser privacy.',
    h1: 'OCR PDF',
    canonicalUrl: `${CANONICAL_BASE}/tools/ocr-pdf`,
    inputFormat: 'PDF (.pdf), Images (.jpg, .png)',
    outputFormat: 'PDF (.pdf) with text transcript',
    whatItDoes:
      'OCR PDF uses in-browser optical character recognition to extract text from scanned documents and images, making them searchable and selectable.',
    capabilities: [
      'Pure client-side text recognition powered by Tesseract.js in a Web Worker',
      'Dedicated language models for English (eng) and Amharic (amh)',
      'Page-by-page OCR execution with live progress reporting',
      'Provides selectable text transcript and searchable document output',
    ],
    limitations: [
      'Processing speed depends entirely on client CPU capabilities and document page count',
      'Handwritten, low-contrast, or skewed scans have lower recognition accuracy than clean typography',
    ],
    howToSteps: [
      'Upload your scanned PDF document or page image.',
      'Select the document primary language (English or Amharic).',
      'Click "Start Optical Character Recognition" to process pages in the browser.',
      'Inspect extracted text and download the searchable output.',
    ],
    keywords: ['ocr pdf', 'searchable pdf', 'extract text from scan', 'amharic ocr', 'tesseract pdf ocr'],
  },

  // 11. JPG to PDF
  {
    slug: 'jpg-to-pdf',
    name: 'JPG to PDF',
    category: 'convert-to',
    title: 'JPG to PDF Online — Convert Images to PDF in Browser | DocuNexa',
    description:
      'Convert JPG, PNG, WEBP, and BMP images into a clean, uniform PDF document. Batch combine images with 100% client-side privacy.',
    h1: 'JPG to PDF',
    canonicalUrl: `${CANONICAL_BASE}/tools/jpg-to-pdf`,
    inputFormat: 'Images (.jpg, .jpeg, .png, .webp, .bmp)',
    outputFormat: 'PDF (.pdf)',
    whatItDoes:
      'JPG to PDF transforms one or multiple raster images into a clean, paginated PDF document while preserving original image aspect ratios.',
    capabilities: [
      'Supports JPG, JPEG, PNG, WEBP, and BMP image formats',
      'Batch conversion: combines multiple image files into a single multi-page PDF',
      'Preserves original color fidelity and native pixel resolutions',
      'Custom page dimensioning matching individual photo orientations',
    ],
    limitations: [
      'Does not vectorize raster graphics into scalable CAD or SVG curves',
      'Output PDF file size correlates with the combined file sizes of input images',
    ],
    howToSteps: [
      'Select or drop one or more image files (JPG, PNG, WEBP) into the upload area.',
      'Arrange image sequence if converting multiple photos.',
      'Click "Convert to PDF" to package the images into a document.',
      'Download your combined PDF file.',
    ],
    keywords: ['jpg to pdf', 'image to pdf', 'png to pdf', 'convert photos to pdf', 'pictures to pdf'],
  },

  // 12. Word to PDF
  {
    slug: 'word-to-pdf',
    name: 'Word to PDF',
    category: 'convert-to',
    title: 'Word to PDF Online — Convert DOCX to PDF Privately | DocuNexa',
    description:
      'Convert Microsoft Word documents (.docx) into clean, printable PDF files directly in your browser. Fast, free, and zero server uploads.',
    h1: 'Word to PDF',
    canonicalUrl: `${CANONICAL_BASE}/tools/word-to-pdf`,
    inputFormat: 'Microsoft Word (.docx, .doc)',
    outputFormat: 'PDF (.pdf)',
    whatItDoes:
      'Word to PDF parses Microsoft Word OpenXML (.docx) files and formats text, headings, and paragraphs into a clean, paginated PDF.',
    capabilities: [
      'Client-side OpenXML document parsing via JSZip and Mammoth',
      'Extracts headings, body paragraphs, bullet lists, and tabular data',
      'Renders clean, universal vector text onto standard PDF pages',
      'Zero server-side transmission for confidential reports and resumes',
    ],
    limitations: [
      'Complex WordArt, macros, dynamic ActiveX controls, and intricate nested text boxes are simplified',
      'Legacy binary .doc format has limited browser parsing compared to modern .docx OpenXML',
    ],
    howToSteps: [
      'Upload your Microsoft Word document (.docx).',
      'Verify the document page preview.',
      'Click "Convert to PDF" to render headings and paragraphs into PDF format.',
      'Download the resulting PDF file.',
    ],
    keywords: ['word to pdf', 'docx to pdf', 'convert word document to pdf', 'word to pdf converter'],
  },

  // 13. PowerPoint to PDF
  {
    slug: 'powerpoint-to-pdf',
    name: 'PowerPoint to PDF',
    category: 'convert-to',
    title: 'PowerPoint to PDF Online — Convert PPTX Slides to PDF | DocuNexa',
    description:
      'Transform PowerPoint presentation slides (.pptx) into printable landscape PDF files in your browser. 100% private client-side conversion.',
    h1: 'PowerPoint to PDF',
    canonicalUrl: `${CANONICAL_BASE}/tools/powerpoint-to-pdf`,
    inputFormat: 'PowerPoint (.pptx, .ppt)',
    outputFormat: 'PDF (.pdf)',
    whatItDoes:
      'PowerPoint to PDF unpacks OpenXML presentation slide decks and converts each slide into a standard landscape PDF page.',
    capabilities: [
      'Unpacks PPTX OpenXML packages client-side using JSZip',
      'Extracts slide titles, body bullet points, and text runs',
      'Creates 16:9 standard landscape PDF slides',
      'Compiles all presentation slides into a single downloadable PDF',
    ],
    limitations: [
      'Audio, video embeds, and dynamic slide transition animations cannot be represented in static PDF',
      'Complex custom SmartArt graphics may be rendered as simplified text elements',
    ],
    howToSteps: [
      'Select your PowerPoint (.pptx) presentation file.',
      'Wait for slide structure and count detection.',
      'Click "Convert to PDF" to generate landscape document pages.',
      'Download the compiled PDF presentation.',
    ],
    keywords: ['powerpoint to pdf', 'pptx to pdf', 'convert slides to pdf', 'presentation to pdf'],
  },

  // 14. Excel to PDF
  {
    slug: 'excel-to-pdf',
    name: 'Excel to PDF',
    category: 'convert-to',
    title: 'Excel to PDF Online — Convert Spreadsheets to PDF Tables | DocuNexa',
    description:
      'Transform Excel spreadsheets (.xlsx, .csv) into clean, neatly paginated PDF grid tables directly in your browser. 100% private.',
    h1: 'Excel to PDF',
    canonicalUrl: `${CANONICAL_BASE}/tools/excel-to-pdf`,
    inputFormat: 'Excel (.xlsx, .xls, .csv)',
    outputFormat: 'PDF (.pdf)',
    whatItDoes:
      'Excel to PDF parses spreadsheet workbooks using SheetJS, extracts tabular cells and headers, and formats them into clean PDF tables.',
    capabilities: [
      'Parses modern .xlsx workbooks and CSV comma-separated data client-side',
      'Renders structured table grids with column headers and cell values',
      'Automatic column width estimation based on cell character lengths',
      'Multi-page pagination for long spreadsheet rows',
    ],
    limitations: [
      'Interactive VBA macros, pivot tables, and dynamic chart widgets are not rendered as live graphics',
      'Extremely wide spreadsheets with dozens of columns will wrap or paginate across sheets',
    ],
    howToSteps: [
      'Upload your Excel spreadsheet (.xlsx, .xls) or CSV file.',
      'Review detected sheet data and row structure.',
      'Click "Convert to PDF" to build paginated table grids.',
      'Download your formatted PDF document.',
    ],
    keywords: ['excel to pdf', 'xlsx to pdf', 'spreadsheet to pdf', 'csv to pdf table'],
  },

  // 15. HTML to PDF
  {
    slug: 'html-to-pdf',
    name: 'HTML to PDF',
    category: 'convert-to',
    title: 'HTML to PDF Online — Convert Web Markup to PDF | DocuNexa',
    description:
      'Convert raw HTML code or web page markup into a clean, structured PDF document. Private in-browser rendering with zero server uploads.',
    h1: 'HTML to PDF',
    canonicalUrl: `${CANONICAL_BASE}/tools/html-to-pdf`,
    inputFormat: 'HTML (.html, .htm)',
    outputFormat: 'PDF (.pdf)',
    whatItDoes:
      'HTML to PDF parses HTML markup, headers, and formatted text, rendering the structure into a downloadable PDF document.',
    capabilities: [
      'Parses semantic HTML headings (h1–h6), paragraphs, and list elements',
      'Formats web code into standard printable PDF pages',
      'Sanitizes input markup client-side to prevent script injection',
      'Creates clean vector text output directly in browser memory',
    ],
    limitations: [
      'Does not execute dynamic client-side JavaScript or fetch external cross-origin CSS resources',
      'Complex responsive web flexbox/grid layouts may be simplified to standard linear page flow',
    ],
    howToSteps: [
      'Upload an HTML file or paste web markup into the converter.',
      'Verify the parsed structural content preview.',
      'Click "Convert to PDF" to generate the document.',
      'Download your clean PDF file.',
    ],
    keywords: ['html to pdf', 'webpage to pdf', 'convert html to pdf', 'code to pdf'],
  },

  // 16. PDF to JPG
  {
    slug: 'pdf-to-jpg',
    name: 'PDF to JPG',
    category: 'convert-from',
    title: 'PDF to JPG Online — Extract PDF Pages as Images | DocuNexa',
    description:
      'Convert PDF pages into high-resolution JPG images. Download single sheets or packaged multi-page ZIP archives privately in your browser.',
    h1: 'PDF to JPG',
    canonicalUrl: `${CANONICAL_BASE}/tools/pdf-to-jpg`,
    inputFormat: 'PDF (.pdf)',
    outputFormat: 'Images (.jpg), ZIP archive (.zip for multi-page)',
    whatItDoes:
      'PDF to JPG renders each page of a PDF document onto an HTML5 canvas using PDF.js and exports high-resolution JPEG image files.',
    capabilities: [
      'High-resolution raster rendering using PDF.js canvas pipeline',
      'Download individual page images or all pages in a single ZIP bundle',
      'Preserves fonts, vector drawings, and embedded diagrams visually',
      'Fast client-side image generation with zero server uploads',
    ],
    limitations: [
      'Generates raster pixel graphics; text in output images is no longer selectable unless OCR is applied',
      'Very large documents with hundreds of pages require device memory to render all images',
    ],
    howToSteps: [
      'Upload your PDF document into the dropzone.',
      'Select whether to extract all pages or specific page numbers.',
      'Click "Convert to JPG" to render pages as high-resolution images.',
      'Download individual images or the complete ZIP archive.',
    ],
    keywords: ['pdf to jpg', 'pdf to image', 'convert pdf to photos', 'extract images from pdf'],
  },

  // 17. PDF to Word
  {
    slug: 'pdf-to-word',
    name: 'PDF to Word',
    category: 'convert-from',
    title: 'PDF to Word Online — Convert PDF to Editable DOCX | DocuNexa',
    description:
      'Convert PDF documents into editable Microsoft Word (.docx) files client-side. Preserves headings and paragraphs with genuine OpenXML output.',
    h1: 'PDF to Word',
    canonicalUrl: `${CANONICAL_BASE}/tools/pdf-to-word`,
    inputFormat: 'PDF (.pdf)',
    outputFormat: 'Microsoft Word (.docx)',
    whatItDoes:
      'PDF to Word extracts text streams, detects heading hierarchies and paragraph boundaries, and compiles a genuine Microsoft Word (.docx) OpenXML file.',
    capabilities: [
      'Extracts structured text lines and reconstructs paragraph blocks',
      'Detects header levels (Title, Heading 1, Heading 2) using font size heuristics',
      'Generates valid Microsoft Word OpenXML (.docx) packages via docx library',
      'Completely client-side conversion ensuring document confidentiality',
    ],
    limitations: [
      'Scanned image-only PDFs without selectable text cannot produce editable Word text without OCR first',
      'Complex multi-column magazine layouts may linearize into sequential paragraphs',
    ],
    howToSteps: [
      'Upload your text-based PDF document.',
      'Inspect page count and layout information.',
      'Click "Convert to Word" to extract text and construct OpenXML paragraphs.',
      'Download the editable Microsoft Word (.docx) document.',
    ],
    keywords: ['pdf to word', 'pdf to docx', 'convert pdf to editable word', 'pdf to docx converter'],
  },

  // 18. PDF to PowerPoint
  {
    slug: 'pdf-to-powerpoint',
    name: 'PDF to PowerPoint',
    category: 'convert-from',
    title: 'PDF to PowerPoint Online — Convert PDF to PPTX Slides | DocuNexa',
    description:
      'Convert PDF pages into editable PowerPoint (.pptx) presentation slides client-side using PptxGenJS. Free, private, and zero file uploads.',
    h1: 'PDF to PowerPoint',
    canonicalUrl: `${CANONICAL_BASE}/tools/pdf-to-powerpoint`,
    inputFormat: 'PDF (.pdf)',
    outputFormat: 'PowerPoint (.pptx)',
    whatItDoes:
      'PDF to PowerPoint converts document pages into individual 16:9 presentation slides within an editable Microsoft PowerPoint (.pptx) slide deck.',
    capabilities: [
      'Creates genuine OpenXML presentation (.pptx) files using PptxGenJS',
      'Maps each PDF page to an individual 16:9 widescreen slide',
      'Extracts titles and structured bullet points into editable text shapes',
      'Client-side slide deck compilation with complete data privacy',
    ],
    limitations: [
      'Scanned PDFs without text layer will embed slide background images rather than editable text boxes',
      'Complex vector artwork is preserved as rendered elements rather than native PowerPoint shapes',
    ],
    howToSteps: [
      'Upload your PDF document or presentation handout.',
      'Review page count and slide preview.',
      'Click "Convert to PowerPoint" to build the PPTX presentation.',
      'Download the editable PowerPoint slide deck.',
    ],
    keywords: ['pdf to powerpoint', 'pdf to ppt', 'pdf to pptx', 'convert pdf to slides'],
  },

  // 19. PDF to Excel
  {
    slug: 'pdf-to-excel',
    name: 'PDF to Excel',
    category: 'convert-from',
    title: 'PDF to Excel Online — Extract Tables to XLSX Spreadsheets | DocuNexa',
    description:
      'Extract structured tables and numerical data from PDFs into Excel (.xlsx) spreadsheets using SheetJS. Includes genuine table confidence scores.',
    h1: 'PDF to Excel',
    canonicalUrl: `${CANONICAL_BASE}/tools/pdf-to-excel`,
    inputFormat: 'PDF (.pdf)',
    outputFormat: 'Microsoft Excel (.xlsx)',
    whatItDoes:
      'PDF to Excel analyzes text positioning coordinates, detects tabular row/column alignments, and exports structured Microsoft Excel (.xlsx) spreadsheets.',
    capabilities: [
      'Heuristic table grid detection based on horizontal and vertical text alignments',
      'Generates genuine Microsoft Excel (.xlsx) workbooks via SheetJS',
      'Provides authentic table detection confidence scores and extracted row counts',
      'Honest diagnostic reporting: warns when scanned PDFs lack tabular text streams',
    ],
    limitations: [
      'Scanned PDFs with zero selectable text return an honest 0-row diagnostic and recommend OCR first',
      'Free-form prose or unstructured narrative text cannot be reliably mapped into tabular spreadsheet columns',
    ],
    howToSteps: [
      'Upload a PDF containing financial, statistical, or tabular data.',
      'Click "Analyze & Extract Tables" to identify rows and columns.',
      'Inspect the table preview, confidence score, and extracted rows.',
      'Download your structured Microsoft Excel (.xlsx) workbook.',
    ],
    keywords: ['pdf to excel', 'pdf to xlsx', 'extract tables from pdf', 'pdf table to spreadsheet'],
  },

  // 20. PDF to PDF/A
  {
    slug: 'pdf-to-pdfa',
    name: 'PDF to PDF/A',
    category: 'convert-from',
    title: 'PDF to PDF/A Online — Prepare PDF for Long-Term Archiving | DocuNexa',
    description:
      'Inject ISO 19005-1 (PDF/A-1b) archiving metadata into your PDF documents for long-term preservation. Experimental client-side metadata preparation.',
    h1: 'PDF to PDF/A',
    canonicalUrl: `${CANONICAL_BASE}/tools/pdf-to-pdfa`,
    inputFormat: 'PDF (.pdf)',
    outputFormat: 'PDF (.pdf)',
    whatItDoes:
      'PDF to PDF/A prepares document metadata toward the ISO 19005-1 (PDF/A-1b) standard, embedding archiving metadata dictionaries for document preservation.',
    capabilities: [
      'Injects PDF/A-1b XMP metadata identification schemas into document trailers',
      'Standardizes document catalog and color space identifiers',
      'Maintains original vector streams, page dimensions, and text layers',
      'Processes files locally in browser memory with zero external transmission',
    ],
    limitations: [
      'Experimental client-side implementation; prepares metadata but does not guarantee 100% ISO certification compliance (e.g. strict font subset embedding or device-independent color validation)',
      'Documents with proprietary non-embedded fonts require pre-embedding',
    ],
    howToSteps: [
      'Upload your standard PDF document.',
      'Review metadata preparation options.',
      'Click "Prepare PDF/A Metadata" to inject ISO archiving schemas.',
      'Download the archival-prepared PDF document.',
    ],
    keywords: ['pdf to pdfa', 'pdf archive', 'iso 19005', 'pdf long term archiving', 'pdfa converter'],
  },

  // 21. Rotate PDF
  {
    slug: 'rotate-pdf',
    name: 'Rotate PDF',
    category: 'edit',
    title: 'Rotate PDF Online — Rotate PDF Pages Permanently | DocuNexa',
    description:
      'Rotate PDF pages 90°, 180°, or 270° clockwise or counter-clockwise. Permanently adjust page orientation directly in your browser.',
    h1: 'Rotate PDF',
    canonicalUrl: `${CANONICAL_BASE}/tools/rotate-pdf`,
    inputFormat: 'PDF (.pdf)',
    outputFormat: 'PDF (.pdf)',
    whatItDoes:
      'Rotate PDF updates the rotation metadata dictionary of all or specific pages in a PDF document to correct upside-down or sideways pages.',
    capabilities: [
      'Rotate 90° clockwise, 180° flip, or 90° counter-clockwise (270°)',
      'Apply rotation to all pages uniformly or rotate individual pages independently',
      'Permanent metadata rotation modifying PDF page dictionary /Rotate values',
      'Instant visual preview of adjusted orientations prior to export',
    ],
    limitations: [
      'Modifies page rotation dictionaries; does not crop or re-rasterize internal content streams',
    ],
    howToSteps: [
      'Upload your PDF file to view page thumbnails.',
      'Select your desired rotation angle (90°, 180°, or 270°).',
      'Click "Rotate PDF" to apply the updated orientations permanently.',
      'Download the corrected PDF file.',
    ],
    keywords: ['rotate pdf', 'turn pdf pages', 'fix upside down pdf', 'pdf orientation change'],
  },

  // 22. Add Page Numbers
  {
    slug: 'add-page-numbers',
    name: 'Add Page Numbers',
    category: 'edit',
    title: 'Add Page Numbers to PDF Online — Insert Custom Pagination | DocuNexa',
    description:
      'Stamp customizable page numbers onto your PDF documents. Configure positions, numbering formats, and starting offsets with 100% privacy.',
    h1: 'Add Page Numbers',
    canonicalUrl: `${CANONICAL_BASE}/tools/add-page-numbers`,
    inputFormat: 'PDF (.pdf)',
    outputFormat: 'PDF (.pdf)',
    whatItDoes:
      'Add Page Numbers inserts vector page number stamps onto document pages at your chosen position and formatting style.',
    capabilities: [
      'Configurable positions: bottom-center, bottom-right, bottom-left, top-right, top-center',
      'Flexible numbering styles: "Page X of Y" or standard single number "X"',
      'Custom starting page number and range offsets',
      'Vector text rendering ensuring crisp numbers at any print scale',
    ],
    limitations: [
      'Page numbers are stamped onto existing margins; documents with zero margins may experience text overlap with existing footers',
      'Does not remove or mask existing pre-printed page numbers in the source scan',
    ],
    howToSteps: [
      'Upload your PDF document.',
      'Select numbering position, formatting style, and starting offset.',
      'Click "Apply Page Numbers" to stamp pagination across all sheets.',
      'Download your numbered PDF document.',
    ],
    keywords: ['add page numbers to pdf', 'paginate pdf', 'number pdf pages', 'insert page numbers pdf'],
  },

  // 23. Add Watermark
  {
    slug: 'add-watermark',
    name: 'Add Watermark',
    category: 'edit',
    title: 'Add Watermark to PDF Online — Stamp Confidential or Draft Text | DocuNexa',
    description:
      'Overlay custom text watermarks onto PDF pages with adjustable opacity, angle, and position. 100% client-side with complete privacy.',
    h1: 'Add Watermark',
    canonicalUrl: `${CANONICAL_BASE}/tools/add-watermark`,
    inputFormat: 'PDF (.pdf)',
    outputFormat: 'PDF (.pdf)',
    whatItDoes:
      'Add Watermark stamps customizable vector text overlays (such as CONFIDENTIAL or DRAFT) diagonally or horizontally across document pages.',
    capabilities: [
      'Custom watermark text input with adjustable opacity (10%–100%)',
      'Custom rotation angles (e.g. 45° diagonal or 0° horizontal)',
      'Vector text overlays rendered directly onto page content streams',
      'Real-time visual preview before generating the final PDF',
    ],
    limitations: [
      'Watermarks are layered onto page content streams; does not encrypt the PDF or prevent editors from removing overlay streams',
    ],
    howToSteps: [
      'Upload your PDF file.',
      'Type your desired watermark text and configure opacity and angle.',
      'Preview the watermark overlay on your document pages.',
      'Click "Stamp Watermark" and download the protected PDF.',
    ],
    keywords: ['add watermark to pdf', 'watermark pdf online', 'stamp draft on pdf', 'confidential watermark pdf'],
  },

  // 24. Crop PDF
  {
    slug: 'crop-pdf',
    name: 'Crop PDF',
    category: 'edit',
    title: 'Crop PDF Online — Trim Margins & Adjust Viewport | DocuNexa',
    description:
      'Trim unnecessary margins and adjust page dimensions in your browser. Interactive visual bounding box with 100% client-side privacy.',
    h1: 'Crop PDF',
    canonicalUrl: `${CANONICAL_BASE}/tools/crop-pdf`,
    inputFormat: 'PDF (.pdf)',
    outputFormat: 'PDF (.pdf)',
    whatItDoes:
      'Crop PDF modifies the CropBox and MediaBox coordinates of PDF pages to trim whitespace, isolate figures, or adjust viewable margins.',
    capabilities: [
      'Visual interactive bounding box crop tool on live canvas preview',
      'Preset alignment options: Center, Top-Left, or custom bounds',
      'Applies adjusted viewport dimensions across all pages or single pages',
      'Lossless viewport modification without downsampling source vector content',
    ],
    limitations: [
      'Cropping modifies viewable CropBox bounds; content outside the crop rectangle is hidden rather than permanently purged from the raw PDF binary',
    ],
    howToSteps: [
      'Upload your PDF to display the visual cropping canvas.',
      'Drag crop handles or enter margin offsets to define the viewable area.',
      'Preview the cropped page layout.',
      'Click "Apply Crop" and download your trimmed PDF file.',
    ],
    keywords: ['crop pdf', 'trim pdf margins', 'cut pdf whitespace', 'resize pdf pages'],
  },

  // 25. Edit PDF
  {
    slug: 'edit-pdf',
    name: 'Edit PDF',
    category: 'edit',
    title: 'Edit PDF Online — Add Text, Annotations & Shapes in Browser | DocuNexa',
    description:
      'Add text notes, highlights, rectangles, and freehand drawings directly onto PDF pages in your browser. Private, free, and zero server uploads.',
    h1: 'Edit PDF',
    canonicalUrl: `${CANONICAL_BASE}/tools/edit-pdf`,
    inputFormat: 'PDF (.pdf)',
    outputFormat: 'PDF (.pdf)',
    whatItDoes:
      'Edit PDF provides a browser canvas to add freeform text annotations, geometric shapes, highlighter strokes, and drawings on PDF documents.',
    capabilities: [
      'Add customizable text annotations with font size and color controls',
      'Draw shapes: rectangles, circles, and highlight overlays',
      'Freehand pen tool for sketching and margin markups',
      'Stamps annotations directly into permanent PDF content streams',
    ],
    limitations: [
      'Adds visual annotations and text overlays; does not reflow or re-typeset existing underlying source paragraphs',
    ],
    howToSteps: [
      'Upload your PDF to open the interactive annotation canvas.',
      'Select a tool: Text, Rectangle, Highlight, or Freehand Pen.',
      'Draw annotations or place text boxes on desired pages.',
      'Click "Save & Download" to burn annotations permanently into the PDF.',
    ],
    keywords: ['edit pdf', 'annotate pdf', 'draw on pdf', 'add text to pdf online', 'pdf markup tool'],
  },

  // 26. PDF Forms
  {
    slug: 'pdf-forms',
    name: 'PDF Forms',
    category: 'edit',
    title: 'Fill PDF Forms Online — Complete Interactive AcroForms | DocuNexa',
    description:
      'Detect and fill interactive AcroForm fields, text boxes, and checkboxes directly in your browser. Export completed forms with complete privacy.',
    h1: 'PDF Forms',
    canonicalUrl: `${CANONICAL_BASE}/tools/pdf-forms`,
    inputFormat: 'PDF (.pdf with AcroForm fields)',
    outputFormat: 'PDF (.pdf)',
    whatItDoes:
      'PDF Forms scans document structures for interactive AcroForm fields, presents an in-browser form filler, and burns values into the final PDF.',
    capabilities: [
      'Automatic detection of standard AcroForm text inputs, checkboxes, and radio buttons',
      'Dynamic in-browser form inputs mapped directly to document field names',
      'Persists filled form values into standard PDF interactive field dictionaries',
      'Provides honest warning when documents contain non-interactive scanned flat forms or proprietary Adobe XFA forms',
    ],
    limitations: [
      'Proprietary Adobe XFA forms and static flat scans cannot be filled without interactive AcroForm field dictionaries (honest notice displayed)',
      'Does not create brand-new interactive form fields from scratch',
    ],
    howToSteps: [
      'Upload your interactive PDF form.',
      'The scanner automatically detects fillable AcroForm fields.',
      'Complete field values using the structured form inputs.',
      'Click "Save & Export Form" to download your filled PDF document.',
    ],
    keywords: ['pdf forms', 'fill pdf form', 'fillable pdf', 'acroform filler', 'complete pdf forms online'],
  },

  // 27. Protect PDF
  {
    slug: 'protect-pdf',
    name: 'Protect PDF',
    category: 'security',
    title: 'Protect PDF Online — Encrypt PDF with Password | DocuNexa',
    description:
      'Encrypt your PDF documents with strong user passwords client-side. Restrict unauthorized viewing with WebAssembly encryption and zero server uploads.',
    h1: 'Protect PDF',
    canonicalUrl: `${CANONICAL_BASE}/tools/protect-pdf`,
    inputFormat: 'PDF (.pdf)',
    outputFormat: 'PDF (.pdf)',
    whatItDoes:
      'Protect PDF encrypts PDF documents using client-side cryptographic algorithms, requiring a password to open and view the content.',
    capabilities: [
      'Client-side PDF encryption using @pdfsmaller/pdf-encrypt WebAssembly',
      'Password protection restricting unauthorized document viewing',
      'Zero server upload: cryptographic keys and files never leave your computer',
      'Compatible with standard PDF readers requiring password entry',
    ],
    limitations: [
      'There is no backdoor or password recovery mechanism; if you forget the password, the file cannot be recovered',
      'Encryption is performed strictly in browser memory',
    ],
    howToSteps: [
      'Upload the PDF document you want to secure.',
      'Enter and confirm a strong password.',
      'Click "Encrypt PDF" to apply password protection locally.',
      'Download your password-protected PDF.',
    ],
    keywords: ['protect pdf', 'password protect pdf', 'encrypt pdf', 'lock pdf', 'secure pdf file'],
  },

  // 28. Unlock PDF
  {
    slug: 'unlock-pdf',
    name: 'Unlock PDF',
    category: 'security',
    title: 'Unlock PDF Online — Remove Password Restrictions | DocuNexa',
    description:
      'Remove password protection from encrypted PDFs when you know the password. Fast, private client-side decryption with zero server uploads.',
    h1: 'Unlock PDF',
    canonicalUrl: `${CANONICAL_BASE}/tools/unlock-pdf`,
    inputFormat: 'PDF (.pdf)',
    outputFormat: 'PDF (.pdf)',
    whatItDoes:
      'Unlock PDF decrypts password-protected PDF files using your valid password and exports an unencrypted, open document.',
    capabilities: [
      'Client-side decryption using @pdfsmaller/pdf-decrypt',
      'Removes viewing passwords and editing restrictions when valid password is provided',
      'Produces standard unencrypted PDF readable in any viewer without prompts',
      'Completely private: password and decrypted data remain inside your browser',
    ],
    limitations: [
      'Requires entering the correct password; does not brute-force or crack unknown high-entropy passwords',
    ],
    howToSteps: [
      'Upload the password-protected PDF file.',
      'Enter the correct document password.',
      'Click "Unlock PDF" to decrypt the byte stream in browser memory.',
      'Download your unencrypted, open PDF file.',
    ],
    keywords: ['unlock pdf', 'remove pdf password', 'decrypt pdf', 'remove pdf restrictions'],
  },

  // 29. Sign PDF
  {
    slug: 'sign-pdf',
    name: 'Sign PDF',
    category: 'security',
    title: 'Sign PDF Online — Draw, Type & Stamp Signatures on PDF | DocuNexa',
    description:
      'Draw, type, or upload your signature and place it securely on PDF contracts and documents. Fast, private client-side signature appearance stamping.',
    h1: 'Sign PDF',
    canonicalUrl: `${CANONICAL_BASE}/tools/sign-pdf`,
    inputFormat: 'PDF (.pdf)',
    outputFormat: 'PDF (.pdf)',
    whatItDoes:
      'Sign PDF lets you draw a handwritten signature, type a signature appearance, or upload a signature graphic and stamp it visually onto document pages.',
    capabilities: [
      'Draw signatures smoothly using interactive touch or mouse canvas',
      'Type signatures with stylish handwritten font appearances',
      'Upload signature images (PNG, JPG) with transparent background support',
      'Position, scale, and stamp signature appearances on any page',
    ],
    limitations: [
      'Stamps a visual signature appearance onto document pages; does NOT provide cryptographic digital signatures (X.509 PKI certificates) or cryptographic tamper-proofing',
    ],
    howToSteps: [
      'Upload your contract or agreement PDF.',
      'Draw your signature on canvas, type your name, or upload an image.',
      'Drag and place the signature box onto the designated signature line.',
      'Click "Sign & Download" to burn the signature appearance into the PDF.',
    ],
    keywords: ['sign pdf', 'draw signature on pdf', 'electronic signature pdf', 'stamp signature pdf'],
  },

  // 30. Redact PDF
  {
    slug: 'redact-pdf',
    name: 'Redact PDF',
    category: 'security',
    title: 'Redact PDF Online — Draw Blackout Rectangles on PDF | DocuNexa',
    description:
      'Draw opaque blackout vector rectangles over sensitive text and confidential figures. Visual blackout tool with transparent technical disclosure.',
    h1: 'Redact PDF',
    canonicalUrl: `${CANONICAL_BASE}/tools/redact-pdf`,
    inputFormat: 'PDF (.pdf)',
    outputFormat: 'PDF (.pdf)',
    whatItDoes:
      'Redact PDF provides an interactive blackout rectangle tool to visually cover sensitive names, account numbers, and confidential paragraphs.',
    capabilities: [
      'Interactive canvas to draw opaque black redaction rectangles over sensitive areas',
      'Multi-page redaction support with customizable box sizing',
      'Burns solid vector blackout rectangles permanently into visual content streams',
      'Clear, honest in-app technical notice regarding visual blackout limitations',
    ],
    limitations: [
      'Visual blackout rectangle overlay only; does NOT sanitize or strip underlying font character streams from the raw PDF binary (not suitable for classified document declassification without rasterization)',
    ],
    howToSteps: [
      'Upload your PDF to view document pages.',
      'Click and drag blackout rectangles over sensitive data or figures.',
      'Review all blackout placements.',
      'Click "Apply Redactions" and download the redacted PDF.',
    ],
    keywords: ['redact pdf', 'black out text in pdf', 'hide sensitive info pdf', 'censor pdf'],
  },

  // 31. Compare PDF
  {
    slug: 'compare-pdf',
    name: 'Compare PDF',
    category: 'security',
    title: 'Compare PDF Online — Visual Side-by-Side Document Diff | DocuNexa',
    description:
      'Compare two PDF document versions side-by-side to pinpoint revisions, added sentences, and removed sections. 100% private in-browser comparison.',
    h1: 'Compare PDF',
    canonicalUrl: `${CANONICAL_BASE}/tools/compare-pdf`,
    inputFormat: 'PDF (.pdf, 2 files)',
    outputFormat: 'Markdown (.md) / Visual Diff',
    whatItDoes:
      'Compare PDF performs a side-by-side visual and text diff between two versions of a document to highlight changes, insertions, and deletions.',
    capabilities: [
      'Dual-document upload comparing original vs revised PDF versions',
      'Side-by-side synchronized visual page inspection',
      'Text stream difference analysis highlighting added and deleted text',
      'Exportable comparison difference report in Markdown format',
    ],
    limitations: [
      'Performs visual layout and text stream comparison; does not compare invisible binary metadata dictionaries or proprietary annotations',
    ],
    howToSteps: [
      'Upload the original PDF version and the modified PDF version.',
      'Click "Compare Documents" to run text and layout diffing.',
      'Review side-by-side highlighted text variations across pages.',
      'Download the comparison Markdown summary.',
    ],
    keywords: ['compare pdf', 'pdf diff', 'compare two pdf files', 'pdf revision comparison'],
  },

  // 32. Document Summarizer (ai-summarizer)
  {
    slug: 'ai-summarizer',
    name: 'Document Summarizer',
    category: 'intelligence',
    title: 'Document Summarizer Online — Extract PDF Key Points Privately | DocuNexa',
    description:
      'Extract structured executive overviews, key takeaways, and study questions from PDFs using client-side heuristic layout analysis. 100% private.',
    h1: 'Document Summarizer',
    canonicalUrl: `${CANONICAL_BASE}/tools/ai-summarizer`,
    inputFormat: 'PDF (.pdf)',
    outputFormat: 'Markdown (.md), Text (.txt)',
    whatItDoes:
      'Document Summarizer analyzes document headings and text distributions using client-side heuristics to generate structured outlines and key takeaways.',
    capabilities: [
      'Progressive layout analysis in 10-page batches directly in your browser',
      'Extracts executive overviews, key conceptual points, and study review questions',
      'Identifies document reading times and structural density metrics',
      'Zero server transmission: uses local rule-based heuristic extraction without cloud LLMs',
    ],
    limitations: [
      'Uses local rule-based heuristics and statistical extraction, NOT cloud LLMs or generative AI',
      'Scanned PDFs without text layers contain no selectable text and require OCR PDF first',
    ],
    howToSteps: [
      'Upload your text-based PDF document or report.',
      'Click "Summarize Document" to begin progressive page analysis.',
      'Review generated executive summary, key points, and study questions.',
      'Copy notes to clipboard or download as Markdown/Text.',
    ],
    keywords: ['document summarizer', 'pdf summary', 'extract key points pdf', 'pdf study questions', 'summarize pdf privately'],
  },

  // 33. Translate PDF
  {
    slug: 'translate-pdf',
    name: 'Translate PDF',
    category: 'intelligence',
    title: 'Translate PDF Online — Local Educational Glossary Translation | DocuNexa',
    description:
      'Translate extracted educational PDF text between English and Amharic using local rule-based glossary transformations. 100% in-browser privacy.',
    h1: 'Translate PDF',
    canonicalUrl: `${CANONICAL_BASE}/tools/translate-pdf`,
    inputFormat: 'PDF (.pdf)',
    outputFormat: 'Text (.txt)',
    whatItDoes:
      'Translate PDF extracts document text and applies a local rule-based educational glossary to translate key terms between English and Amharic.',
    capabilities: [
      'Rule-based educational glossary transformation between English and Amharic (amh)',
      'Extracts page text streams client-side using PDF.js',
      '100% local processing with zero data transmission to external translation APIs',
      'Exports translated text file with language metadata headers',
    ],
    limitations: [
      'Local rule-based translation engine focused on educational terminology; non-Amharic languages are honestly reported as unsupported rather than fabricating machine translations',
    ],
    howToSteps: [
      'Upload your educational PDF document.',
      'Select target translation language (Amharic).',
      'Click "Translate Document Text" to run local glossary transformation.',
      'Review and download the translated text output.',
    ],
    keywords: ['translate pdf', 'english to amharic pdf', 'amharic translation pdf', 'local pdf translation'],
  },

  // 34. PDF to Markdown
  {
    slug: 'pdf-to-markdown',
    name: 'PDF to Markdown',
    category: 'intelligence',
    title: 'PDF to Markdown Online — Convert PDF Structure to Clean MD | DocuNexa',
    description:
      'Convert PDF document hierarchy into clean, structured Markdown for Obsidian, Notion, or GitHub. 100% private in-browser conversion.',
    h1: 'PDF to Markdown',
    canonicalUrl: `${CANONICAL_BASE}/tools/pdf-to-markdown`,
    inputFormat: 'PDF (.pdf)',
    outputFormat: 'Markdown (.md)',
    whatItDoes:
      'PDF to Markdown analyzes document text typography and spacing to convert PDF chapters, headings, and paragraphs into formatted Markdown (.md).',
    capabilities: [
      'Heuristic heading level detection (# H1, ## H2, ### H3) based on font sizes',
      'Reconstructs body paragraphs, bullet lists, and code blocks cleanly',
      'Exports standard GitHub Flavored Markdown compatible with Obsidian, Notion, and Logseq',
      'Completely client-side conversion ensuring sensitive notes remain private',
    ],
    limitations: [
      'Relies on typography and font sizing heuristics; documents without consistent font hierarchies may require manual heading level tweaks',
      'Scanned PDFs without text streams require OCR first',
    ],
    howToSteps: [
      'Upload your PDF document or textbook chapter.',
      'Click "Convert to Markdown" to parse typography and heading levels.',
      'Inspect the Markdown preview and copy or download the file.',
      'Import the clean .md file directly into Obsidian, Notion, or your notes app.',
    ],
    keywords: ['pdf to markdown', 'pdf to md', 'convert pdf to obsidian', 'pdf to notion', 'markdown converter'],
  },
];

export function getToolSeoData(slug: string): ToolSeoRecord {
  const found = SEO_TOOL_RECORDS.find((r) => r.slug === slug);
  if (!found) {
    const tool = getToolBySlug(slug);
    if (!tool) {
      throw new Error(`Invalid tool slug requested: ${slug}`);
    }
    return {
      slug: tool.slug,
      name: tool.name,
      category: tool.category,
      title: `${tool.name} — Free In-Browser PDF Tool | DocuNexa`,
      description: tool.description,
      h1: tool.name,
      canonicalUrl: `${CANONICAL_BASE}/tools/${tool.slug}`,
      inputFormat: 'PDF (.pdf)',
      outputFormat: 'PDF (.pdf)',
      whatItDoes: tool.description,
      capabilities: [tool.description],
      limitations: ['Processing is limited by browser memory.'],
      howToSteps: ['Upload your file', 'Configure options', 'Download processed document'],
      keywords: tool.keywords,
    };
  }
  return found;
}
