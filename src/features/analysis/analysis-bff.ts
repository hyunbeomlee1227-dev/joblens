import { timingSafeEqual } from "node:crypto";

import {
  readRequestCookie,
  sessionCookieName,
} from "@/features/candidate/candidate-bff";
import {
  analysisDay,
  type AnalysisAllowanceLedger,
  type AnalysisAttempt,
} from "./analysis-allowance";
import {
  AnalysisJobRegistry,
  withAnalysisSignal,
  type AnalysisModelInput,
  type AnalysisModelProvider,
  type AnalysisPosting,
} from "./analysis-job";

export type AnalysisBffOptions = {
  allowedOrigin: string;
  readSession(
    id: string,
  ): Promise<{ candidateSubject: string; csrfToken: string } | null>;
  ledger: AnalysisAllowanceLedger;
  dailyLimit: number;
  enabled(): boolean;
  resolvePosting(id: string): Promise<AnalysisPosting | null>;
  model: AnalysisModelProvider;
  now?: () => Date;
  timeoutMs?: number;
  jobs?: AnalysisJobRegistry;
};

export function createAnalysisBff(options: AnalysisBffOptions) {
  const now = options.now ?? (() => new Date());
  const jobs = options.jobs ?? new AnalysisJobRegistry();
  const timeoutMs = Math.min(
    15 * 60 * 1000,
    Math.max(1, options.timeoutMs ?? 15 * 60 * 1000),
  );

  async function session(request: Request) {
    const id = readRequestCookie(request, sessionCookieName);
    return id === null ? null : options.readSession(id);
  }

  function allowed(request: Request) {
    return (
      request.headers.get("origin") === options.allowedOrigin &&
      (new URL(request.url).origin === options.allowedOrigin ||
        request.headers.get("host") === new URL(options.allowedOrigin).host)
    );
  }

  async function allowance(request: Request) {
    try {
      const candidate = await session(request);
      if (candidate === null) return reply({ error: "unauthorized" }, 401);
      const period = analysisDay(now());
      return reply({
        enabled: options.enabled(),
        allowance: {
          ...period,
          used: await options.ledger.read(
            candidate.candidateSubject,
            period.day,
          ),
          limit: options.dailyLimit,
        },
      });
    } catch {
      return reply({ error: "analysis_unavailable" }, 503);
    }
  }

  async function start(request: Request) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    request.signal.addEventListener("abort", abort, { once: true });
    if (request.signal.aborted) abort();
    const timer = setTimeout(abort, timeoutMs);
    const input: AnalysisModelInput = { sanitizedResume: "", postingText: "" };
    let body: Record<string, unknown> | null = null;
    let jobId: string | null = null;
    let attempt: AnalysisAttempt | null = null;
    let consumed = false;
    let dispatched = false;
    try {
      if (!allowed(request)) return reply({ error: "forbidden" }, 403);
      const candidate = await withAnalysisSignal(
        session(request),
        controller.signal,
      );
      if (candidate === null) return reply({ error: "unauthorized" }, 401);
      body = await readBody(request, controller.signal);
      if (!validCsrf(body.csrfToken, candidate.csrfToken))
        return reply({ error: "forbidden" }, 403);
      if (
        !options.enabled() ||
        !Number.isSafeInteger(options.dailyLimit) ||
        options.dailyLimit < 1
      )
        return reply({ error: "analysis_disabled" }, 503);
      if (!validStart(body)) return reply({ error: "invalid_request" }, 400);
      input.sanitizedResume = body.sanitizedResume as string;
      const version = body.resumeVersion as number;
      const id = body.jobId as string;
      let posting = await withAnalysisSignal(
        options.resolvePosting(body.listingId as string),
        controller.signal,
      );
      if (
        posting === null ||
        !posting.eligible ||
        !posting.analysisPermitted ||
        posting.text.trim() === ""
      )
        return reply({ error: "posting_not_eligible" }, 422);
      input.postingText = posting.text;
      posting = null;
      for (const key of Object.keys(body)) delete body[key];
      body = null;
      if (!jobs.register(id, candidate.candidateSubject, controller))
        return reply({ error: "duplicate_job" }, 409);
      jobId = id;
      controller.signal.throwIfAborted();
      if (!options.enabled()) return reply({ error: "analysis_disabled" }, 503);
      const period = analysisDay(now());
      attempt = {
        candidateSubject: candidate.candidateSubject,
        jobId: id,
        day: period.day,
        limit: options.dailyLimit,
        expiresAtEpoch: Date.parse(period.resetsAt) / 1000 + 86400,
      };
      const reservation = attempt;
      const reservationResult = await withAnalysisSignal(
        options.ledger.consume(reservation).then(async (result) => {
          consumed = result === "consumed";
          if (consumed && controller.signal.aborted)
            await options.ledger.refund(reservation);
          return result;
        }),
        controller.signal,
      );
      if (reservationResult !== "consumed")
        return reply(
          {
            error:
              reservationResult === "limit"
                ? "allowance_exhausted"
                : "duplicate_job",
          },
          reservationResult === "limit" ? 429 : 409,
        );
      controller.signal.throwIfAborted();
      if (!options.enabled()) return reply({ error: "analysis_disabled" }, 503);
      try {
        dispatched = true;
        await withAnalysisSignal(
          options.model.invoke(input, controller.signal),
          controller.signal,
        );
      } finally {
        input.sanitizedResume = "";
        input.postingText = "";
      }
      return reply({
        status: "completed",
        jobId: id,
        resumeVersion: version,
        allowance: {
          ...period,
          used: await withAnalysisSignal(
            options.ledger.read(candidate.candidateSubject, period.day),
            controller.signal,
          ),
          limit: options.dailyLimit,
        },
      });
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof InvalidAnalysisBody)
        return reply({ error: "invalid_request" }, 400);
      return reply(
        {
          error: controller.signal.aborted
            ? "analysis_cancelled"
            : "analysis_failed",
        },
        controller.signal.aborted ? 408 : 502,
      );
    } finally {
      input.sanitizedResume = "";
      input.postingText = "";
      if (body !== null) for (const key of Object.keys(body)) delete body[key];
      body = null;
      clearTimeout(timer);
      request.signal.removeEventListener("abort", abort);
      if (jobId !== null) jobs.release(jobId);
      if (consumed && !dispatched && attempt !== null)
        void options.ledger.refund(attempt).catch(() => {});
    }
  }

  async function cancel(request: Request) {
    let body: Record<string, unknown> | null = null;
    try {
      if (!allowed(request)) return reply({ error: "forbidden" }, 403);
      const candidate = await session(request);
      if (candidate === null) return reply({ error: "unauthorized" }, 401);
      body = await readBody(request, request.signal);
      if (!validCsrf(body.csrfToken, candidate.csrfToken))
        return reply({ error: "forbidden" }, 403);
      if (typeof body.jobId !== "string")
        return reply({ error: "invalid_request" }, 400);
      return jobs.cancel(body.jobId, candidate.candidateSubject)
        ? reply({ status: "cancelled" })
        : reply({ error: "job_not_found" }, 404);
    } catch {
      return reply({ error: "invalid_request" }, 400);
    } finally {
      if (body !== null) for (const key of Object.keys(body)) delete body[key];
    }
  }

  return {
    start,
    allowance,
    cancel,
    cancelCandidate: (subject: string) => jobs.cancelCandidate(subject),
  };
}

function validStart(body: Record<string, unknown>) {
  return (
    body.approved === true &&
    Number.isSafeInteger(body.resumeVersion) &&
    (body.resumeVersion as number) > 0 &&
    typeof body.sanitizedResume === "string" &&
    body.sanitizedResume.trim().length > 0 &&
    body.sanitizedResume.length <= 100000 &&
    typeof body.jobId === "string" &&
    /^[a-zA-Z0-9-]{16,80}$/.test(body.jobId) &&
    typeof body.listingId === "string" &&
    body.listingId.length <= 200 &&
    ["batch", "retry", "deep"].includes(body.kind as string)
  );
}

function validCsrf(value: unknown, expected: string) {
  if (typeof value !== "string") return false;
  const supplied = Buffer.from(value);
  const known = Buffer.from(expected);
  return supplied.length === known.length && timingSafeEqual(supplied, known);
}

function reply(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

async function readBody(
  request: Request,
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new InvalidAnalysisBody();
  const reader = request.body?.getReader();
  if (reader === undefined) throw new InvalidAnalysisBody();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await withAnalysisSignal(reader.read(), signal);
      if (done) break;
      length += value.length;
      if (length > 256 * 1024) throw new InvalidAnalysisBody();
      chunks.push(value);
    }
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (value === null || typeof value !== "object" || Array.isArray(value))
      throw new InvalidAnalysisBody();
    return value as Record<string, unknown>;
  } finally {
    for (const chunk of chunks) chunk.fill(0);
    chunks.length = 0;
    void reader.cancel().catch(() => {});
  }
}

class InvalidAnalysisBody extends Error {}
