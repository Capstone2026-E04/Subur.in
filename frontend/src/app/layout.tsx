import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Subur.in",
  description: "Platform monitoring tanaman pintar",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <SessionProvider basePath="/api/nextauth">{children}</SessionProvider>
      </body>
    </html>
  );
}
