import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeoConvert — PDF Tools Inteligentes",
  description: "Converta, comprima, mescle e assine PDFs com velocidade. Ferramentas premium, sem instalar nada.",
  keywords: ["pdf converter", "comprimir pdf", "juntar pdf", "assinatura digital", "ferramentas pdf grátis"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
