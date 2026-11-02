import { lookup } from "node:dns/promises";
import { isLoopbackIp, isPublicIp } from "./ranges.js";

/** All addresses a host name has. */
export type Resolve = (host: string) => Promise<string[]>;
/** `allowLoopback` is for development and tests only: it lets a connector on this machine, over http, be registered. Off by default. */
export type NetPolicy = { allowLoopback?: boolean; resolve?: Resolve };

const system: Resolve = async (host) => (await lookup(host, { all: true })).map((r) => r.address);

/**
 * Why a tenant-supplied url may not be fetched by this server, or undefined when it may.
 * https only (http only with `allowLoopback`, to a loopback address). A name is judged by every address it resolves to,
 * so one internal answer among public ones refuses it; a name that does not resolve is refused.
 */
export async function checkUrl(raw: string, policy: NetPolicy = {}): Promise<string | undefined> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return "not a url";
  }
  const dev = policy.allowLoopback === true;
  if (u.protocol !== "https:" && !(dev && u.protocol === "http:")) return `${u.protocol} is not allowed, use https`;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  let addrs: string[];
  try {
    addrs = /^[\d.]+$|:/.test(host) ? [host] : await (policy.resolve ?? system)(host);
  } catch {
    return `${host} does not resolve`;
  }
  if (addrs.length === 0) return `${host} does not resolve`;
  const loopOk = (ip: string) => dev && isLoopbackIp(ip);
  const bad = addrs.find((ip) => !isPublicIp(ip) && !loopOk(ip));
  if (bad !== undefined) return `${host} points at ${bad}, an internal address`;
  if (u.protocol === "http:" && !addrs.every(isLoopbackIp)) return "http is only allowed to loopback";
  return undefined;
}
