import { expect, test } from "@playwright/test";

import { createAnalysisBff } from "@/features/analysis/analysis-bff";
import { InMemoryAnalysisAllowance } from "@/features/analysis/analysis-allowance";
import type { AnalysisModelInput } from "@/features/analysis/analysis-job";
import { AnalysisJobRegistry } from "@/features/analysis/analysis-job";

const origin = "https://www.hyunbeom.site";

function setup(
  overrides: Partial<Parameters<typeof createAnalysisBff>[0]> = {},
) {
  const ledger = new InMemoryAnalysisAllowance();
  const modelInputs: AnalysisModelInput[] = [];
  const state = { enabled: true, now: new Date("2026-10-04T14:59:59Z") };
  const bff = createAnalysisBff({
    allowedOrigin: origin,
    async readSession(id) {
      return id === "session-a"
        ? { candidateSubject: "candidate-a", csrfToken: "csrf-a" }
        : id === "session-b"
          ? { candidateSubject: "candidate-b", csrfToken: "csrf-b" }
          : null;
    },
    ledger,
    dailyLimit: 2,
    enabled: () => state.enabled,
    now: () => state.now,
    async resolvePosting(id) {
      return id === "permitted-posting"
        ? {
            text: "Build Spring services.",
            analysisPermitted: true,
            eligible: true,
          }
        : null;
    },
    model: {
      async invoke(input) {
        modelInputs.push(input);
      },
    },
    ...overrides,
  });
  return { bff, ledger, modelInputs, state };
}

function analysisRequest(overrides: Record<string, unknown> = {}) {
  return new Request(`${origin}/api/analysis`, {
    method: "POST",
    headers: {
      origin,
      cookie: "joblens_session=session-a",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      csrfToken: "csrf-a",
      jobId: crypto.randomUUID(),
      resumeVersion: 1,
      sanitizedResume: "Built Spring services for a project.",
      approved: true,
      listingId: "permitted-posting",
      kind: "batch",
      ...overrides,
    }),
  });
}

test("kill switch or revoked session during dispatch marking prevents the model call", async () => {
  for (const invalidation of ["kill", "session"] as const) {
    const ledger = new InMemoryAnalysisAllowance();
    let enabled = true;
    let activeSession = true;
    const { bff, modelInputs } = setup({
      enabled: () => enabled,
      async readSession() {
        return activeSession
          ? { candidateSubject: "candidate-a", csrfToken: "csrf-a" }
          : null;
      },
      ledger: {
        read: (subject, day) => ledger.read(subject, day),
        consume: (attempt) => ledger.consume(attempt),
        refund: (attempt) => ledger.refund(attempt),
        async markDispatched() {
          await Promise.resolve();
          if (invalidation === "kill") enabled = false;
          else activeSession = false;
        },
      },
    });
    const response = await bff.start(analysisRequest());
    expect(response.status).toBe(invalidation === "kill" ? 503 : 401);
    expect(modelInputs).toHaveLength(0);
    expect(await ledger.read("candidate-a", "2026-10-04")).toBe(0);
  }
});

test("an explicit approved Analysis Job consumes allowance but returns no Resume or model payload", async () => {
  const { bff, modelInputs } = setup();
  const response = await bff.start(
    analysisRequest({ candidateSubject: "forged-subject" }),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  const body = await response.json();
  expect(body).toMatchObject({
    status: "completed",
    resumeVersion: 1,
    allowance: { used: 1, limit: 2, resetsAt: "2026-10-04T15:00:00.000Z" },
  });
  expect(JSON.stringify(body)).not.toContain("Spring");
  expect(modelInputs).toEqual([{ sanitizedResume: "", postingText: "" }]);
});

test("batch, retry, and deep requests share one concurrent allowance and changing Resume Version does not reset it", async () => {
  const { bff } = setup();
  const responses = await Promise.all(
    Array.from({ length: 12 }, (_, index) =>
      bff.start(
        analysisRequest({
          kind: ["batch", "retry", "deep"][index % 3],
          resumeVersion: index + 1,
        }),
      ),
    ),
  );
  expect(responses.filter((response) => response.status === 200)).toHaveLength(
    2,
  );
  expect(responses.filter((response) => response.status === 429)).toHaveLength(
    10,
  );
});

test("duplicate job identifiers never invoke the model twice and KST midnight starts a new daily allowance", async () => {
  const { bff, state } = setup();
  const jobId = crypto.randomUUID();
  expect((await bff.start(analysisRequest({ jobId }))).status).toBe(200);
  expect((await bff.start(analysisRequest({ jobId }))).status).toBe(409);
  expect((await bff.start(analysisRequest())).status).toBe(200);
  expect((await bff.start(analysisRequest())).status).toBe(429);
  state.now = new Date("2026-10-04T15:00:00Z");
  const afterMidnight = await bff.start(analysisRequest());
  expect(await afterMidnight.json()).toMatchObject({
    allowance: {
      used: 1,
      day: "2026-10-05",
      resetsAt: "2026-10-05T15:00:00.000Z",
    },
  });
});

test("authorization, consent, source permission, invalid JSON, and kill switch failures do not consume allowance", async () => {
  const { bff, state, modelInputs } = setup();
  expect(
    (await bff.start(analysisRequest({ csrfToken: "wrong" }))).status,
  ).toBe(403);
  expect((await bff.start(analysisRequest({ approved: false }))).status).toBe(
    400,
  );
  expect(
    (await bff.start(analysisRequest({ listingId: "denied-posting" }))).status,
  ).toBe(422);
  expect(
    (
      await bff.start(
        new Request(`${origin}/api/analysis`, {
          method: "POST",
          headers: {
            origin,
            cookie: "joblens_session=session-a",
            "content-type": "application/json",
          },
          body: "{",
        }),
      )
    ).status,
  ).toBe(400);
  state.enabled = false;
  for (const kind of ["batch", "retry", "deep"])
    expect((await bff.start(analysisRequest({ kind }))).status).toBe(503);
  expect(modelInputs).toEqual([]);
  const allowance = await bff.allowance(analysisRequest());
  expect(await allowance.json()).toMatchObject({
    enabled: false,
    allowance: { used: 0 },
  });
});

test("post-invocation errors expose no payload and still consume allowance while clearing provider input", async () => {
  const inputs: AnalysisModelInput[] = [];
  const { bff } = setup({
    model: {
      async invoke(input) {
        inputs.push(input);
        throw new Error(`secret model payload ${input.sanitizedResume}`);
      },
    },
  });
  const response = await bff.start(analysisRequest());
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({ error: "analysis_failed" });
  expect(inputs).toEqual([{ sanitizedResume: "", postingText: "" }]);
  expect(await (await bff.allowance(analysisRequest())).json()).toMatchObject({
    allowance: { used: 1 },
  });
});

test("only the owning Candidate can cancel; cancelled or expired invocations clear inputs even if the provider ignores abort", async () => {
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const inputs: AnalysisModelInput[] = [];
  const { bff } = setup({
    model: {
      async invoke(input) {
        inputs.push(input);
        entered();
        await new Promise<void>(() => {});
      },
    },
  });
  const jobId = crypto.randomUUID();
  const pending = bff.start(analysisRequest({ jobId }));
  await started;
  const stranger = analysisRequest({ jobId });
  stranger.headers.set("cookie", "joblens_session=unknown");
  expect((await bff.cancel(stranger)).status).toBe(401);
  const otherCandidate = analysisRequest({ jobId, csrfToken: "csrf-b" });
  otherCandidate.headers.set("cookie", "joblens_session=session-b");
  expect((await bff.cancel(otherCandidate)).status).toBe(404);
  expect(await (await bff.allowance(otherCandidate)).json()).toMatchObject({
    allowance: { used: 0 },
  });
  expect((await bff.cancel(analysisRequest({ jobId }))).status).toBe(200);
  expect((await pending).status).toBe(408);
  expect(inputs).toEqual([{ sanitizedResume: "", postingText: "" }]);
  expect(await (await bff.allowance(analysisRequest())).json()).toMatchObject({
    allowance: { used: 1 },
  });

  const expiredInputs: AnalysisModelInput[] = [];
  const expiring = setup({
    timeoutMs: 25,
    model: {
      async invoke(input) {
        expiredInputs.push(input);
        await new Promise<void>(() => {});
      },
    },
  });
  expect((await expiring.bff.start(analysisRequest())).status).toBe(408);
  expect(expiredInputs).toEqual([{ sanitizedResume: "", postingText: "" }]);
});

test("cross-origin and absent or expired sessions cannot submit an Analysis Job", async () => {
  const { bff, modelInputs } = setup();
  const crossOrigin = analysisRequest();
  crossOrigin.headers.set("origin", "https://attacker.example");
  expect((await bff.start(crossOrigin)).status).toBe(403);
  const expired = analysisRequest();
  expired.headers.set("cookie", "joblens_session=expired");
  expect((await bff.start(expired)).status).toBe(401);
  const absent = analysisRequest();
  absent.headers.delete("cookie");
  expect((await bff.start(absent)).status).toBe(401);
  expect(modelInputs).toEqual([]);
});

test("logout while Posting resolution is pending cancels the authenticated request before any dispatch", async () => {
  const jobs = new AnalysisJobRegistry();
  let resolving!: () => void;
  const waiting = new Promise<void>((resolve) => {
    resolving = resolve;
  });
  const { bff, modelInputs } = setup({
    jobs,
    async resolvePosting() {
      resolving();
      return new Promise(() => {});
    },
  });
  const pending = bff.start(analysisRequest());
  await waiting;
  bff.cancelCandidate("candidate-a");
  expect((await pending).status).toBe(408);
  expect(modelInputs).toEqual([]);
  expect(await (await bff.allowance(analysisRequest())).json()).toMatchObject({
    allowance: { used: 0 },
  });
});

test("a transient pre-dispatch refund failure is retried without leaving a charge", async () => {
  const ledger = new InMemoryAnalysisAllowance();
  let enabled = true;
  let failRefund = true;
  const { bff } = setup({
    enabled: () => enabled,
    ledger: {
      markDispatched: (attempt) => ledger.markDispatched(attempt),
      read: (subject, day) => ledger.read(subject, day),
      async consume(attempt) {
        const result = await ledger.consume(attempt);
        enabled = false;
        return result;
      },
      async refund(attempt) {
        if (failRefund) {
          failRefund = false;
          throw new Error("storage unavailable");
        }
        await ledger.refund(attempt);
      },
    },
  });
  expect((await bff.start(analysisRequest())).status).toBe(503);
  await expect
    .poll(
      async () =>
        (await (await bff.allowance(analysisRequest())).json()).allowance.used,
    )
    .toBe(0);
});

test("cancellation while the allowance store is pending never charges a model invocation that did not start", async () => {
  const ledger = new InMemoryAnalysisAllowance();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let reserving!: () => void;
  const waiting = new Promise<void>((resolve) => {
    reserving = resolve;
  });
  const { bff, modelInputs } = setup({
    ledger: {
      markDispatched: (attempt) => ledger.markDispatched(attempt),
      read: (subject, day) => ledger.read(subject, day),
      async consume(attempt) {
        reserving();
        await gate;
        return ledger.consume(attempt);
      },
      refund: (attempt) => ledger.refund(attempt),
    },
  });
  const jobId = crypto.randomUUID();
  const pending = bff.start(analysisRequest({ jobId }));
  await waiting;
  await bff.cancel(analysisRequest({ jobId }));
  expect((await pending).status).toBe(408);
  release();
  await expect
    .poll(
      async () =>
        (await (await bff.allowance(analysisRequest())).json()).allowance.used,
    )
    .toBe(0);
  expect(modelInputs).toEqual([]);
});
