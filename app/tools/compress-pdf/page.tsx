"use client";
import ToolPage from "@/components/ToolPage";
import { PDFDocument } from "pdf-lib";

async function compressPDF(
  files: File[],
): Promise<{ name: string; url: string }[]> {
  const file = files[0];
  const arrayBuffer = await file.arrayBuffer();

  // Carrega o PDF com pdf-lib
  const pdfDoc = await PDFDocument.load(arrayBuffer, {
    ignoreEncryption: true,
  });

  // Remove metadados desnecessários para reduzir tamanho
  pdfDoc.setAuthor("");
  pdfDoc.setCreator("NeoConvert");
  pdfDoc.setProducer("NeoConvert");
  pdfDoc.setSubject("");
  pdfDoc.setKeywords([]);

  // Salva com compressão de objetos ativada
  const compressed = await pdfDoc.save({
    useObjectStreams: true,
  });

  const originalSize = arrayBuffer.byteLength;
  const newSize = compressed.byteLength;
  const reduction = (((originalSize - newSize) / originalSize) * 100).toFixed(
    1,
  );

  console.log(
    `✅ Comprimido: ${(originalSize / 1024).toFixed(0)}KB → ${(newSize / 1024).toFixed(0)}KB (−${reduction}%)`,
  );

  const blob = new Blob([compressed.buffer as ArrayBuffer], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const name = file.name.replace(/\.pdf$/i, "") + "_comprimido.pdf";

  return [{ name, url }];
}

export default function CompressPDFPage() {
  return (
    <ToolPage
      icon="🗜️"
      title="Comprimir PDF"
      description="Reduza o tamanho do seu PDF sem perder qualidade. Após processar, o download é liberado mediante pagamento unitário."
      accept=".pdf"
      acceptLabel="Arquivo PDF · até 50 MB"
      color="#00ff9d"
      onProcess={compressPDF}
      tip="Funciona melhor em PDFs com muitos metadados e objetos redundantes. Para PDFs com imagens grandes, a compressão pode variar."
      payment={{
        enabled: true,
        planId: "starter",
        planName: "Compressão PDF Unitária",
        planPrice: "R$ 7,50",
        ttlMs: 60 * 60 * 1000,
        localStorageKey: "neo:download-authorization:compress-pdf",
      }}
    />
  );
}
