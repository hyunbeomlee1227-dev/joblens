import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import type { JobPreferences } from "@/features/discovery/discover-job-listings";

export type CandidateSessionRecord = {
  idHash: string;
  candidateSubject: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  csrfToken: string;
  expiresAt: string;
};

export type CandidateSessionStore = {
  readSession(idHash: string): Promise<CandidateSessionRecord | null>;
  replaceSession(
    previousIdHash: string | null,
    session: CandidateSessionRecord,
  ): Promise<void>;
  deleteSession(idHash: string): Promise<void>;
  readPreferences(candidateSubject: string): Promise<JobPreferences | null>;
  savePreferences(
    candidateSubject: string,
    preferences: JobPreferences,
  ): Promise<void>;
  deleteCandidate(candidateSubject: string): Promise<void>;
};

type CandidateSessionManagerOptions = {
  store: CandidateSessionStore;
  identityProvider: CandidateIdentityProvider;
  now?: () => Date;
  generateSecret?: () => string;
};

export type CandidateIdentityProvider = {
  revokeSession(refreshToken: string): Promise<void>;
  deleteCandidate(accessToken: string): Promise<void>;
  refreshSession(refreshToken: string): Promise<{
    accessToken: string;
    accessTokenExpiresAt: Date;
  }>;
};

type StartSessionInput = {
  cognitoSubject: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt?: Date;
  expiresAt: Date;
};

type SessionBrowserState = {
  sessionId: string;
  csrfToken: string;
};

type CandidateSessionView = {
  candidateSubject: string;
  preferences: JobPreferences | null;
  csrfToken: string;
};

export function createCandidateSessionManager({
  store,
  identityProvider,
  now = () => new Date(),
  generateSecret = () => randomBytes(32).toString("base64url"),
}: CandidateSessionManagerOptions) {
  async function start(input: StartSessionInput): Promise<SessionBrowserState> {
    const browserState = createBrowserState(generateSecret);
    await store.replaceSession(null, {
      idHash: hash(browserState.sessionId),
      candidateSubject: input.cognitoSubject,
      accessToken: input.accessToken,
      accessTokenExpiresAt: (
        input.accessTokenExpiresAt ?? input.expiresAt
      ).toISOString(),
      refreshToken: input.refreshToken,
      csrfToken: browserState.csrfToken,
      expiresAt: input.expiresAt.toISOString(),
    });
    return browserState;
  }

  async function read(sessionId: string): Promise<CandidateSessionView | null> {
    const record = await readActiveRecord(sessionId);
    if (record === null) return null;

    return {
      candidateSubject: record.candidateSubject,
      preferences: await store.readPreferences(record.candidateSubject),
      csrfToken: record.csrfToken,
    };
  }

  async function savePreferences(input: {
    sessionId: string;
    csrfToken: string;
    preferences: JobPreferences;
  }): Promise<SessionBrowserState> {
    const record = await requireActiveRecord(input.sessionId);
    requireCsrf(record, input.csrfToken);
    await store.savePreferences(record.candidateSubject, input.preferences);

    const browserState = createBrowserState(generateSecret);
    await store.replaceSession(hash(input.sessionId), {
      ...record,
      idHash: hash(browserState.sessionId),
      csrfToken: browserState.csrfToken,
    });
    return browserState;
  }

  async function logout(input: {
    sessionId: string;
    csrfToken: string;
  }): Promise<void> {
    const record = await requireActiveRecord(input.sessionId);
    requireCsrf(record, input.csrfToken);
    await store.deleteSession(hash(input.sessionId));
    try {
      await identityProvider.revokeSession(record.refreshToken);
    } catch {
      // Local invalidation is the security boundary. Cognito revocation is
      // best-effort so an upstream outage cannot keep a browser signed in.
    }
  }

  async function deleteAccount(input: {
    sessionId: string;
    csrfToken: string;
  }): Promise<void> {
    const record = await requireActiveRecord(input.sessionId);
    requireCsrf(record, input.csrfToken);
    const accessToken =
      Date.parse(record.accessTokenExpiresAt) > now().getTime()
        ? record.accessToken
        : (await identityProvider.refreshSession(record.refreshToken))
            .accessToken;
    await identityProvider.deleteCandidate(accessToken);
    await store.deleteCandidate(record.candidateSubject);
  }

  async function readActiveRecord(
    sessionId: string,
  ): Promise<CandidateSessionRecord | null> {
    if (sessionId === "") return null;
    const idHash = hash(sessionId);
    const record = await store.readSession(idHash);
    if (record === null) return null;
    if (Date.parse(record.expiresAt) <= now().getTime()) {
      await store.deleteSession(idHash);
      return null;
    }
    return record;
  }

  async function requireActiveRecord(
    sessionId: string,
  ): Promise<CandidateSessionRecord> {
    const record = await readActiveRecord(sessionId);
    if (record === null) throw new Error("Session is not active");
    return record;
  }

  return { start, read, savePreferences, logout, deleteAccount };
}

export type CandidateSessionManager = ReturnType<
  typeof createCandidateSessionManager
>;

function createBrowserState(generateSecret: () => string): SessionBrowserState {
  return {
    sessionId: generateSecret(),
    csrfToken: generateSecret(),
  };
}

function requireCsrf(
  record: CandidateSessionRecord,
  candidateToken: string,
): void {
  const expected = Buffer.from(hash(record.csrfToken), "hex");
  const actual = Buffer.from(hash(candidateToken), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error("Invalid CSRF token");
  }
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export class InMemoryCandidateSessionStore implements CandidateSessionStore {
  readonly #sessions = new Map<string, CandidateSessionRecord>();
  readonly #preferences = new Map<string, JobPreferences>();

  async readSession(idHash: string): Promise<CandidateSessionRecord | null> {
    return this.#sessions.get(idHash) ?? null;
  }

  async replaceSession(
    previousIdHash: string | null,
    session: CandidateSessionRecord,
  ): Promise<void> {
    if (previousIdHash !== null) this.#sessions.delete(previousIdHash);
    this.#sessions.set(session.idHash, session);
  }

  async deleteSession(idHash: string): Promise<void> {
    this.#sessions.delete(idHash);
  }

  async readPreferences(
    candidateSubject: string,
  ): Promise<JobPreferences | null> {
    return this.#preferences.get(candidateSubject) ?? null;
  }

  async savePreferences(
    candidateSubject: string,
    preferences: JobPreferences,
  ): Promise<void> {
    this.#preferences.set(candidateSubject, preferences);
  }

  async deleteCandidate(candidateSubject: string): Promise<void> {
    this.#preferences.delete(candidateSubject);
    for (const [idHash, session] of this.#sessions) {
      if (session.candidateSubject === candidateSubject) {
        this.#sessions.delete(idHash);
      }
    }
  }
}
