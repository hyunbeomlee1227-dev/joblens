import { sessionCookie } from "@/features/candidate/candidate-bff";
import { getCandidateAuthRuntime } from "@/features/candidate/candidate-auth-runtime";
import { openOAuthTransaction } from "@/features/candidate/oauth-transaction";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const runtime = await getCandidateAuthRuntime();
  if (runtime === null) return authFailure("unavailable");
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const sealed = readCookie(request, "joblens_oauth");
  if (code === null || state === null || sealed === null) {
    return authFailure("invalid_callback");
  }
  const transaction = openOAuthTransaction(sealed, runtime.oauthTransactionKey);
  if (transaction === null || transaction.state !== state) {
    return authFailure("invalid_state");
  }

  try {
    const tokens = await runtime.identityProvider.exchangeCode({
      code,
      codeVerifier: transaction.codeVerifier,
      nonce: transaction.nonce,
    });
    const session = await runtime.manager.start({
      ...tokens,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    return new Response(null, {
      status: 303,
      headers: [
        ["location", new URL("/", runtime.appOrigin).toString()],
        ["cache-control", "no-store"],
        ["set-cookie", sessionCookie(session.sessionId)],
        [
          "set-cookie",
          "joblens_oauth=; Path=/auth/callback; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
        ],
      ],
    });
  } catch {
    return authFailure("exchange_failed");
  }
}

function readCookie(request: Request, name: string): string | null {
  for (const cookie of request.headers.get("cookie")?.split(";") ?? []) {
    const [candidateName, ...value] = cookie.trim().split("=");
    if (candidateName === name) return value.join("=");
  }
  return null;
}

function authFailure(reason: string): Response {
  return Response.json({ error: reason }, { status: 400 });
}
