"use client";
import ToolPage from "@/components/ToolPage";
import { PDFDocument } from "pdf-lib";

async function splitPDF(files: File[]): Promise<{ name: string; url: string }[]> {
    if (files.length === 0) throw new Error("Selecione um arquivo PDF.");
    const file = files[0];
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const pageCount = pdf.getPageCount();

    if (pageCount === 0) throw new Error("O PDF não possui páginas.");

    const results: { name: string; url: string }[] = [];

    // Para evitar lentidão em arquivos gigantes, limitamos a 50 páginas no split automático
    // Se o PDF for muito grande, talvez seja melhor oferecer um seletor de range, 
    // mas para o MVP vamos dividir todas as páginas.
    const maxPages = 50;
    const actualPages = Math.min(pageCount, maxPages);

    for (let i = 0; i < actualPages; i++) {
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdf, [i]);
        newPdf.addPage(copiedPage);

        const bytes = await newPdf.save();
        const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const name = `${file.name.replace(/\.pdf$/i, "")}_pagina_${i + 1}.pdf`;
        results.push({ name, url });
    }

    if (pageCount > maxPages) {
        console.warn(`PDF muito grande (${pageCount} páginas). Apenas as primeiras ${maxPages} foram separadas.`);
    }

    return results;
}

export default function SplitPDFPage() {
    return (
        <ToolPage
            icon="✂️"
            title="Dividir PDF"
            description="Separe cada página do seu PDF em um arquivo individual de forma automática e rápida."
            accept=".pdf"
            acceptLabel="Selecione um arquivo PDF · até 50 MB"
            color="#0ea5e9"
            onProcess={splitPDF}
            multi={false}
            tip="Cada página do seu arquivo original será transformada em um novo arquivo PDF para download."
        />
    );
}

