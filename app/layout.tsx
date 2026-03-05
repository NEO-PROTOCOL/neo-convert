import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeoConvert — PDF Tools Inteligentes",
  description: "Converta, comprima, mescle e assine PDFs com velocidade. Ferramentas premium, sem instalar nada.",
  metadataBase: new URL('https://neo-convert.site'),
  alternates: {
    canonical: '/',
  },
  keywords: [
    "pdf converter",
    "comprimir pdf",
    "juntar pdf",
    "assinatura digital",
    "ferramentas pdf grátis",
    "neo-convert",
  ],
  openGraph: {
    title: "NeoConvert — PDF Tools Inteligentes",
    description: "Converta, comprima, mescle e assine PDFs com velocidade.",
    url: 'https://neo-convert.site',
    siteName: 'NeoConvert',
    locale: 'pt-BR',
    type: 'website',
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'NeoConvert - PDF Tools',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "NeoConvert — PDF Tools Inteligentes",
    description: "Converta, comprima, mescle e assine PDFs com velocidade.",
    images: ['/api/og'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
