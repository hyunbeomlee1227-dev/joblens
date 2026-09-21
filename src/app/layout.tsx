import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DemoBanner } from "@/components/demo-banner";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

export const metadata: Metadata = {
  title: "JobLens | 공개 채용공고 데모",
  description: "조건에 맞는 채용공고를 탐색하는 JobLens 합성 데이터 데모",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <SiteHeader />
        <DemoBanner />
        {children}
        <footer className="site-footer">
          <p>JobLens · 근거를 확인할 수 있는 채용 탐색을 준비하고 있습니다.</p>
          <p>이 데모의 회사명과 공고 내용은 모두 합성 데이터입니다.</p>
        </footer>
      </body>
    </html>
  );
}
