import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/layout/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aegis — Trust OS",
  description:
    "Controlled-access trust infrastructure for high-stakes human services.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
