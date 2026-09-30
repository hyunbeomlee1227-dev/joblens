import { getCandidateAuthRuntime } from "@/features/candidate/candidate-auth-runtime";

export async function DELETE(request: Request) {
  const runtime = await getCandidateAuthRuntime();
  return runtime === null
    ? Response.json({ error: "authentication_unavailable" }, { status: 503 })
    : runtime.handlers.deleteAccount(request);
}

export const POST = DELETE;
