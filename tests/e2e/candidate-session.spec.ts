import { expect, test } from "@playwright/test";

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

test("an opaque session owns preferences by Cognito subject and rotates on mutation", async () => {
  const secrets = ["session-one", "csrf-one", "session-two", "csrf-two"];
  const manager = createCandidateSessionManager({
    identityProvider,
    store: new InMemoryCandidateSessionStore(),
    now: () => new Date("2026-09-29T00:00:00.000Z"),
    generateSecret: () => secrets.shift()!,
  });
  const started = await manager.start({
    cognitoSubject: "cognito-subject-123",
    accessToken: "cognito-access-token",
    refreshToken: "cognito-refresh-token",
    expiresAt: new Date("2026-09-29T01:00:00.000Z"),
  });

  expect(started.sessionId).toEqual("session-one");
  expect(JSON.stringify(started)).not.toContain("cognito-subject-123");
  expect(JSON.stringify(started)).not.toContain("cognito-access-token");
  expect(JSON.stringify(started)).not.toContain("cognito-refresh-token");

  const saved = await manager.savePreferences({
    sessionId: started.sessionId,
    csrfToken: started.csrfToken,
    preferences: {
      roles: ["백엔드 개발"],
      regions: ["서울"],
      workArrangements: ["주 3일 오피스"],
    },
  });

  expect(saved.sessionId).toEqual("session-two");
  await expect(manager.read(started.sessionId)).resolves.toBeNull();
  await expect(manager.read(saved.sessionId)).resolves.toMatchObject({
    candidateSubject: "cognito-subject-123",
    preferences: {
      roles: ["백엔드 개발"],
      regions: ["서울"],
      workArrangements: ["주 3일 오피스"],
    },
  });
});

test("a preference mutation rejects an invalid CSRF token", async () => {
  const secrets = ["session-one", "csrf-one"];
  const manager = createCandidateSessionManager({
    identityProvider,
    store: new InMemoryCandidateSessionStore(),
    now: () => new Date("2026-09-29T00:00:00.000Z"),
    generateSecret: () => secrets.shift()!,
  });
  const started = await manager.start({
    cognitoSubject: "candidate-a",
    accessToken: "access-a",
    refreshToken: "refresh-a",
    expiresAt: new Date("2026-09-29T01:00:00.000Z"),
  });

  await expect(
    manager.savePreferences({
      sessionId: started.sessionId,
      csrfToken: "attacker-token",
      preferences: {
        roles: ["프론트엔드 개발"],
        regions: ["경기"],
        workArrangements: ["하이브리드"],
      },
    }),
  ).rejects.toThrow("Invalid CSRF token");
});

test("logout invalidates the session and an expired session cannot be read", async () => {
  let currentTime = new Date("2026-09-29T00:00:00.000Z");
  const secrets = [
    "logout-session",
    "logout-csrf",
    "expired-session",
    "expired-csrf",
  ];
  const manager = createCandidateSessionManager({
    identityProvider,
    store: new InMemoryCandidateSessionStore(),
    now: () => currentTime,
    generateSecret: () => secrets.shift()!,
  });
  const logoutSession = await manager.start({
    cognitoSubject: "candidate-logout",
    accessToken: "access-logout",
    refreshToken: "refresh-logout",
    expiresAt: new Date("2026-09-29T01:00:00.000Z"),
  });

  await manager.logout({
    sessionId: logoutSession.sessionId,
    csrfToken: logoutSession.csrfToken,
  });
  await expect(manager.read(logoutSession.sessionId)).resolves.toBeNull();

  const expiring = await manager.start({
    cognitoSubject: "candidate-expired",
    accessToken: "access-expired",
    refreshToken: "refresh-expired",
    expiresAt: new Date("2026-09-29T01:00:00.000Z"),
  });
  currentTime = new Date("2026-09-29T01:00:00.000Z");
  await expect(manager.read(expiring.sessionId)).resolves.toBeNull();
});

test("logout invalidates the local session even when upstream revocation fails", async () => {
  const manager = createCandidateSessionManager({
    identityProvider: {
      ...identityProvider,
      async revokeSession() {
        throw new Error("Cognito unavailable");
      },
    },
    store: new InMemoryCandidateSessionStore(),
    now: () => new Date("2026-09-29T00:00:00.000Z"),
    generateSecret: (() => {
      const secrets = ["failure-session", "failure-csrf"];
      return () => secrets.shift()!;
    })(),
  });
  const session = await manager.start({
    cognitoSubject: "candidate-failure",
    accessToken: "access-failure",
    refreshToken: "refresh-failure",
    expiresAt: new Date("2026-09-30T00:00:00.000Z"),
  });

  await expect(
    manager.logout({
      sessionId: session.sessionId,
      csrfToken: session.csrfToken,
    }),
  ).resolves.toBeUndefined();
  await expect(manager.read(session.sessionId)).resolves.toBeNull();
});

test("account deletion removes every session and preferences owned by the Cognito subject", async () => {
  const secrets = [
    "candidate-a-session-one",
    "candidate-a-csrf-one",
    "candidate-a-session-two",
    "candidate-a-csrf-two",
    "candidate-a-rotated",
    "candidate-a-rotated-csrf",
    "candidate-b-session",
    "candidate-b-csrf",
  ];
  const manager = createCandidateSessionManager({
    identityProvider,
    store: new InMemoryCandidateSessionStore(),
    now: () => new Date("2026-09-29T00:00:00.000Z"),
    generateSecret: () => secrets.shift()!,
  });
  const candidateAFirst = await manager.start({
    cognitoSubject: "candidate-a",
    accessToken: "access-a-one",
    refreshToken: "refresh-a-one",
    expiresAt: new Date("2026-09-30T00:00:00.000Z"),
  });
  const candidateASecond = await manager.start({
    cognitoSubject: "candidate-a",
    accessToken: "access-a-two",
    refreshToken: "refresh-a-two",
    expiresAt: new Date("2026-09-30T00:00:00.000Z"),
  });
  const candidateARotated = await manager.savePreferences({
    sessionId: candidateAFirst.sessionId,
    csrfToken: candidateAFirst.csrfToken,
    preferences: {
      roles: ["백엔드 개발"],
      regions: ["서울"],
      workArrangements: ["주 3일 오피스"],
    },
  });
  const candidateB = await manager.start({
    cognitoSubject: "candidate-b",
    accessToken: "access-b",
    refreshToken: "refresh-b",
    expiresAt: new Date("2026-09-30T00:00:00.000Z"),
  });

  await manager.deleteAccount({
    sessionId: candidateARotated.sessionId,
    csrfToken: candidateARotated.csrfToken,
  });

  await expect(manager.read(candidateARotated.sessionId)).resolves.toBeNull();
  await expect(manager.read(candidateASecond.sessionId)).resolves.toBeNull();
  await expect(manager.read(candidateB.sessionId)).resolves.toMatchObject({
    candidateSubject: "candidate-b",
  });
});

test("a failed identity deletion rolls back the deletion gate so the Candidate can retry", async () => {
  const store = new InMemoryCandidateSessionStore();
  const manager = createCandidateSessionManager({
    identityProvider: {
      ...identityProvider,
      async deleteCandidate() {
        throw new Error("Cognito unavailable");
      },
    },
    store,
    now: () => new Date("2026-09-29T00:00:00.000Z"),
    generateSecret: (() => {
      const secrets = ["retry-session", "retry-csrf"];
      return () => secrets.shift()!;
    })(),
  });
  const session = await manager.start({
    cognitoSubject: "candidate-retry",
    accessToken: "access-retry",
    refreshToken: "refresh-retry",
    expiresAt: new Date("2026-09-30T00:00:00.000Z"),
  });

  await expect(
    manager.deleteAccount({
      sessionId: session.sessionId,
      csrfToken: session.csrfToken,
    }),
  ).rejects.toThrow("Cognito unavailable");
  await expect(manager.read(session.sessionId)).resolves.toMatchObject({
    candidateSubject: "candidate-retry",
  });
});

test("a deletion gate blocks new sessions and existing session reads", async () => {
  const store = new InMemoryCandidateSessionStore();
  const secrets = [
    "existing-session",
    "existing-csrf",
    "new-session",
    "new-csrf",
  ];
  const manager = createCandidateSessionManager({
    identityProvider,
    store,
    now: () => new Date("2026-09-29T00:00:00.000Z"),
    generateSecret: () => secrets.shift()!,
  });
  const existing = await manager.start({
    cognitoSubject: "candidate-deleting",
    accessToken: "access-existing",
    refreshToken: "refresh-existing",
    expiresAt: new Date("2026-09-30T00:00:00.000Z"),
  });
  await store.beginCandidateDeletion("candidate-deleting");

  await expect(manager.read(existing.sessionId)).resolves.toBeNull();
  await expect(
    manager.start({
      cognitoSubject: "candidate-deleting",
      accessToken: "access-new",
      refreshToken: "refresh-new",
      expiresAt: new Date("2026-09-30T00:00:00.000Z"),
    }),
  ).rejects.toThrow("Candidate deletion is pending");
});

test("a durable deletion gate resumes local cleanup after Cognito deletion", async () => {
  const store = new InMemoryCandidateSessionStore();
  const deleteCandidate = store.deleteCandidate.bind(store);
  let cleanupAttempts = 0;
  store.deleteCandidate = async (candidateSubject) => {
    cleanupAttempts += 1;
    if (cleanupAttempts === 1) throw new Error("DynamoDB unavailable");
    await deleteCandidate(candidateSubject);
  };
  const secrets = [
    "cleanup-session",
    "cleanup-csrf",
    "cleanup-rotated-session",
    "cleanup-rotated-csrf",
  ];
  const manager = createCandidateSessionManager({
    identityProvider,
    store,
    now: () => new Date("2026-09-29T00:00:00.000Z"),
    generateSecret: () => secrets.shift()!,
  });
  const started = await manager.start({
    cognitoSubject: "candidate-cleanup",
    accessToken: "access-cleanup",
    refreshToken: "refresh-cleanup",
    expiresAt: new Date("2026-09-30T00:00:00.000Z"),
  });
  const session = await manager.savePreferences({
    sessionId: started.sessionId,
    csrfToken: started.csrfToken,
    preferences: {
      roles: ["백엔드 개발"],
      regions: ["서울"],
      workArrangements: ["주 3일 오피스"],
    },
  });

  await expect(
    manager.deleteAccount({
      sessionId: session.sessionId,
      csrfToken: session.csrfToken,
    }),
  ).rejects.toThrow("DynamoDB unavailable");
  await expect(manager.read(session.sessionId)).resolves.toBeNull();
  await expect(store.readPreferences("candidate-cleanup")).resolves.toBeNull();
  expect(cleanupAttempts).toBe(2);
});
