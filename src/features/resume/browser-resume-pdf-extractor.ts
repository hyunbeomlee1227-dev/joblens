"use client";

import {
  extractResumePdf,
  ResumePdfValidationError,
  type ExtractedResumePage,
} from "./resume-pdf-extractor";

export type ResumeExtractionProgress = {
  status: "reading" | "ocr";
  pageNumber: number;
  progress?: number;
};

export async function extractResumePdfInBrowser(
  file: File,
  onProgress?: (progress: ResumeExtractionProgress) => void,
): Promise<ExtractedResumePage[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const ocrState: {
    worker: Awaited<
      ReturnType<(typeof import("tesseract.js"))["createWorker"]>
    > | null;
  } = { worker: null };

  try {
    return await extractResumePdf(file, {
      async openPdf(pdfFile) {
        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(await pdfFile.arrayBuffer()),
        });
        let document: Awaited<typeof loadingTask.promise>;
        try {
          document = await loadingTask.promise;
        } catch (error) {
          await loadingTask.destroy();
          if (isNamedError(error, "PasswordException")) {
            throw new ResumePdfValidationError("encrypted");
          }
          throw new ResumePdfValidationError("invalid_format");
        }

        return {
          pageCount: document.numPages,
          async readPage(pageNumber: number) {
            onProgress?.({ status: "reading", pageNumber });
            const page = await document.getPage(pageNumber);
            const content = await page.getTextContent();
            const text = content.items
              .map((item) => ("str" in item ? item.str : ""))
              .join(" ");
            const viewport = page.getViewport({ scale: 2 });
            const canvas = window.document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            const canvasContext = canvas.getContext("2d");
            if (canvasContext === null) {
              throw new Error("Canvas is unavailable");
            }
            await page.render({ canvas, canvasContext, viewport }).promise;
            return { text, ocrSource: canvas };
          },
          async close() {
            await loadingTask.destroy();
          },
        };
      },
      async recognize(ocrSource) {
        const { createWorker } = await import("tesseract.js");
        ocrState.worker ??= await createWorker(["kor", "eng"], undefined, {
          logger(message) {
            if (message.status === "recognizing text") {
              onProgress?.({
                status: "ocr",
                pageNumber: 0,
                progress: message.progress,
              });
            }
          },
        });
        const result = await ocrState.worker.recognize(
          ocrSource as HTMLCanvasElement,
        );
        return result.data.text;
      },
    });
  } finally {
    await ocrState.worker?.terminate();
  }
}

function isNamedError(error: unknown, name: string): boolean {
  return error instanceof Error && error.name === name;
}
