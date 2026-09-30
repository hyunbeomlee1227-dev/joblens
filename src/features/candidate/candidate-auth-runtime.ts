import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

import { createCandidateBffHandlers } from "./candidate-bff";
import { createCandidateSessionManager } from "./candidate-session";
import {
  CognitoCandidateIdentityProvider,
  type CognitoConfiguration,
} from "./cognito-candidate-identity-provider";
import { DynamoDbCandidateSessionStore } from "./dynamodb-candidate-session-store";

type CandidateAuthRuntime = {
  appOrigin: string;
  oauthTransactionKey: string;
  identityProvider: CognitoCandidateIdentityProvider;
  manager: ReturnType<typeof createCandidateSessionManager>;
  handlers: ReturnType<typeof createCandidateBffHandlers>;
};

const awsRegion = process.env.AWS_REGION ?? "ap-northeast-2";

let runtimePromise: Promise<CandidateAuthRuntime | null> | undefined;

export async function getCandidateAuthRuntime(): Promise<CandidateAuthRuntime | null> {
  runtimePromise ??= buildRuntime();
  const runtime = await runtimePromise;
  if (runtime === null) runtimePromise = undefined;
  if (runtime !== null) {
    await runtime.manager.resumePendingDeletions().catch(() => undefined);
  }
  return runtime;
}

async function buildRuntime(): Promise<CandidateAuthRuntime | null> {
  const configuration = await readConfiguration();
  if (configuration === null) {
    return null;
  }

  const documentClient = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: awsRegion }),
    { marshallOptions: { removeUndefinedValues: true } },
  );
  const store = new DynamoDbCandidateSessionStore(
    documentClient,
    configuration.tableName,
  );
  const identityProvider = new CognitoCandidateIdentityProvider(
    configuration.cognito,
    new CognitoIdentityProviderClient({ region: awsRegion }),
  );
  const manager = createCandidateSessionManager({ store, identityProvider });
  return {
    appOrigin: configuration.appOrigin,
    oauthTransactionKey: configuration.oauthTransactionKey,
    identityProvider,
    manager,
    handlers: createCandidateBffHandlers({
      manager,
      allowedOrigin: configuration.appOrigin,
    }),
  };
}

async function readConfiguration(): Promise<{
  appOrigin: string;
  oauthTransactionKey: string;
  tableName: string;
  cognito: CognitoConfiguration;
} | null> {
  const required = {
    appOrigin: process.env.APP_ORIGIN,
    oauthTransactionKey: process.env.OAUTH_TRANSACTION_KEY,
    tableName: process.env.CANDIDATE_TABLE_NAME,
    issuer: process.env.COGNITO_ISSUER,
    domain: process.env.COGNITO_DOMAIN,
    clientId: process.env.COGNITO_CLIENT_ID,
    clientSecret: process.env.COGNITO_CLIENT_SECRET,
    redirectUri: process.env.COGNITO_REDIRECT_URI,
  };
  if (Object.values(required).every((value) => value !== undefined)) {
    return toRuntimeConfiguration(
      required as Record<keyof typeof required, string>,
    );
  }

  if (
    process.env.CANDIDATE_AUTH_SECRET_ID === undefined &&
    (process.env.DEPLOYMENT_VERSION === undefined ||
      process.env.DEPLOYMENT_VERSION === "local")
  ) {
    return null;
  }

  try {
    const response = await new SecretsManagerClient({ region: awsRegion }).send(
      new GetSecretValueCommand({
        SecretId: process.env.CANDIDATE_AUTH_SECRET_ID ?? "joblens/test/auth",
      }),
    );
    if (response.SecretString === undefined) return null;
    return toRuntimeConfiguration(
      JSON.parse(response.SecretString) as Record<
        keyof typeof required,
        string
      >,
    );
  } catch {
    return null;
  }
}

function toRuntimeConfiguration(
  values: Record<
    | "appOrigin"
    | "oauthTransactionKey"
    | "tableName"
    | "issuer"
    | "domain"
    | "clientId"
    | "clientSecret"
    | "redirectUri",
    string
  >,
) {
  return {
    appOrigin: values.appOrigin,
    oauthTransactionKey: values.oauthTransactionKey,
    tableName: values.tableName,
    cognito: {
      issuer: values.issuer,
      domain: values.domain,
      clientId: values.clientId,
      clientSecret: values.clientSecret,
      redirectUri: values.redirectUri,
    },
  };
}
