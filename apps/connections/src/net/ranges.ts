import ipaddr from "ipaddr.js";

/** The address with an IPv4-mapped IPv6 form (`::ffff:10.0.0.1`) read as the IPv4 it wraps; undefined when `ip` is not an address. */
function parse(ip: string): ipaddr.IPv4 | ipaddr.IPv6 | undefined {
  if (!ipaddr.isValid(ip)) return undefined;
  const a = ipaddr.parse(ip);
  return a.kind() === "ipv6" && (a as ipaddr.IPv6).isIPv4MappedAddress() ? (a as ipaddr.IPv6).toIPv4Address() : a;
}

/** Only global unicast passes: private, loopback, link-local (metadata), CGNAT, multicast, reserved and transition ranges do not. */
export const isPublicIp = (ip: string): boolean => parse(ip)?.range() === "unicast";

export const isLoopbackIp = (ip: string): boolean => parse(ip)?.range() === "loopback";
