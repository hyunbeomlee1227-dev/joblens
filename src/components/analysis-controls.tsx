"use client";

import { useEffect, useRef, useState } from "react";

type AnalysisControlsProps = {
  sanitizedResume: string;
  resumeVersion: number;
  csrfToken: string;
  fixtureEnabled: boolean;
};

type Status = "idle" | "running" | "completed" | "cancelled" | "failed";

export function AnalysisControls({
  sanitizedResume,
  resumeVersion,
  csrfToken,
  fixtureEnabled,
}: AnalysisControlsProps) {
  const active = useRef<{ jobId: string; controller: AbortController } | null>(
    null,
  );
  const [status, setStatus] = useState<Status>("idle");
  const [used, setUsed] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function cancelOnExit() {
      const job = active.current;
      if (job === null) return;
      active.current = null;
      job.controller.abort();
      navigator.sendBeacon(
        "/api/analysis/cancel",
        new Blob([JSON.stringify({ jobId: job.jobId, csrfToken })], {
          type: "application/json",
        }),
      );
    }
    window.addEventListener("pagehide", cancelOnExit);
    return () => {
      cancelOnExit();
      window.removeEventListener("pagehide", cancelOnExit);
    };
  }, [csrfToken]);

  async function start() {
    if (!fixtureEnabled || active.current !== null) return;
    const job = {
      jobId: crypto.randomUUID(),
      controller: new AbortController(),
    };
    active.current = job;
    setStatus("running");
    setError(null);
    try {
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        signal: job.controller.signal,
        body: JSON.stringify({
          jobId: job.jobId,
          csrfToken,
          sanitizedResume,
          resumeVersion,
          approved: true,
          listingId: "analysis-fixture",
          kind: "deep",
        }),
      });
      const body = await response.json();
      if (active.current !== job) return;
      if (!response.ok) {
        setStatus("failed");
        setError(
          body.error === "allowance_exhausted"
            ? "오늘 분석 한도를 모두 사용했습니다. 한국 시간 자정에 초기화됩니다."
            : body.error === "analysis_disabled"
              ? "분석이 일시적으로 비활성화되어 있습니다. 공고 탐색은 계속 이용할 수 있습니다."
              : "분석을 완료하지 못했습니다. 모델 호출이 시작된 요청은 사용량에 포함될 수 있습니다.",
        );
      } else {
        setStatus("completed");
        setUsed(body.allowance.used);
        setLimit(body.allowance.limit);
      }
    } catch {
      if (active.current === job) {
        setStatus("failed");
        setError("분석 연결이 종료되었습니다.");
      }
    } finally {
      if (active.current === job) active.current = null;
    }
  }

  function cancel() {
    const job = active.current;
    if (job === null) return;
    active.current = null;
    job.controller.abort();
    void fetch("/api/analysis/cancel", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId: job.jobId, csrfToken }),
      keepalive: true,
    }).catch(() => {});
    setStatus("cancelled");
  }

  return (
    <section className="analysis-controls" aria-label="분석 요청">
      <p>
        승인된 내용만 분석 요청 중에 JobLens 서버와 AWS로 전송됩니다. 원본
        파일은 전송하지 않으며 전체 승인본은 서버에 보관하지 않습니다.
      </p>
      {fixtureEnabled ? (
        <p>
          합성 공고와 모델 대역을 사용하는 테스트 분석입니다. 실제 추천 결과는
          제공하지 않습니다.
        </p>
      ) : (
        <p>
          분석 비활성: 공급원 분석 권한과 Bedrock 개인정보·비용 검증이 완료되면
          이용할 수 있습니다. 공고 탐색은 계속 이용할 수 있습니다.
        </p>
      )}
      <button
        className="resume-primary-button"
        type="button"
        disabled={!fixtureEnabled || status === "running"}
        onClick={() => void start()}
      >
        {fixtureEnabled ? "테스트 분석 시작" : "분석 준비 중"}
      </button>
      {status === "running" ? (
        <>
          <span role="status">분석 중입니다.</span>
          <button
            className="resume-secondary-button"
            type="button"
            onClick={cancel}
          >
            분석 취소
          </button>
        </>
      ) : null}
      {status === "completed" ? (
        <p role="status">Analysis Job 완료 · Resume Version {resumeVersion}</p>
      ) : null}
      {status === "cancelled" ? (
        <p role="status">
          분석 취소됨 · 이미 시작된 모델 호출은 사용량에 포함될 수 있습니다.
        </p>
      ) : null}
      {used !== null && limit !== null ? (
        <p>
          오늘 분석 사용량 {used} / {limit} · 한국 시간 자정 초기화
        </p>
      ) : null}
      {error ? (
        <p className="resume-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
