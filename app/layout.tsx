import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Martens Exclusive CRM",
  description: "Lead management for Martens Exclusive"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body className="font-sans bg-black text-white">{children}</body>
    </html>
  );
}