export type JobSourceFailureKind =
  "transient" | "authentication" | "permission" | "quota" | "unknown";

export class JobSourceAdapterError extends Error {
  constructor(
    readonly kind: JobSourceFailureKind,
    message: string,
  ) {
    super(message);
    this.name = "JobSourceAdapterError";
  }
}
