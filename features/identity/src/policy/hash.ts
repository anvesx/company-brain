import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Password hashing with scrypt (a slow, memory-hungry hash, so guessing is expensive).
 * N=16384, r=8, p=1 is the scrypt authors' interactive-login setting: about 16 MiB and tens of milliseconds a hash.
 * The parameters are stored in each hash, so they can be raised later and old hashes still verify.
 */
const N = 16384;
const R = 8;
const P = 1;
const KEY_BYTES = 64;

const derive = (password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> =>
  new Promise((resolve, reject) =>
    // maxmem must exceed 128 * N * r bytes or node refuses to run.
    scrypt(password.normalize("NFKC"), salt, KEY_BYTES, { N: n, r, p, maxmem: 256 * n * r }, (error, key) => (error ? reject(error) : resolve(key))),
  );

/** Hash a password into `scrypt$N$r$p$salt$key` (salt and key in base64url). */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P);
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
};

/** True when the password matches the stored hash. A malformed stored value is simply a mismatch. */
export const verifyPassword = async (stored: string, password: string): Promise<boolean> => {
  const [tag, n, r, p, salt, key] = stored.split("$");
  if (tag !== "scrypt" || !salt || !key) return false;
  const want = Buffer.from(key, "base64url");
  const got = await derive(password, Buffer.from(salt, "base64url"), Number(n), Number(r), Number(p));
  return got.length === want.length && timingSafeEqual(got, want);
};
