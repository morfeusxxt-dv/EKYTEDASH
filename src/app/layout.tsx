import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dashboard de Investidores | eKyte Integration",
  description: "Acompanhamento ultra moderno de apontamentos de horas por investidor e workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[#050505] text-[#f5f5f7]">
        {children}
      </body>
    </html>
  );
}
