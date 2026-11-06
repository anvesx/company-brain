import { badInput } from "./validate.js";

/** better-auth codes that mean "the input named a thing that is not there or not yours", and the field they name. */
const FIELD_FOR: Record<string, string> = {
  ORGANIZATION_NOT_FOUND: "organizationId",
  USER_IS_NOT_A_MEMBER_OF_THE_ORGANIZATION: "organizationId",
};

/** better-auth's schema check words a bad body as "[body.email] Invalid input: ...". Pull out the field names. */
const badFields = (message: string): string[] => [...new Set([...message.matchAll(/\[body\.([\w.]+)\]/g)].map((m) => m[1] ?? ""))];

/** better-auth answers a browser's authorize call with 200 and `{redirect, url}`. A browser needs a real 302. */
export const toRedirect = async (res: Response): Promise<Response> => {
  if (res.status !== 200) return res;
  const body = (await res
    .clone()
    .json()
    .catch(() => null)) as { redirect?: boolean; url?: string } | null;
  if (!body?.redirect || !body.url) return res;
  const headers = new Headers(res.headers);
  headers.delete("content-type");
  headers.delete("content-length");
  headers.set("location", body.url);
  return new Response(null, { status: 302, headers });
};

/**
 * Rewrites better-auth's rejections into the shapes the spec fixes: BAD_INPUT for bad input,
 * and 403 (not 401) when a signed-in member is not allowed to act. Anything else passes through.
 */
export const mapRejection = async (res: Response): Promise<Response> => {
  if (res.status < 400 || res.status >= 500) return res;
  const body = (await res
    .clone()
    .json()
    .catch(() => null)) as { code?: string; message?: string; error_description?: string } | null;
  if (body?.error_description?.includes("code_verifier")) return Response.json({ ...body, code: "BAD_INPUT", field: "code_verifier" }, { status: res.status });
  const code = body?.code ?? "";
  // A body that is not JSON (400) or not a JSON/form content type (415) is the caller's input, so it is BAD_INPUT too.
  if (code === "BAD_REQUEST" && body?.message?.startsWith("Invalid JSON")) return badInput("body", "body: send valid JSON");
  if (code === "UNSUPPORTED_MEDIA_TYPE") return badInput("body", "body: send JSON or a form");
  if (code === "INVALID_EMAIL") return badInput("email", "email: must be an email address");
  const fields = code === "VALIDATION_ERROR" ? badFields(body?.message ?? "") : [];
  if (fields.length > 0) return badInput(fields[0] ?? "", `${fields.join(", ")}: is missing or the wrong type`);
  if (code in FIELD_FOR) return badInput(FIELD_FOR[code] ?? "", code);
  if (body?.message?.startsWith("ROLE_NOT_FOUND")) return badInput("role", body.message);
  if (res.status === 401 && code.startsWith("YOU_ARE_NOT_ALLOWED")) return Response.json(body, { status: 403 });
  return res;
};
