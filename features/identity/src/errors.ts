/** The five failure codes the identity port, the config check and the install renderer raise. */
export const IDENTITY_ERROR_CODES = ["UNAUTHENTICATED", "NO_ORGANIZATION", "WRONG_AUDIENCE", "EXPIRED", "BAD_INPUT"] as const;

export type IdentityErrorCode = (typeof IDENTITY_ERROR_CODES)[number];

/** Every failure the package raises. For BAD_INPUT, `field` names the bad input (spec rule 13). */
export class IdentityError extends Error {
  override readonly name = "IdentityError";
  readonly code: IdentityErrorCode;
  readonly field: string | undefined;

  constructor(code: IdentityErrorCode, message: string, field?: string) {
    super(field === undefined ? message : `${field}: ${message}`);
    this.code = code;
    this.field = field;
  }
}

/** A rendered install file did not parse back. It names the client, so the page can say which snippet is broken. */
export class InstallRenderError extends Error {
  override readonly name = "InstallRenderError";
  readonly client: string;

  constructor(client: string, detail: string) {
    super(`the ${client} install file is not valid: ${detail}`);
    this.client = client;
  }
}

/** Why a token could not be refreshed: the person must sign in again, another process holds it, the provider is down, or our own database failed (the provider may already have answered). */
export class RefreshError extends Error {
  override readonly name = "RefreshError";
  readonly code: "NEEDS_AUTH" | "LEASED" | "PROVIDER_DOWN" | "STORE_FAILED";

  constructor(code: RefreshError["code"], message: string) {
    super(message);
    this.code = code;
  }
}
