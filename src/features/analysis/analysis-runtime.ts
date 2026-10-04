import "server-only";

import { getCandidateAuthRuntime } from "@/features/candidate/candidate-auth-runtime";
import { createAnalysisBff } from "./analysis-bff";
import {
  InMemoryAnalysisAllowance,
  type AnalysisAllowanceLedger,
} from "./analysis-allowance";
import { analysisJobs, withAnalysisSignal } from "./analysis-job";

const fixtureLedger = new InMemoryAnalysisAllowance();
let fixtureBff: ReturnType<typeof createAnalysisBff> | undefined;

export async function getAnalysisBff() {
  if (process.env.E2E_CANDIDATE_FIXTURE === "enabled") {
    fixtureBff ??= createAnalysisBff({
      allowedOrigin: "http://127.0.0.1:3000",
      async readSession(id) {
        return /^e2e-[a-f0-9-]{36}$/.test(id)
          ? { candidateSubject: id, csrfToken: "e2e-csrf" }
          : null;
      },
      ledger: fixtureLedger,
      dailyLimit: 2,
      enabled: () => process.env.E2E_ANALYSIS_DISABLED !== "true",
      async resolvePosting(id) {
        return id === "analysis-fixture"
          ? {
              text: "Build Spring services.",
              eligible: true,
              analysisPermitted: true,
            }
          : null;
      },
      model: {
        async invoke(_input, signal) {
          signal.throwIfAborted();
          await withAnalysisSignal(
            new Promise<void>((resolve) => setTimeout(resolve, 1500)),
            signal,
          );
        },
      },
      jobs: analysisJobs,
    });
    return fixtureBff;
  }

  const auth = await getCandidateAuthRuntime();
  const disabledLedger: AnalysisAllowanceLedger = {
    async read() {
      return 0;
    },
    async consume() {
      throw new Error("analysis_disabled");
    },
    async refund() {},
    async markDispatched() {
      throw new Error("analysis_disabled");
    },
  };
  return createAnalysisBff({
    allowedOrigin: auth?.appOrigin ?? "https://www.hyunbeom.site",
    readSession: (id) =>
      auth === null ? Promise.resolve(null) : auth.manager.read(id),
    ledger: disabledLedger,
    dailyLimit: 0,
    enabled: () => false,
    async resolvePosting() {
      return null;
    },
    model: {
      async invoke() {
        throw new Error("analysis_disabled");
      },
    },
    jobs: analysisJobs,
  });
}
