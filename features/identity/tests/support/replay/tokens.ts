import { createHash, randomBytes } from "node:crypto";
import { exportJWK, generateKeyPair, SignJWT } from "jose";

/** The person signed in at the replay provider. Tests change it between flows. */
export type ReplayUser = { sub: string; email: string; email_verified: boolean; name: string };
export type Pair = { access: string; refresh: string };
type Code = { user: ReplayUser; redirect: string; challenge: string | null; nonce: string | null };

const mint = (prefix: string): string => `${prefix}_${randomBytes(18).toString("base64url")}`;
const s256 = (verifier: string): string => createHash("sha256").update(verifier).digest("base64url");

/** Every code and token the replay provider has handed out, each bound to the user it was issued for. */
export class Grants {
  private readonly codes = new Map<string, Code>();
  private readonly access = new Map<string, ReplayUser>();
  private readonly refresh = new Map<string, ReplayUser>();

  issueCode(code: Code): string {
    const value = mint("code");
    this.codes.set(value, code);
    return value;
  }

  /** A code works once, only with the redirect it was issued for, and only with the matching PKCE verifier. */
  redeem(value: string, redirect: string, verifier: string | null): Code | null {
    const code = this.codes.get(value);
    this.codes.delete(value);
    if (!code || code.redirect !== redirect) return null;
    if (code.challenge !== null && (verifier === null || s256(verifier) !== code.challenge)) return null;
    return code;
  }

  /** Mints a fresh access and refresh token pair for one user. */
  grant(user: ReplayUser): Pair {
    const pair = { access: mint("at"), refresh: mint("rt") };
    this.access.set(pair.access, user);
    this.refresh.set(pair.refresh, user);
    return pair;
  }

  /** Refresh tokens rotate: the old one dies on use, so a second refresh of the same row fails with invalid_grant. */
  rotate(refresh: string): Pair | null {
    const user = this.refresh.get(refresh);
    if (!user) return null;
    this.refresh.delete(refresh);
    return this.grant(user);
  }

  userFor(access: string): ReplayUser | null {
    return this.access.get(access) ?? null;
  }
}

/** An RS256 key for OpenID id tokens, published at /jwks, as Google publishes its certs. */
export async function signer(issuer: string, audience: string) {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "replay-1", alg: "RS256", use: "sig" };
  const idToken = (user: ReplayUser, nonce: string | null, now: number): Promise<string> =>
    new SignJWT({ email: user.email, email_verified: user.email_verified, name: user.name, ...(nonce ? { nonce } : {}) })
      .setProtectedHeader({ alg: "RS256", kid: "replay-1" })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject(user.sub)
      .setIssuedAt(Math.floor(now / 1000))
      .setExpirationTime(Math.floor(now / 1000) + 3600)
      .sign(privateKey);
  return { jwks: { keys: [jwk] }, idToken };
}
