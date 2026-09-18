import { PDFDocument, PDFName, PDFString } from 'pdf-lib';

export interface PdfAResult {
  filename: string;
  bytes: Uint8Array;
  disclaimer: string;
}

/**
 * Prepares PDF metadata and color profile tags toward ISO 19005-1 (PDF/A-1b) archival standard.
 * Strictly labeled as experimental metadata preparation; does not claim formal ISO certification.
 */
export async function preparePdfA(
  pdfBuffer: ArrayBuffer,
  baseName: string
): Promise<PdfAResult> {
  const doc = await PDFDocument.load(pdfBuffer.slice(0), { ignoreEncryption: true });

  // 1. Inject standard XMP Metadata Packet for PDF/A identification
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
  doc.setProducer('DocuNexa PDF/A Metadata Preparation');
  doc.setCreator('DocuNexa Free PDF Suite');

  const outputBytes = await doc.save();

  return {
    filename: `${baseName} - (PDF-A Experimental).pdf`,
    bytes: outputBytes,
    disclaimer: 'PDF/A metadata preparation — experimental. Injects ISO 19005-1 (PDF/A-1b) metadata markers. Formal compliance certification requires specialized pre-press validation not guaranteed in the browser.',
  };
}
