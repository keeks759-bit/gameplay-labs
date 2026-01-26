import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import AuthDebugPanel from "@/components/AuthDebugPanel";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gameplay Labs",
  description: "Gaming highlight clips",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen bg-[#fafafa] text-[#0a0a0a] dark:bg-[#0a0a0a] dark:text-[#fafafa] transition-colors font-sans flex flex-col`} style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
        <NavBar />
        <main className="flex-1 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">{children}</main>
        <Footer />
        <AuthDebugPanel />
      </body>
    </html>
  );
}
