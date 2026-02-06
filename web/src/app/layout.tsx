import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Catalogozord",
  description: "Painel interno para catalogo, estoque e compras.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
