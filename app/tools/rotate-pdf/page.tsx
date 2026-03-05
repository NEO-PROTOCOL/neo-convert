"use client";
import ToolPage from "@/components/ToolPage";
import { PDFDocument, degrees } from "pdf-lib";

async function rotatePDF(files: File[]): Promise<{ name: string; url: string }[]> {
    if (files.length === 0) throw new Error("Selecione um arquivo PDF.");
    const file = files[0];
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

    const pages = pdf.getPages();
    pages.forEach((page) => {
        const rotation = page.getRotation().angle;
        page.setRotation(degrees(rotation + 90));
    });

    const bytes = await pdf.save();
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const name = file.name.replace(/\.pdf$/i, "") + "_rotacionado.pdf";

    return [{ name, url }];
}

export default function RotatePDFPage() {
    return (
        <ToolPage
            icon="↩️"
            title="Rotacionar PDF"
            description="Gire todas as páginas do seu PDF em 90 graus no sentido horário."
            accept=".pdf"
            acceptLabel="Arquivo PDF · até 50 MB"
            color="#0ea5e9"
            onProcess={rotatePDF}
            multi={false}
            tip="Útil para corrigir documentos que foram escaneados na orientação errada."
        />
    );
}
