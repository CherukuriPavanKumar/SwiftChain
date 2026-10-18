import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { WebProvider } from "../wagmi/web_provider";
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
  title: "SwiftChain",
  description: "Crypto Project by pavankumar",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <WebProvider>{children}</WebProvider>
      </body>
    </html>
  );
}
