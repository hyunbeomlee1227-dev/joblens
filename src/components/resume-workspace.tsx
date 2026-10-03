"use client";

import { useRef, useState } from "react";

import {
  extractResumePdfInBrowser,
  type ResumeExtractionProgress,
} from "@/features/resume/browser-resume-pdf-extractor";
import {
  ResumePdfValidationError,
  type ExtractedResumePage,
} from "@/features/resume/resume-pdf-extractor";
import { sanitizeResume } from "@/features/resume/sanitize-resume";

type Stage = "input" | "review" | "preview" | "approved";

type ReviewSegment = {
  id: string;
  label: string;
  text: string;
  method?: ExtractedResumePage["method"];
};

export function ResumeWorkspace() {
  const pdfInput = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("input");
  const [sourceText, setSourceText] = useState("");
  const [directIdentifiers, setDirectIdentifiers] = useState("");
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [segments, setSegments] = useState<ReviewSegment[]>([]);
  const [confirmedSegments, setConfirmedSegments] = useState<Set<string>>(
    new Set(),
  );
  const [previewConfirmed, setPreviewConfirmed] = useState(false);
  const [identifiersConfirmed, setIdentifiersConfirmed] = useState(false);
  const [sanitizedResume, setSanitizedResume] = useState("");
  const [resumeVersion, setResumeVersion] = useState(0);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState<ResumeExtractionProgress | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function beginTextReview() {
    if (sourceText.trim() === "") return;
    setDirectIdentifiers("");
    setSegments([{ id: "input", label: "입력 내용", text: sourceText }]);
    setConfirmedSegments(new Set());
    setStage("review");
  }

  async function beginPdfReview() {
    if (selectedPdf === null) return;
    setExtracting(true);
    setErrorMessage(null);
    try {
      const pages = await extractResumePdfInBrowser(selectedPdf, setProgress);
      setDirectIdentifiers("");
      setSegments(
        pages.map((page) => ({
          id: `page-${page.pageNumber}`,
          label: `${page.pageNumber}페이지`,
          text: page.text,
          method: page.method,
        })),
      );
      setConfirmedSegments(new Set());
      setStage("review");
    } catch (error) {
      setErrorMessage(resumePdfErrorMessage(error));
    } finally {
      setExtracting(false);
      setProgress(null);
      setSelectedPdf(null);
      if (pdfInput.current !== null) pdfInput.current.value = "";
    }
  }

  function updateSegment(id: string, text: string) {
    setSegments((current) =>
      current.map((segment) =>
        segment.id === id ? { ...segment, text } : segment,
      ),
    );
    setConfirmedSegments((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  function setSegmentConfirmed(id: string, confirmed: boolean) {
    setConfirmedSegments((current) => {
      const next = new Set(current);
      if (confirmed) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function createPreview() {
    if (
      segments.length === 0 ||
      segments.some(
        (segment) =>
          !confirmedSegments.has(segment.id) || segment.text.trim() === "",
      )
    ) {
      return;
    }
    setSanitizedResume(
      segments
        .map((segment) =>
          sanitizeResume(segment.text.trim(), directIdentifiers.split(/\r?\n/)),
        )
        .join("\n\n"),
    );
    setPreviewConfirmed(false);
    setIdentifiersConfirmed(false);
    setStage("preview");
  }

  function approve() {
    if (!previewConfirmed || !identifiersConfirmed) return;
    setResumeVersion((current) => current + 1);
    setStage("approved");
  }

  function editApprovedResume() {
    setConfirmedSegments(new Set());
    setPreviewConfirmed(false);
    setIdentifiersConfirmed(false);
    setStage("review");
  }

  function clearResume() {
    setSourceText("");
    setDirectIdentifiers("");
    setSelectedPdf(null);
    setSegments([]);
    setConfirmedSegments(new Set());
    setPreviewConfirmed(false);
    setIdentifiersConfirmed(false);
    setSanitizedResume("");
    setResumeVersion(0);
    setErrorMessage(null);
    setStage("input");
    if (pdfInput.current !== null) pdfInput.current.value = "";
  }

  const allSegmentsConfirmed =
    segments.length > 0 &&
    segments.every(
      (segment) =>
        confirmedSegments.has(segment.id) && segment.text.trim() !== "",
    );

  return (
    <div className="resume-workspace">
      <div className="resume-privacy-notice" role="note">
        <strong>원본 이력서는 이 브라우저 탭을 벗어나지 않습니다.</strong>
        <span>
          추출·교정·식별정보 제거는 브라우저에서 처리하며 승인 전에는 서버로
          전송하지 않습니다.
        </span>
        <span>
          현재 단계에서는 Sanitized Resume 승인본까지만 준비합니다. 추천 분석은
          사용할 수 있는 Job Posting과 비용·개인정보 보호 장치가 연결된 뒤
          제공됩니다.
        </span>
      </div>

      {stage === "input" ? (
        <div className="resume-input-grid">
          <section className="resume-card" aria-labelledby="resume-pdf-heading">
            <div className="resume-card-heading">
              <span>PDF로 시작</span>
              <h2 id="resume-pdf-heading">PDF 이력서를 선택하세요</h2>
            </div>
            <label className="resume-file-field">
              <span>PDF 이력서</span>
              <input
                accept="application/pdf,.pdf"
                onChange={(event) => {
                  setSelectedPdf(event.target.files?.[0] ?? null);
                  setErrorMessage(null);
                }}
                ref={pdfInput}
                type="file"
              />
            </label>
            <p className="resume-help">
              한국어·영어 PDF, 최대 10MB·10페이지. 텍스트가 없는 페이지만 OCR을
              사용합니다.
            </p>
            {errorMessage ? (
              <p className="resume-error" role="alert">
                {errorMessage}
              </p>
            ) : null}
            {extracting ? (
              <p className="resume-progress" role="status">
                {progress?.status === "ocr"
                  ? "텍스트가 없는 페이지를 OCR로 읽는 중입니다."
                  : progress
                    ? `${progress.pageNumber}페이지를 읽는 중입니다.`
                    : "PDF를 확인하는 중입니다."}
              </p>
            ) : null}
            <button
              className="resume-primary-button"
              disabled={selectedPdf === null || extracting}
              onClick={() => void beginPdfReview()}
              type="button"
            >
              PDF 추출 시작
            </button>
          </section>

          <section
            className="resume-card"
            aria-labelledby="resume-text-heading"
          >
            <div className="resume-card-heading">
              <span>텍스트로 시작</span>
              <h2 id="resume-text-heading">이력서 내용을 직접 입력하세요</h2>
            </div>
            <label className="resume-field">
              <span>이력서 텍스트</span>
              <textarea
                value={sourceText}
                onChange={(event) => setSourceText(event.target.value)}
                placeholder="경력, 프로젝트, 기술, 교육 내용을 붙여넣으세요."
                rows={12}
              />
            </label>
            <p className="resume-help">
              Job Posting 입력은 제공하지 않습니다. 이 입력은 Resume에만
              사용됩니다.
            </p>
            <button
              className="resume-primary-button"
              disabled={sourceText.trim() === ""}
              onClick={beginTextReview}
              type="button"
            >
              Extraction Review 시작
            </button>
          </section>
        </div>
      ) : null}

      {stage === "review" ? (
        <section className="resume-card" aria-labelledby="review-heading">
          <div className="resume-card-heading">
            <span>Extraction Review</span>
            <h2 id="review-heading">추출 내용을 교정하고 확인하세요</h2>
          </div>
          <div className="resume-review-pages">
            {segments.map((segment) => (
              <article className="resume-review-page" key={segment.id}>
                <strong>
                  {segment.label}
                  {segment.method
                    ? ` · ${segment.method === "ocr" ? "OCR" : "텍스트 추출"}`
                    : ""}
                </strong>
                <label className="resume-field">
                  <span>{segment.label} 검토</span>
                  <textarea
                    aria-label={`${segment.label} 검토`}
                    value={segment.text}
                    onChange={(event) =>
                      updateSegment(segment.id, event.target.value)
                    }
                    rows={10}
                  />
                </label>
                <label className="resume-confirmation">
                  <input
                    aria-label={`${segment.label}이 정확합니다`}
                    checked={confirmedSegments.has(segment.id)}
                    onChange={(event) =>
                      setSegmentConfirmed(segment.id, event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>{segment.label}이 정확합니다</span>
                </label>
              </article>
            ))}
          </div>
          <label className="resume-field resume-identifier-field">
            <span>추가로 제거할 이름·주소</span>
            <textarea
              value={directIdentifiers}
              onChange={(event) => setDirectIdentifiers(event.target.value)}
              placeholder={"이현범\n서울시 강남구 …"}
              rows={3}
            />
          </label>
          <p className="resume-help">
            자동으로 제거하기 어려운 이름·주소는 한 줄에 하나씩 입력하세요. 이
            값도 현재 탭 안에서만 사용됩니다.
          </p>
          <button
            className="resume-primary-button"
            disabled={!allSegmentsConfirmed}
            onClick={createPreview}
            type="button"
          >
            식별정보 제거 및 미리보기
          </button>
        </section>
      ) : null}

      {stage === "preview" || stage === "approved" ? (
        <section className="resume-card" aria-labelledby="preview-heading">
          <div className="resume-card-heading">
            <span>Sanitized Resume</span>
            <h2 id="preview-heading">전송될 전체 내용을 확인하세요</h2>
          </div>
          <div
            aria-label="전송될 Sanitized Resume 전체 내용"
            className="resume-preview"
          >
            {sanitizedResume}
          </div>

          {stage === "preview" ? (
            <>
              <p className="resume-help">
                자동 제거된 이메일·전화번호 외에 이름, 주소와 같은 직접
                식별정보가 남아 있다면 이전 단계에서 직접 지워주세요.
              </p>
              <label className="resume-confirmation">
                <input
                  checked={previewConfirmed}
                  onChange={(event) =>
                    setPreviewConfirmed(event.target.checked)
                  }
                  type="checkbox"
                />
                <span>전송될 전체 내용을 확인했습니다</span>
              </label>
              <label className="resume-confirmation">
                <input
                  checked={identifiersConfirmed}
                  onChange={(event) =>
                    setIdentifiersConfirmed(event.target.checked)
                  }
                  type="checkbox"
                />
                <span>이름·주소 등 직접 식별정보가 남아 있지 않습니다</span>
              </label>
              <div className="resume-actions">
                <button
                  className="resume-secondary-button"
                  onClick={() => setStage("review")}
                  type="button"
                >
                  다시 교정
                </button>
                <button
                  className="resume-primary-button"
                  disabled={!previewConfirmed || !identifiersConfirmed}
                  onClick={approve}
                  type="button"
                >
                  Sanitized Resume 승인
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="resume-approved" role="status">
                <strong>Resume Version {resumeVersion} 승인됨</strong>
                <span>현재 탭에서만 다음 분석에 사용됩니다.</span>
                <span>추천 분석 기능은 아직 준비 중입니다.</span>
                <span>
                  분석 요청 중에는 JobLens 서버와 AWS Bedrock으로 전송되지만,
                  재사용을 위해 서버에 저장하지 않습니다. 새로고침·탭
                  닫기·로그아웃 후에는 다시 승인해야 합니다.
                </span>
              </div>
              <div className="resume-actions resume-approved-actions">
                <button
                  className="resume-secondary-button"
                  onClick={editApprovedResume}
                  type="button"
                >
                  내용 수정
                </button>
                <button
                  className="resume-danger-button"
                  onClick={clearResume}
                  type="button"
                >
                  이력서 지우기
                </button>
              </div>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}

function resumePdfErrorMessage(error: unknown): string {
  if (!(error instanceof ResumePdfValidationError)) {
    return "PDF를 읽지 못했습니다. 다른 파일을 선택해주세요.";
  }
  return {
    invalid_format: "올바른 PDF 파일만 사용할 수 있습니다.",
    too_large: "PDF는 최대 10MB까지 사용할 수 있습니다.",
    too_many_pages: "PDF는 최대 10페이지까지 사용할 수 있습니다.",
    encrypted: "암호화된 PDF는 사용할 수 없습니다.",
  }[error.code];
}
