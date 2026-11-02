/** A GitHub repository as `owner/name`: two non-empty parts, no spaces, no more slashes. */
export const REPO = /^([^/\s]+)\/([^/\s]+)$/;
export const validRepo = (v: unknown): v is string => typeof v === "string" && v.length <= 200 && REPO.test(v);
