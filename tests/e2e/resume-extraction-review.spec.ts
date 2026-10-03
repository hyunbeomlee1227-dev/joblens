import { expect, test } from "@playwright/test";

test("the Resume workspace is reachable from the public navigation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "이력서 준비" }).click();
  await expect(page).toHaveURL(/\/resume$/);
  await expect(
    page.getByRole("heading", { name: "이력서 추출과 검토" }),
  ).toBeVisible();
});

test("a Candidate can review, sanitize, and approve pasted Resume text only for the current tab", async ({
  page,
}) => {
  await page.goto("/resume");

  await expect(
    page.getByRole("heading", { name: "이력서 추출과 검토" }),
  ).toBeVisible();
  await page
    .getByLabel("이력서 텍스트")
    .fill(
      [
        "이현범",
        "hyunbeom@example.com · 010-1234-5678",
        "Spring Boot 서비스와 React 화면을 개발했습니다.",
      ].join("\n"),
    );
  await page.getByRole("button", { name: "Extraction Review 시작" }).click();

  const review = page.getByLabel("입력 내용 검토");
  await expect(review).toHaveValue(/Spring Boot/);
  await review.fill(
    [
      "hyunbeom@example.com · 010-1234-5678",
      "Spring Boot 서비스와 Next.js 화면을 개발했습니다.",
    ].join("\n"),
  );
  await page.getByLabel("입력 내용이 정확합니다").check();
  await page.getByRole("button", { name: "식별정보 제거 및 미리보기" }).click();

  const preview = page.getByLabel("전송될 Sanitized Resume 전체 내용");
  await expect(preview).toContainText("[이메일 제거]");
  await expect(preview).toContainText("[전화번호 제거]");
  await expect(preview).toContainText("Next.js 화면");
  await expect(preview).not.toContainText("hyunbeom@example.com");
  await expect(preview).not.toContainText("010-1234-5678");

  await page.getByLabel("전송될 전체 내용을 확인했습니다").check();
  const approve = page.getByRole("button", {
    name: "이 내용으로 추천 분석 승인",
  });
  await expect(approve).toBeDisabled();
  await page
    .getByLabel("이름·주소 등 직접 식별정보가 남아 있지 않습니다")
    .check();
  await approve.click();
  await expect(page.getByText("Resume Version 1 승인됨")).toBeVisible();
  await expect(
    page.getByText("현재 탭에서만 다음 분석에 사용됩니다."),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByText("Resume Version 1 승인됨")).toHaveCount(0);
  await expect(page.getByLabel("이력서 텍스트")).toHaveValue("");
});

test("a text PDF is extracted into editable pages without uploading the file", async ({
  page,
}) => {
  const uploads: string[] = [];
  page.on("request", (request) => {
    if (!["GET", "HEAD"].includes(request.method()))
      uploads.push(request.url());
  });
  await page.goto("/resume");

  await page.getByLabel("PDF 이력서", { exact: true }).setInputFiles({
    name: "english-resume.pdf",
    mimeType: "application/pdf",
    buffer: createTextPdf(["Built reliable Spring and Next.js services."]),
  });
  await page.getByRole("button", { name: "PDF 추출 시작" }).click();

  await expect(page.getByText("1페이지 · 텍스트 추출")).toBeVisible();
  await expect(page.getByLabel("1페이지 검토")).toHaveValue(
    /Built reliable Spring and Next.js services/,
  );
  expect(uploads).toEqual([]);
});

test("editing an approved Resume requires explicit approval for a new version and clearing removes it", async ({
  page,
}) => {
  await page.goto("/resume");
  await page
    .getByLabel("이력서 텍스트")
    .fill("Spring Boot 서비스를 운영했습니다.");
  await page.getByRole("button", { name: "Extraction Review 시작" }).click();
  await page.getByLabel("입력 내용이 정확합니다").check();
  await page.getByRole("button", { name: "식별정보 제거 및 미리보기" }).click();
  await page.getByLabel("전송될 전체 내용을 확인했습니다").check();
  await page
    .getByLabel("이름·주소 등 직접 식별정보가 남아 있지 않습니다")
    .check();
  await page
    .getByRole("button", { name: "이 내용으로 추천 분석 승인" })
    .click();

  await page.getByRole("button", { name: "내용 수정" }).click();
  await page
    .getByLabel("입력 내용 검토")
    .fill("Spring Boot와 Next.js 서비스를 운영했습니다.");
  await expect(
    page.getByRole("button", { name: "식별정보 제거 및 미리보기" }),
  ).toBeDisabled();
  await page.getByLabel("입력 내용이 정확합니다").check();
  await page.getByRole("button", { name: "식별정보 제거 및 미리보기" }).click();
  await page.getByLabel("전송될 전체 내용을 확인했습니다").check();
  await page
    .getByLabel("이름·주소 등 직접 식별정보가 남아 있지 않습니다")
    .check();
  await page
    .getByRole("button", { name: "이 내용으로 추천 분석 승인" })
    .click();
  await expect(page.getByText("Resume Version 2 승인됨")).toBeVisible();

  await page.getByRole("button", { name: "이력서 지우기" }).click();
  await expect(page.getByText("Resume Version 2 승인됨")).toHaveCount(0);
  await expect(page.getByLabel("이력서 텍스트")).toHaveValue("");
});

function createTextPdf(pageTexts: string[]): Buffer {
  const objects: string[] = [];
  const fontObjectNumber = 3 + pageTexts.length * 2;
  const pageObjectNumbers = pageTexts.map((_, index) => 3 + index * 2);
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(
    `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(" ")}] /Count ${pageTexts.length} >>`,
  );
  for (const [index, text] of pageTexts.entries()) {
    const pageObjectNumber = pageObjectNumbers[index];
    const contentObjectNumber = pageObjectNumber + 1;
    const escaped = text
      .replaceAll("\\", "\\\\")
      .replaceAll("(", "\\(")
      .replaceAll(")", "\\)");
    const stream = `BT /F1 14 Tf 50 760 Td (${escaped}) Tj ET`;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`,
    );
    objects.push(
      `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    );
  }
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  pdf += offsets
    .slice(1)
    .map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "ascii");
}
