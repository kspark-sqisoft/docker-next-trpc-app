import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { AppProviders } from "@/components/providers";
import "./globals.css";

// CSS 변수로 폰트 패밀리 주입
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Study Board · Next + tRPC",
  description: "JWT, 게시판, 파일 업로드 학습용 풀스택 예제",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="bg-background text-foreground flex min-h-full flex-col font-sans"
        suppressHydrationWarning
      >
        {/* 전역 세션·tRPC·쿼리 클라이언트 */}
        <AppProviders>
          <SiteHeader />
          <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6">
            {children}
          </main>
        </AppProviders>
      </body>
    </html>
  );
}
