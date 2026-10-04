export type DailyAnalysisAllowance = {
  day: string;
  used: number;
  limit: number;
  resetsAt: string;
};

export type AnalysisAttempt = {
  candidateSubject: string;
  jobId: string;
  day: string;
  limit: number;
  expiresAtEpoch: number;
};

export interface AnalysisAllowanceLedger {
  read(candidateSubject: string, day: string): Promise<number>;
  consume(
    attempt: AnalysisAttempt,
  ): Promise<"consumed" | "limit" | "duplicate">;
  refund(attempt: AnalysisAttempt): Promise<void>;
}

export function analysisDay(now: Date) {
  const day = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const resetsAt = new Date(
    Date.parse(`${day}T00:00:00Z`) + 15 * 60 * 60 * 1000,
  );
  return { day, resetsAt: resetsAt.toISOString() };
}

/** Only for controlled fixtures; production uses atomic DynamoDB transactions. */
export class InMemoryAnalysisAllowance implements AnalysisAllowanceLedger {
  private readonly days = new Map<string, Set<string>>();

  async read(candidateSubject: string, day: string) {
    return this.days.get(JSON.stringify([candidateSubject, day]))?.size ?? 0;
  }

  async consume(attempt: AnalysisAttempt) {
    const key = JSON.stringify([attempt.candidateSubject, attempt.day]);
    const jobs = this.days.get(key) ?? new Set<string>();
    if (jobs.has(attempt.jobId)) return "duplicate" as const;
    if (jobs.size >= attempt.limit) return "limit" as const;
    jobs.add(attempt.jobId);
    this.days.set(key, jobs);
    return "consumed" as const;
  }

  async refund(attempt: AnalysisAttempt) {
    this.days
      .get(JSON.stringify([attempt.candidateSubject, attempt.day]))
      ?.delete(attempt.jobId);
  }
}
