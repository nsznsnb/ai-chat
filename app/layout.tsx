import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ChatProvider } from "@/contexts/ChatContext";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AI Chat - エンターテイメントチャットボット",
  description: "Claude APIを使用したシンプルなAIチャットボットアプリケーション",
  keywords: ["AI", "チャットボット", "Claude", "Next.js"],
  authors: [{ name: "AI Chat Team" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={inter.variable}>
      <body className="antialiased">
        <ChatProvider>
          {children}
        </ChatProvider>
      </body>
    </html>
  );
}
