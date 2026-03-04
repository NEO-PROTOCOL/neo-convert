"use client";
import ToolPage from "@/components/ToolPage";
import { PDFDocument } from "pdf-lib";

async function jpgToPDF(files: File[]): Promise<{ name: string; url: string }[]> {
    const pdf = await PDFDocument.create();

    for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const ext = file.name.split(".").pop()?.toLowerCase();

        let image;
        if (ext === "jpg" || ext === "jpeg") {
            image = await pdf.embedJpg(arrayBuffer);
        } else if (ext === "png") {
            image = await pdf.embedPng(arrayBuffer);
        } else {
            throw new Error(`Formato não suportado: ${file.name}`);
        }

        const page = pdf.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    }

    pdf.setCreator("NeoConvert");
    const bytes = await pdf.save();
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    return [{ name: "imagens.pdf", url }];
}

export default function JpgToPDFPage() {
    return (
        <ToolPage
            icon="🖼️"
            title="JPG para PDF"
            description="Converta imagens JPG ou PNG para PDF em segundos. Selecione várias imagens e una-as em um único arquivo."
            accept=".jpg,.jpeg,.png"
            acceptLabel="Imagens JPG ou PNG · até 50 MB"
            color="#0ea5e9"
            onProcess={jpgToPDF}
            multi={true}
            tip="Você pode selecionar múltiplas imagens. Cada imagem vira uma página no PDF final."
        />
    );
}
