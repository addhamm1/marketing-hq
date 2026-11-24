import { describe, expect, it } from "vitest";
import { clientIp, ipInCidr, matchCidr } from "./ip";

describe("CIDR matching", () => {
  it("matches IPv4 ranges", () => {
    expect(ipInCidr("41.33.10.77", "41.33.10.0/24")).toBe(true);
    expect(ipInCidr("41.33.11.1", "41.33.10.0/24")).toBe(false);
    expect(ipInCidr("10.0.0.5", "10.0.0.5")).toBe(true);
    expect(ipInCidr("10.0.0.5", "0.0.0.0/0")).toBe(true);
  });

  it("matches IPv6 and v4-mapped addresses", () => {
    expect(ipInCidr("2001:db8::1", "2001:db8::/32")).toBe(true);
    expect(ipInCidr("2001:db9::1", "2001:db8::/32")).toBe(false);
    expect(ipInCidr("::ffff:41.33.10.7", "41.33.10.0/24")).toBe(true);
  });

  it("rejects garbage", () => {
    expect(ipInCidr("not-an-ip", "10.0.0.0/8")).toBe(false);
    expect(ipInCidr("10.0.0.1", "10.0.0.0/40")).toBe(false);
  });

  it("returns the matching range", () => {
    expect(matchCidr("41.33.10.9", ["10.0.0.0/8", "41.33.10.0/24"])).toBe("41.33.10.0/24");
    expect(matchCidr("8.8.8.8", ["10.0.0.0/8"])).toBeNull();
  });

  it("trusts only the address the platform sets", () => {
    const h = new Headers({ "x-forwarded-for": "6.6.6.6, 41.1.1.1", "x-nf-client-connection-ip": "41.2.2.2" });
    // A visitor can send their own x-forwarded-for; elsewhere the nearest proxy appends the real one last.
    expect(clientIp(h, {})).toBe("41.1.1.1");
    expect(clientIp(h, { VERCEL: "1" })).toBe("6.6.6.6");
    expect(clientIp(h, { CLIENT_IP_HEADER: "X-NF-Client-Connection-IP" })).toBe("41.2.2.2");
    expect(clientIp(h, { CLIENT_IP_HEADER: "cf-connecting-ip" })).toBeNull();
    expect(clientIp(new Headers({ "x-real-ip": "41.3.3.3" }), {})).toBe("41.3.3.3");
  });
});
