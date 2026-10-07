import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppFrame from "@/components/layout/AppFrame";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Inventra | Dashboard",
  description: "Smarter Inventory. Stronger Operations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-background">
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
