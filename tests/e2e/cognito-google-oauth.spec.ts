import { expect, test } from "@playwright/test";

import { CognitoCandidateIdentityProvider } from "@/features/candidate/cognito-candidate-identity-provider";
import {
  codeChallenge,
  createOAuthTransaction,
  openOAuthTransaction,
  sealOAuthTransaction,
} from "@/features/candidate/oauth-transaction";

test("the authorization request offers Google only with state, nonce, and PKCE", () => {
  const provider = new CognitoCandidateIdentityProvider({
    issuer:
      "https://cognito-idp.ap-northeast-2.amazonaws.com/ap-northeast-2_example",
    domain: "https://joblens-example.auth.ap-northeast-2.amazoncognito.com",
    clientId: "client-id",
    clientSecret: "server-only-secret",
    redirectUri: "https://www.hyunbeom.site/auth/callback",
  });

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
