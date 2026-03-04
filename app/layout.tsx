import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeoConvert — PDF Tools Inteligentes",
  description: "Converta, comprima, mescle e assine PDFs com velocidade. Ferramentas premium, sem instalar nada.",
  keywords: [
    "pdf converter",
    "comprimir pdf",
    "juntar pdf",
    "assinatura digital",
    "ferramentas pdf grátis",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
