import {
  codeChallenge,
  createOAuthTransaction,
  sealOAuthTransaction,
} from "@/features/candidate/oauth-transaction";
import { getCandidateAuthRuntime } from "@/features/candidate/candidate-auth-runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const runtime = await getCandidateAuthRuntime();
  if (runtime === null) {
    return Response.json(
      { error: "google_login_unavailable" },
      { status: 503 },
    );
  }
  const transaction = createOAuthTransaction();
  const response = new Response(null, {
    status: 303,
    headers: {
      location: runtime.identityProvider.authorizeUrl({
        state: transaction.state,
        nonce: transaction.nonce,
        codeChallenge: codeChallenge(transaction.codeVerifier),
      }),
      "set-cookie": `joblens_oauth=${sealOAuthTransaction(
        transaction,
        runtime.oauthTransactionKey,
      )}; Path=/auth/callback; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
      "cache-control": "no-store",
    },
  });
  return response;
}
