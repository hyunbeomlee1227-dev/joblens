export function sanitizeResume(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[이메일 제거]")
    .replace(
      /(?:\+?82[-.\s]?)?(?:0?10)[-.\s]?\d{3,4}[-.\s]?\d{4}/g,
      "[전화번호 제거]",
    );
}
