"use client";
import ToolPage from "@/components/ToolPage";

async function compressImage(files: File[]): Promise<{ name: string; url: string }[]> {
    if (files.length === 0) throw new Error("Selecione uma imagem.");
    const file = files[0];

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                if (!ctx) return reject("Não foi possível criar o contexto do Canvas.");

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                // Comprimir para JPEG com qualidade 0.7
                canvas.toBlob(
                    (blob) => {
                        if (!blob) return reject("Erro ao comprimir imagem.");
                        const url = URL.createObjectURL(blob);
                        const name = file.name.replace(/\.[^/.]+$/, "") + "_comprimido.jpg";
                        resolve([{ name, url }]);
                    },
                    "image/jpeg",
                    0.7
                );
            };
            img.onerror = () => reject("Erro ao carregar imagem.");
        };
        reader.onerror = () => reject("Erro ao ler arquivo.");
    });
}

export default function CompressImagePage() {
    return (
        <ToolPage
            icon="🖼️"
            title="Comprimir Imagem"
            description="Reduza o tamanho de imagens JPG, PNG ou WEBP em segundos, mantendo o equilíbrio perfeito entre peso e qualidade."
            accept=".jpg,.jpeg,.png,.webp"
            acceptLabel="Imagens JPG, PNG ou WEBP · até 20 MB"
            color="#00ff9d"
            onProcess={compressImage}
            multi={false}
            tip="Ferramenta ideal para otimizar imagens antes de usar em sites ou redes sociais."
        />
    );
}
