import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { BugReportWidget } from "@/components/bug-report-widget";
import { QueryProvider } from "@/components/providers/query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI 인터뷰어 & 자소서 멘토",
  description: "이력서·자소서 첨삭과 텍스트 모의 면접",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          {children}
          {/*
            모든 화면 우하단에 고정됩니다. useMutation 을 쓰므로 반드시
            QueryProvider 안에 있어야 합니다. 로그인 화면에서는 스스로 숨습니다.
          */}
          <BugReportWidget />
        </QueryProvider>
      </body>
    </html>
  );
}
