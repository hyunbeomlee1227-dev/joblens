import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

type OAuthTransaction = {
  state: string;
  nonce: string;
  codeVerifier: string;
  expiresAt: string;
};

export function createOAuthTransaction(now = new Date()): OAuthTransaction {
  return {
    state: randomBytes(32).toString("base64url"),
    nonce: randomBytes(32).toString("base64url"),
    codeVerifier: randomBytes(48).toString("base64url"),
    expiresAt: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
  };
}

export function codeChallenge(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

export function sealOAuthTransaction(
  transaction: OAuthTransaction,
  encryptionKey: string,
): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", decodeKey(encryptionKey), nonce);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(transaction), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString(
    "base64url",
  );
}

export function openOAuthTransaction(
  sealed: string,
  encryptionKey: string,
  now = new Date(),
): OAuthTransaction | null {
  try {
    const payload = Buffer.from(sealed, "base64url");
    const nonce = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const ciphertext = payload.subarray(28);
    const decipher = createDecipheriv(
      "aes-256-gcm",
      decodeKey(encryptionKey),
      nonce,
    );
    decipher.setAuthTag(tag);
    const transaction = JSON.parse(
      Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
        "utf8",
      ),
    ) as OAuthTransaction;
    return Date.parse(transaction.expiresAt) > now.getTime()
      ? transaction
      : null;
  } catch {
    return null;
  }
}

function decodeKey(value: string): Buffer {
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) {
    throw new Error("OAUTH_TRANSACTION_KEY must contain 32 base64 bytes");
  }
  return key;
}
