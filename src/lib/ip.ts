/** IPv4 and IPv6 CIDR matching for Wi-Fi check-in. */

function parseIpv4(ip: string): bigint | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let v = 0n;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const n = Number(p);
    if (n > 255) return null;
    v = (v << 8n) | BigInt(n);
  }
  return v;
}

function parseIpv6(ip: string): bigint | null {
  let addr = ip.toLowerCase();
  const v4 = addr.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const n = parseIpv4(v4[1]);
    if (n === null) return null;
    addr = addr.replace(v4[1], `${(n >> 16n).toString(16)}:${(n & 0xffffn).toString(16)}`);
  }
  const halves = addr.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 && head.length !== 8) return null;
  if (missing < 0) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  let v = 0n;
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    v = (v << 16n) | BigInt(parseInt(g, 16));
  }
  return v;
}

type Parsed = { v: bigint; bits: 32 | 128 };

export function parseIp(ip: string): Parsed | null {
  const clean = ip.trim().replace(/^\[|\]$/g, "");
  const mapped = clean.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return parseIp(mapped[1]);
  const v4 = parseIpv4(clean);
  if (v4 !== null) return { v: v4, bits: 32 };
  const v6 = parseIpv6(clean);
  if (v6 !== null) return { v: v6, bits: 128 };
  return null;
}

export function ipInCidr(ip: string, cidr: string): boolean {
  const [base, prefixRaw] = cidr.trim().split("/");
  const addr = parseIp(ip);
  const net = parseIp(base);
  if (!addr || !net || addr.bits !== net.bits) return false;
  const prefix = prefixRaw === undefined ? net.bits : Number(prefixRaw);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > net.bits) return false;
  const shift = BigInt(net.bits - prefix);
  return addr.v >> shift === net.v >> shift;
}

/** The first CIDR in the list that contains ip, or null. */
export function matchCidr(ip: string, cidrs: readonly string[]): string | null {
  return cidrs.find((c) => ipInCidr(ip, c)) ?? null;
}

/** First address in x-forwarded-for (Vercel sets it), falling back to x-real-ip. */
export function clientIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return headers.get("x-real-ip");
}
