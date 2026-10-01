import { expect, test } from "@playwright/test";

import { candidateAuthFailureDiagnostic } from "@/features/candidate/candidate-auth-diagnostic";
import {
  CognitoCandidateIdentityProvider,
  CognitoOAuthError,
} from "@/features/candidate/cognito-candidate-identity-provider";
import {
  codeChallenge,
  createOAuthTransaction,
  openOAuthTransaction,
  sealOAuthTransaction,
} from "@/features/candidate/oauth-transaction";

const cognitoConfiguration = {
  issuer:
    "https://cognito-idp.ap-northeast-2.amazonaws.com/ap-northeast-2_example",
  domain: "https://joblens-example.auth.ap-northeast-2.amazoncognito.com",
  clientId: "client-id",
  clientSecret: "server-only-secret",
  redirectUri: "https://www.hyunbeom.site/auth/callback",
};

test("the authorization request offers Google only with state, nonce, and PKCE", () => {
  const provider = new CognitoCandidateIdentityProvider(cognitoConfiguration);

  const url = new URL(
    provider.authorizeUrl({
      state: "opaque-state",
      nonce: "opaque-nonce",
      codeChallenge: codeChallenge("verifier"),
    }),
  );

  expect(url.searchParams.get("identity_provider")).toEqual("Google");
  expect(url.searchParams.get("response_type")).toEqual("code");
  expect(url.searchParams.get("state")).toEqual("opaque-state");
  expect(url.searchParams.get("nonce")).toEqual("opaque-nonce");
  expect(url.searchParams.get("code_challenge_method")).toEqual("S256");
  expect(url.toString()).not.toContain("Amazon");
});

test("an OAuth transaction is opaque, tamper-evident, and expires after ten minutes", () => {
  const key = Buffer.alloc(32, 7).toString("base64");
  const startedAt = new Date("2026-09-29T00:00:00.000Z");
  const transaction = createOAuthTransaction(startedAt);
  const sealed = sealOAuthTransaction(transaction, key);

  expect(sealed).not.toContain(transaction.codeVerifier);
  expect(
    openOAuthTransaction(sealed, key, new Date("2026-09-29T00:09:59.000Z")),
  ).toEqual(transaction);
  expect(
    openOAuthTransaction(
      `${sealed.slice(0, -1)}A`,
      key,
      new Date("2026-09-29T00:09:59.000Z"),
    ),
  ).toBeNull();
  expect(
    openOAuthTransaction(sealed, key, new Date("2026-09-29T00:10:00.000Z")),
  ).toBeNull();
});

test("a failed code exchange exposes only safe OAuth diagnostics", async () => {
  const request: typeof fetch = async () =>
    Response.json(
      {
        error: "invalid_grant",
        error_description: "authorization code and secret-token-value",
      },
      { status: 400 },
    );
  const provider = new CognitoCandidateIdentityProvider(
    cognitoConfiguration,
    undefined,
    request,
  );

  const failure = await provider
    .exchangeCode({
      code: "secret-code",
      codeVerifier: "secret-verifier",
      nonce: "nonce",
    })
    .catch((error: unknown) => error);

  expect(failure).toBeInstanceOf(CognitoOAuthError);
  expect(failure).toMatchObject({
    stage: "code_exchange",
    status: 400,
    oauthError: "invalid_grant",
  });
  expect(JSON.stringify(failure)).not.toContain("secret-token-value");
  expect(JSON.stringify(failure)).not.toContain("secret-code");
  expect(JSON.stringify(failure)).not.toContain("secret-verifier");
});

test("an AWS denial diagnostic keeps the action but drops the message", () => {
  const failure = new Error(
    "User identity is not authorized to perform: dynamodb:ConditionCheckItem on secret-resource",
  );
  failure.name = "AccessDeniedException";

  const diagnostic = candidateAuthFailureDiagnostic(failure);

  expect(diagnostic).toEqual({
    name: "AccessDeniedException",
    awsAction: "dynamodb:ConditionCheckItem",
  });
  expect(JSON.stringify(diagnostic)).not.toContain("identity");
  expect(JSON.stringify(diagnostic)).not.toContain("secret-resource");
});
