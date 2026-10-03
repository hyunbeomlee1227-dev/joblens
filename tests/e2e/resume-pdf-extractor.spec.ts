import { expect, test } from "@playwright/test";

import { extractResumePdf } from "@/features/resume/resume-pdf-extractor";

test("PDF extraction uses embedded text first and OCR only for an empty page", async () => {
  const ocrCalls: number[] = [];
  const file = new File(["%PDF-1.7 synthetic"], "resume.pdf", {
    type: "application/pdf",
  });

  const pages = await extractResumePdf(file, {
    async openPdf() {
      return {
        pageCount: 2,
        async readPage(pageNumber) {
          return {
            text:
              pageNumber === 1
                ? "Built Spring services and React interfaces."
                : "  \n ",
            ocrSource: pageNumber,
          };
        },
      };
    },
    async recognize(ocrSource) {
      ocrCalls.push(ocrSource as number);
      return "한글 이력서 프로젝트 경험";
    },
  });

  expect(pages).toEqual([
    {
      pageNumber: 1,
      text: "Built Spring services and React interfaces.",
      method: "text",
    },
    {
      pageNumber: 2,
      text: "한글 이력서 프로젝트 경험",
      method: "ocr",
    },
  ]);
  expect(ocrCalls).toEqual([2]);
});

test("invalid format, files over 10 MB, and documents over 10 pages are rejected before extraction", async () => {
  let opens = 0;
  const dependencies = {
    async openPdf() {
      opens += 1;
      return {
        pageCount: 11,
        async readPage() {
          throw new Error("pages must not be read");
        },
      };
    },
    async recognize() {
      throw new Error("OCR must not run");
    },
  };

  await expect(
    extractResumePdf(
      new File(["not a pdf"], "resume.pdf", { type: "application/pdf" }),
      dependencies,
    ),
  ).rejects.toMatchObject({ code: "invalid_format" });
  expect(opens).toBe(0);

  await expect(
    extractResumePdf(
      new File(["%PDF-", new Uint8Array(10 * 1024 * 1024)], "large.pdf", {
        type: "application/pdf",
      }),
      dependencies,
    ),
  ).rejects.toMatchObject({ code: "too_large" });
  expect(opens).toBe(0);

  await expect(
    extractResumePdf(
      new File(["%PDF-1.7"], "long.pdf", { type: "application/pdf" }),
      dependencies,
    ),
  ).rejects.toMatchObject({ code: "too_many_pages" });
  expect(opens).toBe(1);
});
