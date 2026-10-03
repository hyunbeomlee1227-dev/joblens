export function sanitizeResume(
  text: string,
  directIdentifiers: string[] = [],
): string {
  const automaticallySanitized = text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[이메일 제거]")
    .replace(
      /(?:\+?82[-.\s]?)?(?:0?10)[-.\s]?\d{3,4}[-.\s]?\d{4}/g,
      "[전화번호 제거]",
    )
    .replace(/(?:https?:\/\/|www\.)[^\s)]+/gi, "[웹 주소 제거]")
    .replace(/\b\d{6}-?[1-4]\d{6}\b/g, "[주민등록번호 제거]");

  return directIdentifiers.reduce(
    (sanitized, identifier) =>
      identifier.trim().length >= 2
        ? sanitized.replaceAll(identifier.trim(), "[직접 식별정보 제거]")
        : sanitized,
    automaticallySanitized,
  );
}
