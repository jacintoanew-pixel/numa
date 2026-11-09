/**
 * Cryptographic Session Token Signer & Edge Verifier
 *
 * Signs opaque session tokens with HMAC-SHA256 and embeds expiration timestamp:
 * Format: `<random64hex>.<expiresAtHex>.<hmac64hex>`
 *
 * Compatible with both Node.js runtime (API routes) and Next.js Edge Runtime (`middleware.ts`),
 * preventing unauthenticated middleware bypass via arbitrary/forged cookies (M-02).
 */

const DEFAULT_SIGNING_SECRET = (() => {
  const secret = process.env.SESSION_SIGNING_SECRET || process.env.VAULT_MASTER_KEY;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SIGNING_SECRET (or VAULT_MASTER_KEY) must be set in production");
  }
  return "dev-only-insecure-signing-secret-do-not-use-in-production";
})();

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verifies a signed session token in Next.js Edge Middleware using Web Crypto API (`crypto.subtle`).
 */
export async function verifySignedSessionTokenEdge(
  token: string | undefined | null
): Promise<boolean> {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [randomHex, expiresHex, signatureHex] = parts;
  if (!/^[0-9a-f]{64}$/i.test(randomHex)) return false;
  if (!/^[0-9a-f]{8,16}$/i.test(expiresHex)) return false;
  if (!/^[0-9a-f]{64}$/i.test(signatureHex)) return false;

  const expiresAt = parseInt(expiresHex, 16);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(DEFAULT_SIGNING_SECRET);
    const payloadData = encoder.encode(`${randomHex}.${expiresHex}`);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, payloadData);
    const expectedHex = bytesToHex(new Uint8Array(sigBuffer));

    return constantTimeEqual(expectedHex.toLowerCase(), signatureHex.toLowerCase());
  } catch {
    return false;
  }
}
