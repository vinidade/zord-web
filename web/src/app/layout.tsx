import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/lib/sessionStore";

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
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
