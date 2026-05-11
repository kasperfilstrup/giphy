import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Giphy meme browser",
  description: "Search Giphy and slap captions on GIFs, three at a time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
