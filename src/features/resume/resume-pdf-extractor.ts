export type ExtractedResumePage = {
  pageNumber: number;
  text: string;
  method: "text" | "ocr";
};

type ResumePdfPage = {
  text: string;
  ocrSource: unknown;
};

type ResumePdfDocument = {
  pageCount: number;
  readPage(pageNumber: number): Promise<ResumePdfPage>;
  close?(): Promise<void>;
};

export type ResumePdfExtractionDependencies = {
  openPdf(file: File): Promise<ResumePdfDocument>;
  recognize(ocrSource: unknown): Promise<string>;
};

export type ResumePdfValidationCode =
  "invalid_format" | "too_large" | "too_many_pages" | "encrypted";

export class ResumePdfValidationError extends Error {
  readonly name = "ResumePdfValidationError";

  constructor(readonly code: ResumePdfValidationCode) {
    super(code);
  }
}

export async function extractResumePdf(
  file: File,
  dependencies: ResumePdfExtractionDependencies,
): Promise<ExtractedResumePage[]> {
  if (file.size > 10 * 1024 * 1024) {
    throw new ResumePdfValidationError("too_large");
  }
  const signature = new TextDecoder("ascii").decode(
    await file.slice(0, 5).arrayBuffer(),
  );
  if (
    (file.type !== "" && file.type !== "application/pdf") ||
    signature !== "%PDF-"
  ) {
    throw new ResumePdfValidationError("invalid_format");
  }

  const document = await dependencies.openPdf(file);
  try {
    if (document.pageCount < 1 || document.pageCount > 10) {
      throw new ResumePdfValidationError(
        document.pageCount > 10 ? "too_many_pages" : "invalid_format",
      );
    }
    const pages: ExtractedResumePage[] = [];

    for (
      let pageNumber = 1;
      pageNumber <= document.pageCount;
      pageNumber += 1
    ) {
      const page = await document.readPage(pageNumber);
      if (hasUsableText(page.text)) {
        pages.push({ pageNumber, text: page.text.trim(), method: "text" });
        continue;
      }
      pages.push({
        pageNumber,
        text: (await dependencies.recognize(page.ocrSource)).trim(),
        method: "ocr",
      });
    }

    return pages;
  } finally {
    await document.close?.();
  }
}

function hasUsableText(text: string): boolean {
  return text.replace(/\s/g, "").length >= 10;
}
