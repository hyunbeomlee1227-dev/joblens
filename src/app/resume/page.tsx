import type { Metadata } from "next";

import { ResumeWorkspace } from "@/components/resume-workspace";

export const metadata: Metadata = {
  title: "이력서 추출과 검토 | JobLens",
  description:
    "PDF 또는 텍스트 이력서를 브라우저 안에서 추출하고 교정한 뒤 분석용 내용을 승인합니다.",
};

export default function ResumePage() {
  return (
    <main className="resume-shell">
      <section className="resume-hero">
        <p className="section-kicker">BROWSER-ONLY RESUME</p>
        <h1>이력서 추출과 검토</h1>
        <p>
          PDF 또는 텍스트에서 내용을 추출하고, 직접 교정한 뒤 분석에 사용할
          내용을 승인하세요.
        </p>
      </section>
      <ResumeWorkspace />
    </main>
  );
}
