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
  title: "SwiftChain — Global Payments, Reimagined",
  description:
    "SwiftChain is a blockchain-powered remittance prototype exploring a simpler, more transparent way to move money across borders using stablecoins.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo-32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: { url: "/logo-192.png", type: "image/png" },
  },
  openGraph: {
    title: "SwiftChain — Global Payments, Reimagined",
    description:
      "Blockchain-powered remittance prototype on Ethereum Sepolia.",
    images: [{ url: "/logo-192.png", width: 192, height: 192 }],
  },
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
