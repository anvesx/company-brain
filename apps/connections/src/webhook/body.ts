export const MAX_BODY = 1_000_000;

/** The request body as text, or undefined once it passes `max` bytes. The stream is cancelled at the cap, so an oversize body is never held. */
export async function readCapped(req: Request, max: number = MAX_BODY): Promise<string | undefined> {
  if (Number(req.headers.get("content-length") ?? 0) > max) return undefined;
  const reader = req.body?.getReader();
  if (!reader) return "";
  const parts: Uint8Array[] = [];
  let size = 0;
  for (let r = await reader.read(); !r.done; r = await reader.read()) {
    size += r.value.byteLength;
    if (size > max) {
      await reader.cancel();
      return undefined;
    }
    parts.push(r.value);
  }
  return Buffer.concat(parts).toString("utf8");
}
