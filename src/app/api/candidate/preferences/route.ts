import { getCandidateAuthRuntime } from "@/features/candidate/candidate-auth-runtime";

export async function POST(request: Request) {
  const runtime = await getCandidateAuthRuntime();
  return runtime === null
    ? Response.json({ error: "authentication_unavailable" }, { status: 503 })
    : runtime.handlers.savePreferences(request);
}
