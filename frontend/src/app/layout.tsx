import type { Metadata } from "next";
import { Stack_Sans_Text } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const stackSans = Stack_Sans_Text({
  subsets: ["latin"],
  variable: "--font-stack-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Subur.in",
  description: "Platform monitoring tanaman pintar",
  icons: {
    icon: [
      {
        url: "/logo/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/logo/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/logo/favicon-16x16-dark.png",
        sizes: "16x16",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/logo/favicon-32x32-dark.png",
        sizes: "32x32",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: "/logo/apple-touch-icon.png",
  },
  manifest: "/logo/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={stackSans.variable}>
      <body>
        <SessionProvider basePath="/api/nextauth">{children}</SessionProvider>
      </body>
    </html>
  );
}
