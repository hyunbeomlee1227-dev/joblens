import {
  InactiveCandidateSessionError,
  InvalidCandidateCsrfError,
  type CandidateSessionManager,
} from "./candidate-session";
import type { JobPreferences } from "@/features/discovery/discover-job-listings";
import { fixturePreferenceOptions } from "@/features/discovery/fixture-job-listings";
import { analysisJobs } from "@/features/analysis/analysis-job";

export const sessionCookieName = "joblens_session";

type CandidateBffOptions = {
  manager: CandidateSessionManager;
  allowedOrigin: string;
};

export function createCandidateBffHandlers({
  manager,
  allowedOrigin,
}: CandidateBffOptions) {
  async function savePreferences(request: Request): Promise<Response> {
    if (!isAllowedMutation(request, allowedOrigin)) return forbidden();
    const sessionId = readRequestCookie(request, sessionCookieName);
    if (sessionId === null) return unauthorized();

    try {
      const body = await readPreferenceMutation(request);
      if (
        typeof body.csrfToken !== "string" ||
        !isJobPreferences(body.preferences)
      ) {
        return Response.json({ error: "invalid_request" }, { status: 400 });
      }
      const rotated = await manager.savePreferences({
        sessionId,
        csrfToken: body.csrfToken,
        preferences: body.preferences,
      });
      const location = new URL("/", allowedOrigin);
      location.search = new URLSearchParams({
        role: body.preferences.roles[0],
        region: body.preferences.regions[0],
        workArrangement: body.preferences.workArrangements[0],
      }).toString();
      return redirectWithSession(location, rotated.sessionId);
    } catch (error) {
      return candidateError(error);
    }
  }

  async function logout(request: Request): Promise<Response> {
    return terminate(request, "logout");
  }

  async function deleteAccount(request: Request): Promise<Response> {
    return terminate(request, "delete");
  }

  async function terminate(
    request: Request,
    operation: "logout" | "delete",
  ): Promise<Response> {
    if (!isAllowedMutation(request, allowedOrigin)) return forbidden();
    const sessionId = readRequestCookie(request, sessionCookieName);
    if (sessionId === null) return unauthorized();
    try {
      const body = await readCsrfMutation(request);
      if (typeof body.csrfToken !== "string") {
        return Response.json({ error: "invalid_request" }, { status: 400 });
      }
      const candidate = await manager.read(sessionId);
      await manager[operation === "logout" ? "logout" : "deleteAccount"]({
        sessionId,
        csrfToken: body.csrfToken,
      });
      if (candidate !== null)
        analysisJobs.cancelCandidate(candidate.candidateSubject);
      return new Response(null, {
        status: 303,
        headers: {
          location: new URL("/", allowedOrigin).toString(),
          "set-cookie": clearSessionCookie(),
          "cache-control": "no-store",
        },
      });
    } catch (error) {
      return candidateError(error);
    }
  }

  return { savePreferences, logout, deleteAccount };
}

async function readPreferenceMutation(request: Request): Promise<{
  csrfToken?: unknown;
  preferences?: unknown;
}> {
  if (request.headers.get("content-type")?.includes("application/json")) {
    return (await request.json()) as {
      csrfToken?: unknown;
      preferences?: unknown;
    };
  }
  const form = await request.formData();
  return {
    csrfToken: form.get("csrfToken"),
    preferences: {
      roles: [form.get("role")],
      regions: [form.get("region")],
      workArrangements: [form.get("workArrangement")],
    },
  };
}

async function readCsrfMutation(
  request: Request,
): Promise<{ csrfToken?: unknown }> {
  if (request.headers.get("content-type")?.includes("application/json")) {
    return (await request.json()) as { csrfToken?: unknown };
  }
  const form = await request.formData();
  return { csrfToken: form.get("csrfToken") };
}

export function sessionCookie(sessionId: string): string {
  return `${sessionCookieName}=${sessionId}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie(): string {
  return `${sessionCookieName}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

function redirectWithSession(location: URL, sessionId: string): Response {
  return new Response(null, {
    status: 303,
    headers: {
      location: location.toString(),
      "set-cookie": sessionCookie(sessionId),
      "cache-control": "no-store",
    },
  });
}

export function readRequestCookie(
  request: Request,
  name: string,
): string | null {
  const cookies = request.headers.get("cookie")?.split(";") ?? [];
  for (const cookie of cookies) {
    const [candidateName, ...value] = cookie.trim().split("=");
    if (candidateName === name) return value.join("=");
  }
  return null;
}

function isAllowedMutation(request: Request, allowedOrigin: string): boolean {
  return (
    request.headers.get("origin") === allowedOrigin &&
    new URL(request.url).origin === allowedOrigin
  );
}

function isJobPreferences(value: unknown): value is JobPreferences {
  if (typeof value !== "object" || value === null) return false;
  const preferences = value as Record<string, unknown>;
  return (
    hasOneAllowed(preferences.roles, fixturePreferenceOptions.roles) &&
    hasOneAllowed(preferences.regions, fixturePreferenceOptions.regions) &&
    hasOneAllowed(
      preferences.workArrangements,
      fixturePreferenceOptions.workArrangements,
    )
  );
}

function hasOneAllowed(
  value: unknown,
  allowed: readonly string[],
): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.length === 1 &&
    typeof value[0] === "string" &&
    allowed.includes(value[0])
  );
}

function candidateError(error: unknown): Response {
  if (error instanceof InvalidCandidateCsrfError) {
    return forbidden();
  }
  if (error instanceof InactiveCandidateSessionError) {
    return unauthorized();
  }
  return Response.json(
    { error: "candidate_operation_failed" },
    { status: 502 },
  );
}

function forbidden(): Response {
  return Response.json({ error: "forbidden" }, { status: 403 });
}

function unauthorized(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
