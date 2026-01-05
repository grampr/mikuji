import type { Metadata } from "next";
import { Shippori_Mincho, Yuji_Syuku } from "next/font/google";
import "./globals.css";

const mincho = Shippori_Mincho({
  variable: "--font-mincho",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const brush = Yuji_Syuku({
  variable: "--font-brush",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mikuji.nehaverse.net"),
  title: "一撃必中・新春おみくじ 2026",
  description:
    "集中力と反射神経で運命を切り拓く、体験型おみくじWebアプリ。",
  openGraph: {
    title: "一撃必中・新春おみくじ 2026",
    description:
      "集中力と反射神経で運命を切り拓く、体験型おみくじWebアプリ。",
    url: "https://mikuji.nehaverse.net",
    siteName: "一撃必中・新春おみくじ 2026",
    images: [
      {
        url: "/og-result.png",
        width: 1529,
        height: 768,
        alt: "一撃必中・新春おみくじ 2026",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "一撃必中・新春おみくじ 2026",
    description:
      "集中力と反射神経で運命を切り拓く、体験型おみくじWebアプリ。",
    images: ["/og-result.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${mincho.variable} ${brush.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
