import { PDFDocument, PDFName, PDFString } from 'pdf-lib';

export interface PdfAResult {
  filename: string;
  bytes: Uint8Array;
  disclaimer: string;
}

/**
 * Prepares PDF metadata and basic archival descriptors toward archival workflows.
 * Strictly labeled as Archive-ready PDF (Experimental); does NOT claim certified ISO 19005 conformance.
 */
export async function preparePdfA(
  pdfBuffer: ArrayBuffer,
  baseName: string
): Promise<PdfAResult> {
  const doc = await PDFDocument.load(pdfBuffer.slice(0), { ignoreEncryption: true });

  // 1. Inject standard XMP Metadata Packet for archival identification
  const xmpMetadata = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/" xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>1</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:title>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${baseName}</rdf:li>
        </rdf:Alt>
      </dc:title>
      <dc:format>application/pdf</dc:format>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  const metadataStream = doc.context.stream(xmpMetadata, {
    Type: PDFName.of('Metadata'),
    Subtype: PDFName.of('XML'),
  });
  const metadataStreamRef = doc.context.register(metadataStream);
  doc.catalog.set(PDFName.of('Metadata'), metadataStreamRef);

  // 2. Set Producer and Creator
  doc.setProducer('DocuNexa Archive-Ready PDF Preparation (Experimental)');
  doc.setCreator('DocuNexa PDF Suite');

  const outputBytes = await doc.save();

  return {
    filename: `${baseName} - (Archive-Ready PDF-A Experimental).pdf`,
    bytes: outputBytes,
    disclaimer:
      'Archive-ready PDF (Experimental) — experimental metadata preparation toward archival preservation standards. Injects basic XMP archival markers. NOTE: This does NOT certify formal ISO 19005 conformance. Certified PDF/A validation requires pre-press checks (e.g. veraPDF) including 100% embedded font subsets, device-independent ICC color profiles, elimination of password encryption, and transparency flattening (PDF/A-1), which client-side browser tools cannot guarantee.',
  };
}
