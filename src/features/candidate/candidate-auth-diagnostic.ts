import { CognitoOAuthError } from "./cognito-candidate-identity-provider";

export function candidateAuthFailureDiagnostic(
  error: unknown,
): Record<string, unknown> {
  if (error instanceof CognitoOAuthError) return error.toJSON();
  if (error instanceof Error) {
    const code = "code" in error ? safeErrorCode(error.code) : undefined;
    const awsAction = safeAwsAction(error.message);
    return {
      name: error.name,
      ...(code === undefined ? {} : { code }),
      ...(awsAction === undefined ? {} : { awsAction }),
    };
  }
  return { name: "UnknownError" };
}

function safeErrorCode(value: unknown): string | undefined {
  return typeof value === "string" &&
    /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(value)
    ? value
    : undefined;
}

function safeAwsAction(message: string): string | undefined {
  return message.match(
    /\bperform(?: action)?:?\s+([a-z0-9-]+:[a-z][a-z0-9]*)\b/i,
  )?.[1];
}
