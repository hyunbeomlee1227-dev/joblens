export type AnalysisModelInput = {
  sanitizedResume: string;
  postingText: string;
};

/** Providers must honor cancellation and must not retain, log, or cache input. */
export interface AnalysisModelProvider {
  invoke(input: AnalysisModelInput, signal: AbortSignal): Promise<void>;
}

export type AnalysisPosting = {
  text: string;
  analysisPermitted: boolean;
  eligible: boolean;
};

export class AnalysisJobRegistry {
  private readonly jobs = new Map<
    string,
    { subject: string; controller: AbortController }
  >();

  register(
    jobId: string,
    subject: string,
    controller: AbortController,
  ): boolean {
    if (this.jobs.has(jobId)) return false;
    this.jobs.set(jobId, { subject, controller });
    return true;
  }

  release(jobId: string) {
    this.jobs.delete(jobId);
  }

  cancel(jobId: string, subject: string): boolean {
    const job = this.jobs.get(jobId);
    if (job?.subject !== subject) return false;
    job.controller.abort();
    this.jobs.delete(jobId);
    return true;
  }

  cancelCandidate(subject: string) {
    for (const [jobId, job] of this.jobs) {
      if (job.subject === subject) this.cancel(jobId, subject);
    }
  }
}

export const analysisJobs = new AnalysisJobRegistry();

export function withAnalysisSignal<T>(
  operation: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new Error("analysis_cancelled"));
    if (signal.aborted) {
      operation.catch(() => {});
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    operation
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
}
