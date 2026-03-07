import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// ✅ IMPORTAREMOS O GERENCIADOR DE EFEITOS QUE VAMOS CRIAR
import GlobalVFXManager from "./components/GlobalVFXManager";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "A Guilda - Hunter System",
  description: "Sistema S+ de Gerenciamento de Obras e Cosméticos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#040405] min-h-screen relative`}
      >
        {/* ✅ COMPONENTE QUE GERE O FUNDO (GIF/VIDEO/PARTÍCULAS) EM TODAS AS TELAS */}
        <GlobalVFXManager />

        {/* ✅ DIV QUE GARANTE QUE O CONTEÚDO FIQUE ACIMA DO FUNDO ANIMADO E SEJA CLICÁVEL */}
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}