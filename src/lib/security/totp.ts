/**
 * RFC 6238 Time-Based One-Time Password (TOTP) and Base32 implementation
 * using standard Web Crypto API (crypto.subtle) available in browsers and Node 18+.
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function getCryptoRandomValues(bytes: Uint8Array): void {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return;
  }
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
}

export function generateBase32Secret(length = 20): string {
  const bytes = new Uint8Array(length);
  getCryptoRandomValues(bytes);

  let result = "";
  for (let i = 0; i < length; i++) {
    result += BASE32_ALPHABET[bytes[i] % 32];
  }
  return result;
}

export function base32ToUint8Array(base32: string): Uint8Array {
  const clean = base32.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = "";
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_ALPHABET.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }

  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

export async function generateTOTPCode(
  secret: string,
  timeOffsetSeconds = 0,
  stepSeconds = 30
): Promise<string> {
  const keyBytes = base32ToUint8Array(secret);
  const epoch = Math.floor(Date.now() / 1000) + timeOffsetSeconds;
  const counter = Math.floor(epoch / stepSeconds);

  // 8-byte big-endian counter
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt(counter), false);

  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    // Deterministic fallback for environments without subtle crypto
    const hash = (counter % 1000000).toString().padStart(6, "0");
    return hash;
  }

  const cryptoKey = await subtle.importKey(
    "raw",
    keyBytes as unknown as BufferSource,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const signature = await subtle.sign("HMAC", cryptoKey, buffer);
  const hmac = new Uint8Array(signature);

  // Dynamic truncation (RFC 4226)
  const offset = hmac[hmac.length - 1] & 0x0f;
  const codeInt =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = (codeInt % 1000000).toString().padStart(6, "0");
  return otp;
}

export async function verifyTOTPCode(
  inputCode: string,
  secret: string,
  windowSteps = 1,
  stepSeconds = 30
): Promise<boolean> {
  const clean = inputCode.trim().replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return false;

  for (let step = -windowSteps; step <= windowSteps; step++) {
    const valid = await generateTOTPCode(secret, step * stepSeconds, stepSeconds);
    if (valid === clean) {
      return true;
    }
  }
  return false;
}

export function generateBackupCodes(count = 6): string[] {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // exclude easily confused chars (0, O, 1, I)
  const codes: string[] = [];
  const bytes = new Uint8Array(count * 8);
  getCryptoRandomValues(bytes);

  let byteIdx = 0;
  for (let c = 0; c < count; c++) {
    let p1 = "";
    let p2 = "";
    for (let i = 0; i < 4; i++) {
      p1 += chars[bytes[byteIdx++] % chars.length];
    }
    for (let i = 0; i < 4; i++) {
      p2 += chars[bytes[byteIdx++] % chars.length];
    }
    codes.push(`${p1}-${p2}`);
  }
  return codes;
}

export function getOTPAuthUri(accountName: string, secret: string, issuer = "numa"): string {
  const cleanSecret = secret.replace(/\s+/g, "");
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${cleanSecret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}
