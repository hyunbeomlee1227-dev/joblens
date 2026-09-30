import { expect, test } from "@playwright/test";

import { createCandidateBffHandlers } from "@/features/candidate/candidate-bff";
import {
  createCandidateSessionManager,
  InMemoryCandidateSessionStore,
} from "@/features/candidate/candidate-session";

const identityProvider = {
  async revokeSession() {},
  async deleteCandidate() {},
  async refreshSession() {
    return {
      accessToken: "refreshed-access-token",
      accessTokenExpiresAt: new Date("2026-09-30T00:00:00.000Z"),
    };
  },
};

test("the BFF accepts a same-origin CSRF-protected preference mutation and rotates the opaque cookie", async () => {
  const secrets = ["old-session", "old-csrf", "new-session", "new-csrf"];
  const manager = createCandidateSessionManager({
    store: new InMemoryCandidateSessionStore(),
    identityProvider,
    now: () => new Date("2026-09-29T00:00:00.000Z"),
    generateSecret: () => secrets.shift()!,
  });
  const session = await manager.start({
    cognitoSubject: "candidate-from-cognito",
    accessToken: "server-only-access-token",
    refreshToken: "server-only-refresh-token",
    expiresAt: new Date("2026-09-30T00:00:00.000Z"),
  });
  const handlers = createCandidateBffHandlers({
    manager,
    allowedOrigin: "https://www.hyunbeom.site",
  });

  const response = await handlers.savePreferences(
    new Request("https://www.hyunbeom.site/api/candidate/preferences", {
      method: "POST",
      headers: {
        origin: "https://www.hyunbeom.site",
        cookie: `joblens_session=${session.sessionId}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        csrfToken: session.csrfToken,
        candidateSubject: "attacker-controlled-subject",
        preferences: {
          roles: ["프론트엔드 개발"],
          regions: ["경기"],
          workArrangements: ["하이브리드"],
        },
      }),
    }),
  );

  expect(response.status).toEqual(303);
  expect(response.headers.get("set-cookie")).toContain(
    "joblens_session=new-session",
  );
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  expect(response.headers.get("set-cookie")).toContain("Secure");
  expect(response.headers.get("set-cookie")).toContain("SameSite=Lax");
  expect(response.headers.get("set-cookie")).not.toContain("access-token");
  await expect(manager.read("new-session")).resolves.toMatchObject({
    candidateSubject: "candidate-from-cognito",
  });
});

test("the BFF rejects a cross-origin mutation before changing preferences", async () => {
  const secrets = ["active-session", "active-csrf"];
  const manager = createCandidateSessionManager({
    store: new InMemoryCandidateSessionStore(),
    identityProvider,
    now: () => new Date("2026-09-29T00:00:00.000Z"),
    generateSecret: () => secrets.shift()!,
  });
  const session = await manager.start({
    cognitoSubject: "candidate-a",
    accessToken: "access-a",
    refreshToken: "refresh-a",
    expiresAt: new Date("2026-09-30T00:00:00.000Z"),
  });
  const handlers = createCandidateBffHandlers({
    manager,
    allowedOrigin: "https://www.hyunbeom.site",
  });

  const response = await handlers.savePreferences(
    new Request("https://www.hyunbeom.site/api/candidate/preferences", {
      method: "POST",
      headers: {
        origin: "https://attacker.example",
        cookie: `joblens_session=${session.sessionId}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        csrfToken: session.csrfToken,
        preferences: {
          roles: ["프론트엔드 개발"],
          regions: ["경기"],
          workArrangements: ["하이브리드"],
        },
      }),
    }),
  );

  expect(response.status).toEqual(403);
  await expect(manager.read(session.sessionId)).resolves.toMatchObject({
    preferences: null,
  });
});
