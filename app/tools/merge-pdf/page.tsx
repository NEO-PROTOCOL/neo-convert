"use client";
import ToolPage from "@/components/ToolPage";
import { PDFDocument } from "pdf-lib";

async function mergePDFs(files: File[]): Promise<{ name: string; url: string }[]> {
    if (files.length < 2) throw new Error("Selecione pelo menos 2 arquivos PDF para mesclar.");

    const merged = await PDFDocument.create();

    for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const pages = await merged.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page) => merged.addPage(page));
    }

    merged.setCreator("NeoConvert");
    merged.setProducer("NeoConvert");

    const bytes = await merged.save({ useObjectStreams: true });
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    return [{ name: "mesclado.pdf", url }];
}

export default function MergePDFPage() {
    return (
        <ToolPage
            icon="🔀"
            title="Mesclar PDFs"
            description="Una vários arquivos PDF em um único documento. Arraste na ordem desejada e baixe o resultado instantaneamente."
            accept=".pdf"
            acceptLabel="Selecione 2 ou mais arquivos PDF"
            color="#7b2fff"
            onProcess={mergePDFs}
            multi={true}
            tip="Selecione os arquivos na ordem em que quer que apareçam no PDF final."
        />
    );
}
