import { cookies } from "next/headers";

import { sessionCookieName } from "./candidate-bff";
import { getCandidateAuthRuntime } from "./candidate-auth-runtime";
import type { JobPreferences } from "@/features/discovery/discover-job-listings";

export type CandidatePageState = {
  csrfToken: string;
  preferences: JobPreferences | null;
};

export async function getCandidatePageState(): Promise<CandidatePageState | null> {
  const runtime = await getCandidateAuthRuntime();
  if (runtime === null) return null;
  const sessionId = (await cookies()).get(sessionCookieName)?.value;
  if (sessionId === undefined) return null;
  const session = await runtime.manager.read(sessionId);
  return session === null
    ? null
    : { csrfToken: session.csrfToken, preferences: session.preferences };
}
