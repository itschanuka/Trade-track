import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradeTrack - Contractor job, quote, and invoice tracking",
  description:
    "TradeTrack helps solo tradespeople manage clients, jobs, quotes, invoices, payments, PDFs, and reminders."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
