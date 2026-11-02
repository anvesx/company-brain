import { describe, expect, it } from "vitest";
import { checkUrl } from "../../src/net/guard.js";

const to = (...ips: string[]) => ({ resolve: async () => ips });
const refused = (u: string, p = {}) => checkUrl(u, p).then((r) => typeof r);

describe("checkUrl", () => {
  it("accepts https to a public literal or to a name that resolves only to public addresses", async () => {
    expect(await checkUrl("https://8.8.8.8/c")).toBeUndefined();
    expect(await checkUrl("https://[2606:4700:4700::1111]/c")).toBeUndefined();
    expect(await checkUrl("https://wiki.example.com/c", to("93.184.216.34", "2606:4700:4700::1111"))).toBeUndefined();
  });
  it("refuses private, loopback, link-local and metadata literals in every spelling", async () => {
    const urls = ["https://127.0.0.1", "https://10.0.0.5/x", "https://169.254.169.254/latest", "https://[::1]/", "https://[::ffff:127.0.0.1]/"];
    urls.push(
      "https://2130706433/",
      "https://0x7f.1/",
      "https://[fd00:ec2::254]/",
      "https://[::127.0.0.1]/",
      "https://[::10.0.0.1]/",
      "https://192.168.0.1:8443/",
    );
    for (const u of urls) expect(await refused(u), u).toBe("string");
  });
  it("judges a name by what it resolves to, and one bad address among good ones refuses it", async () => {
    expect(await refused("https://rebind.example/c", to("10.0.0.5"))).toBe("string");
    expect(await refused("https://rebind.example/c", to("93.184.216.34", "169.254.169.254"))).toBe("string");
    expect(await refused("https://rebind.example/c", to("::ffff:10.0.0.5"))).toBe("string");
  });
  it("refuses a name that does not resolve or resolves to nothing", async () => {
    const boom = { resolve: async () => Promise.reject(new Error("ENOTFOUND")) };
    expect(await refused("https://nowhere.example/c", boom)).toBe("string");
    expect(await refused("https://nowhere.example/c", to())).toBe("string");
  });
  it("refuses plain http, other schemes and bad urls by default, even to loopback", async () => {
    for (const u of ["http://8.8.8.8/", "http://127.0.0.1:9/c", "http://localhost/c", "ftp://8.8.8.8/", "file:///etc/passwd", "nope"])
      expect(await refused(u, to("93.184.216.34")), u).toBe("string");
  });
  it("allows loopback, over http or https, only when the caller opts in, and still refuses the rest", async () => {
    const dev = { allowLoopback: true };
    expect(await checkUrl("http://127.0.0.1:9/c", dev)).toBeUndefined();
    expect(await checkUrl("http://[::1]:9/c", dev)).toBeUndefined();
    expect(await checkUrl("http://localhost:9/c", { ...dev, ...to("127.0.0.1", "::1") })).toBeUndefined();
    expect(await refused("http://10.0.0.5/c", dev)).toBe("string");
    expect(await refused("http://169.254.169.254/", dev)).toBe("string");
    expect(await refused("http://wiki.example.com/c", { ...dev, ...to("93.184.216.34") })).toBe("string");
  });
});
