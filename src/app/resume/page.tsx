import type { Metadata } from "next";

import { ResumeWorkspace } from "@/components/resume-workspace";
import { getCandidatePageState } from "@/features/candidate/candidate-page-state";

export const metadata: Metadata = {
  title: "이력서 추출과 검토 | JobLens",
  description:
    "PDF 또는 텍스트 이력서를 브라우저 안에서 추출하고 교정한 뒤 분석용 내용을 승인합니다.",
};

type ResumePageProps = {
  searchParams: Promise<{ fixture?: string }>;
};

export default async function ResumePage({ searchParams }: ResumePageProps) {
  const candidateState = await getCandidatePageState();
  const { fixture } = await searchParams;
  const isCandidateFixture =
    process.env.E2E_CANDIDATE_FIXTURE === "enabled" && fixture === "candidate";

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
      {candidateState !== null || isCandidateFixture ? (
        <ResumeWorkspace />
      ) : (
        <section className="resume-card resume-login-gate">
          <div className="resume-card-heading">
            <span>Candidate only</span>
            <h2>Google 로그인이 필요합니다</h2>
          </div>
          <p>
            Resume는 로그인한 Candidate만 준비하고 승인할 수 있습니다. 원본
            파일과 추출 내용은 로그인 후에도 현재 브라우저 탭 안에서만
            처리됩니다.
          </p>
          <a className="google-login" href="/auth/google">
            Google로 로그인
          </a>
        </section>
      )}
    </main>
  );
}
