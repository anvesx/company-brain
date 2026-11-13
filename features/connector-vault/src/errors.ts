/** Messages here never carry token, key or ciphertext bytes, so logs and traces stay clean. */
export type VaultCode = "BAD_KEY" | "UNSEALABLE" | "NOT_FOUND" | "COUNT_MISMATCH" | "BAD_ID" | "UNSAFE_ROLE" | "KEY_EXHAUSTED";

export class VaultError extends Error {
  constructor(
    readonly code: VaultCode,
    message: string,
  ) {
    super(message);
    this.name = "VaultError";
  }
}

/** The provider refused the refresh token (revoked, expired, wrong client). Only this forces re-consent. */
export class AuthError extends Error {
  override name = "AuthError";
}

/** Network failure, 5xx or 429: the credential may be fine, so ask again later. */
export class TransientError extends Error {
  override name = "TransientError";
}
