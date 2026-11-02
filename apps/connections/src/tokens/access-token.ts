/** The bearer token inside a stored credential: oauth is JSON `{accessToken}`, everything else is the raw token. */
export const accessTokenOf = (kind: string, secret: string): string | undefined => {
  if (kind !== "oauth") return secret;
  try {
    const t = (JSON.parse(secret) as { accessToken?: unknown }).accessToken;
    return typeof t === "string" && t !== "" ? t : undefined;
  } catch {
    return undefined;
  }
};
