/**
 * WebHarvest DNS Guard — SSRF Protection
 *
 * Resolves hostnames to IP addresses BEFORE making requests and blocks
 * any resolution that points to private/internal network ranges.
 * This prevents SSRF attacks where a public hostname resolves to a private IP.
 */

import dns from 'dns';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

export interface DNSResult {
  allowed: boolean;
  hostname: string;
  addresses: string[];
  reason?: string;
}

/** IPv4 private/reserved ranges (CIDR) */
const PRIVATE_IPV4_RANGES: Array<{ prefix: number[]; mask: number }> = [
  { prefix: [0, 0, 0, 0], mask: 8 },       // 0.0.0.0/8   Current network
  { prefix: [10, 0, 0, 0], mask: 8 },       // 10.0.0.0/8  Private
  { prefix: [100, 64, 0, 0], mask: 10 },    // 100.64.0.0/10 Shared (CGNAT)
  { prefix: [127, 0, 0, 0], mask: 8 },      // 127.0.0.0/8 Loopback
  { prefix: [169, 254, 0, 0], mask: 16 },   // 169.254.0.0/16 Link-local
  { prefix: [172, 16, 0, 0], mask: 12 },    // 172.16.0.0/12 Private
  { prefix: [192, 0, 0, 0], mask: 24 },     // 192.0.0.0/24 IETF protocol
  { prefix: [192, 0, 2, 0], mask: 24 },     // 192.0.2.0/24 Documentation
  { prefix: [192, 88, 99, 0], mask: 24 },   // 192.88.99.0/24 IPv6-to-IPv4 relay
  { prefix: [192, 168, 0, 0], mask: 16 },   // 192.168.0.0/16 Private
  { prefix: [198, 18, 0, 0], mask: 15 },    // 198.18.0.0/15 Benchmarking
  { prefix: [198, 51, 100, 0], mask: 24 },  // 198.51.100.0/24 Documentation
  { prefix: [203, 0, 113, 0], mask: 24 },   // 203.0.113.0/24 Documentation
  { prefix: [224, 0, 0, 0], mask: 4 },      // 224.0.0.0/4 Multicast
  { prefix: [240, 0, 0, 0], mask: 4 },      // 240.0.0.0/4 Reserved
  { prefix: [255, 255, 255, 255], mask: 32 }, // Broadcast
];

/**
 * Check if an IPv4 address is in a private/reserved range.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return true; // Invalid = blocked

  for (const range of PRIVATE_IPV4_RANGES) {
    if (matchesCIDR(parts, range.prefix, range.mask)) return true;
  }
  return false;
}

/**
 * Check if an IPv6 address is private/reserved.
 */
function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;                    // Loopback / Unspecified
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;     // Unique local (fc00::/7)
  if (lower.startsWith('fe80')) return true;                              // Link-local
  if (lower.startsWith('::ffff:')) {                                      // IPv4-mapped
    const v4Part = lower.slice(7);
    return isPrivateIPv4(v4Part);
  }
  return false;
}

/**
 * CIDR matching for IPv4.
 */
function matchesCIDR(ip: number[], prefix: number[], maskBits: number): boolean {
  const ipNum = (ip[0] << 24) | (ip[1] << 16) | (ip[2] << 8) | ip[3];
  const prefixNum = (prefix[0] << 24) | (prefix[1] << 16) | (prefix[2] << 8) | prefix[3];
  const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits));
  return (ipNum & mask) === (prefixNum & mask);
}

/**
 * Perform DNS resolution and check if any resolved IP is private.
 * Blocks the request if any resolved address is in a private range.
 */
export async function dnsGuard(hostname: string): Promise<DNSResult> {
  // Direct IP address check (no DNS needed)
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    if (isPrivateIPv4(hostname)) {
      return {
        allowed: false,
        hostname,
        addresses: [hostname],
        reason: `Blocked: ${hostname} is a private/reserved IPv4 address`,
      };
    }
    return { allowed: true, hostname, addresses: [hostname] };
  }

  // IPv6 literal check
  if (hostname.startsWith('[') || hostname.includes(':')) {
    const cleanIP = hostname.replace(/^\[|\]$/g, '');
    if (isPrivateIPv6(cleanIP)) {
      return {
        allowed: false,
        hostname,
        addresses: [cleanIP],
        reason: `Blocked: ${cleanIP} is a private/reserved IPv6 address`,
      };
    }
    return { allowed: true, hostname, addresses: [cleanIP] };
  }

  // DNS resolution
  const addresses: string[] = [];

  try {
    const v4Addresses = await resolve4(hostname);
    addresses.push(...v4Addresses);
  } catch {
    // No A records — not necessarily an error
  }

  try {
    const v6Addresses = await resolve6(hostname);
    addresses.push(...v6Addresses);
  } catch {
    // No AAAA records
  }

  if (addresses.length === 0) {
    return {
      allowed: false,
      hostname,
      addresses: [],
      reason: `DNS resolution failed: no A/AAAA records for ${hostname}`,
    };
  }

  // Check ALL resolved addresses — block if ANY is private
  for (const addr of addresses) {
    if (addr.includes(':')) {
      if (isPrivateIPv6(addr)) {
        return {
          allowed: false,
          hostname,
          addresses,
          reason: `Blocked: ${hostname} resolves to private IPv6 address ${addr}`,
        };
      }
    } else {
      if (isPrivateIPv4(addr)) {
        return {
          allowed: false,
          hostname,
          addresses,
          reason: `Blocked: ${hostname} resolves to private IPv4 address ${addr}`,
        };
      }
    }
  }

  return { allowed: true, hostname, addresses };
}
