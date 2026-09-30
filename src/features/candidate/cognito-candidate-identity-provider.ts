import {
  CognitoIdentityProviderClient,
  DeleteUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { createRemoteJWKSet, jwtVerify } from "jose";

import type { CandidateIdentityProvider } from "./candidate-session";

export type CognitoConfiguration = {
  issuer: string;
  domain: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export class CognitoCandidateIdentityProvider implements CandidateIdentityProvider {
  readonly #jwks;

  constructor(
    private readonly configuration: CognitoConfiguration,
    private readonly cognito = new CognitoIdentityProviderClient({}),
    private readonly request: typeof fetch = fetch,
  ) {
    this.#jwks = createRemoteJWKSet(
      new URL(`${configuration.issuer}/.well-known/jwks.json`),
    );
  }

  authorizeUrl(input: {
    state: string;
    nonce: string;
    codeChallenge: string;
  }): string {
    const url = new URL("/oauth2/authorize", this.configuration.domain);
    url.search = new URLSearchParams({
      client_id: this.configuration.clientId,
      response_type: "code",
      scope: "openid",
      redirect_uri: this.configuration.redirectUri,
      identity_provider: "Google",
      state: input.state,
      nonce: input.nonce,
      code_challenge: input.codeChallenge,
      code_challenge_method: "S256",
    }).toString();
    return url.toString();
  }

  async exchangeCode(input: {
    code: string;
    codeVerifier: string;
    nonce: string;
  }): Promise<{
    cognitoSubject: string;
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: Date;
  }> {
    const response = await this.oauthRequest(
      "/oauth2/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        client_id: this.configuration.clientId,
        code: input.code,
        redirect_uri: this.configuration.redirectUri,
        code_verifier: input.codeVerifier,
      }),
    );
    if (!response.ok) throw new Error("Cognito code exchange failed");
    const tokens = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      id_token?: string;
      expires_in?: number;
    };
    if (
      tokens.access_token === undefined ||
      tokens.refresh_token === undefined ||
      tokens.id_token === undefined ||
      tokens.expires_in === undefined
    ) {
      throw new Error("Cognito returned an incomplete token response");
    }

    const [access, identity] = await Promise.all([
      jwtVerify(tokens.access_token, this.#jwks, {
        issuer: this.configuration.issuer,
      }),
      jwtVerify(tokens.id_token, this.#jwks, {
        issuer: this.configuration.issuer,
        audience: this.configuration.clientId,
      }),
    ]);
    if (
      access.payload.token_use !== "access" ||
      access.payload.client_id !== this.configuration.clientId ||
      identity.payload.token_use !== "id" ||
      identity.payload.nonce !== input.nonce ||
      access.payload.sub === undefined
    ) {
      throw new Error("Cognito token claims are invalid");
    }

    return {
      cognitoSubject: access.payload.sub,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    };
  }

  async revokeSession(refreshToken: string): Promise<void> {
    const response = await this.oauthRequest(
      "/oauth2/revoke",
      new URLSearchParams({
        token: refreshToken,
        client_id: this.configuration.clientId,
      }),
    );
    if (!response.ok) throw new Error("Cognito session revocation failed");
  }

  async refreshSession(refreshToken: string): Promise<{
    accessToken: string;
    accessTokenExpiresAt: Date;
  }> {
    const response = await this.oauthRequest(
      "/oauth2/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        client_id: this.configuration.clientId,
        refresh_token: refreshToken,
      }),
    );
    if (!response.ok) throw new Error("Cognito token refresh failed");
    const tokens = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (tokens.access_token === undefined || tokens.expires_in === undefined) {
      throw new Error("Cognito returned an incomplete refresh response");
    }
    const access = await jwtVerify(tokens.access_token, this.#jwks, {
      issuer: this.configuration.issuer,
    });
    if (
      access.payload.token_use !== "access" ||
      access.payload.client_id !== this.configuration.clientId
    ) {
      throw new Error("Cognito refreshed token claims are invalid");
    }
    return {
      accessToken: tokens.access_token,
      accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    };
  }

  async deleteCandidate(accessToken: string): Promise<void> {
    await this.cognito.send(
      new DeleteUserCommand({ AccessToken: accessToken }),
    );
  }

  private oauthRequest(path: string, body: URLSearchParams): Promise<Response> {
    return this.request(new URL(path, this.configuration.domain), {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(
          `${this.configuration.clientId}:${this.configuration.clientSecret}`,
        ).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    });
  }
}
