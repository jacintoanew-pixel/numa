import crypto from "node:crypto";
import { signServerPayload } from "@/lib/auth/auth-store";

const consumedChallenges = new Map<string, number>();

export function normalizeBase64ToBuffer(input: string): Buffer {
  const clean = input.trim().replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (clean.length % 4)) % 4;
  return Buffer.from(clean + "=".repeat(pad), "base64");
}

export function bufferToBase64Url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function issueWebAuthnChallenge(): {
  challenge: string;
  challengeToken: string;
  expiresAt: number;
} {
  const now = Date.now();
  for (const [k, exp] of consumedChallenges.entries()) {
    if (exp <= now) consumedChallenges.delete(k);
  }

  const rawBytes = crypto.randomBytes(32);
  const challenge = bufferToBase64Url(rawBytes);
  const expiresAt = now + 2 * 60 * 1000; // 2 minutes
  const expiresHex = expiresAt.toString(16);
  const payload = `${challenge}.${expiresHex}`;
  const sigHex = signServerPayload("webauthn_ch", payload);

  return {
    challenge,
    challengeToken: `wch_${payload}.${sigHex}`,
    expiresAt,
  };
}

export function verifyAndConsumeChallengeToken(challengeToken: string): string | null {
  if (!challengeToken || typeof challengeToken !== "string" || !challengeToken.startsWith("wch_")) {
    return null;
  }
  const now = Date.now();
  if (consumedChallenges.has(challengeToken)) {
    return null;
  }

  const parts = challengeToken.slice(4).split(".");
  if (parts.length !== 3) return null;
  const [challenge, expiresHex, sigHex] = parts;
  if (!challenge || !expiresHex || !sigHex || sigHex.length !== 64) {
    return null;
  }

  const payload = `${challenge}.${expiresHex}`;
  const expectedSig = signServerPayload("webauthn_ch", payload);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sigHex, "hex"), Buffer.from(expectedSig, "hex"))) {
      return null;
    }
  } catch {
    return null;
  }

  const expiresAt = parseInt(expiresHex, 16);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    return null;
  }

  consumedChallenges.set(challengeToken, expiresAt);
  return challenge;
}

export interface VerifyAssertionInput {
  challengeToken: string;
  authenticatorData: string;
  clientDataJSON: string;
  signature: string;
  publicKeySpki: string;
  alg?: number;
  previousSignCount?: number;
  expectedRpId: string;
  expectedOrigin?: string;
}

export function verifyWebAuthnAssertion(input: VerifyAssertionInput): {
  verified: boolean;
  newSignCount: number;
  error?: string;
} {
  const expectedChallenge = verifyAndConsumeChallengeToken(input.challengeToken);
  if (!expectedChallenge) {
    return { verified: false, newSignCount: 0, error: "Desafío WebAuthn inválido, expirado o reutilizado." };
  }

  try {
    const clientDataBuf = normalizeBase64ToBuffer(input.clientDataJSON);
    const clientData = JSON.parse(clientDataBuf.toString("utf-8")) as {
      type?: string;
      challenge?: string;
      origin?: string;
    };

    if (clientData.type !== "webauthn.get") {
      return { verified: false, newSignCount: 0, error: "Tipo de operación WebAuthn inválido." };
    }

    // Normalize both challenges to raw bytes and compare in constant time
    const receivedChallengeBuf = normalizeBase64ToBuffer(clientData.challenge || "");
    const expectedChallengeBuf = normalizeBase64ToBuffer(expectedChallenge);
    if (
      receivedChallengeBuf.length !== expectedChallengeBuf.length ||
      !crypto.timingSafeEqual(receivedChallengeBuf, expectedChallengeBuf)
    ) {
      return { verified: false, newSignCount: 0, error: "El desafío firmado no coincide." };
    }

    if (input.expectedOrigin && clientData.origin) {
      const originHost = new URL(clientData.origin).hostname;
      const isLocal = originHost === "localhost" || originHost === "127.0.0.1";
      if (originHost !== input.expectedRpId && !isLocal) {
        return { verified: false, newSignCount: 0, error: "Origen WebAuthn no coincide con el dominio." };
      }
    }

    const authDataBuf = normalizeBase64ToBuffer(input.authenticatorData);
    if (authDataBuf.length < 37) {
      return { verified: false, newSignCount: 0, error: "authenticatorData truncado." };
    }

    // Verify rpIdHash (first 32 bytes)
    const rpIdHash = authDataBuf.subarray(0, 32);
    const expectedRpHash = crypto.createHash("sha256").update(input.expectedRpId).digest();
    const localhostRpHash = crypto.createHash("sha256").update("localhost").digest();
    const rpMatches =
      crypto.timingSafeEqual(rpIdHash, expectedRpHash) ||
      crypto.timingSafeEqual(rpIdHash, localhostRpHash);
    if (!rpMatches) {
      return { verified: false, newSignCount: 0, error: "RP ID hash no coincide." };
    }

    // Flags at byte 32: bit 0 = UP (User Present), bit 2 = UV (User Verified)
    const flags = authDataBuf[32];
    const userPresent = (flags & 0x01) !== 0;
    const userVerified = (flags & 0x04) !== 0;
    if (!userPresent || !userVerified) {
      return { verified: false, newSignCount: 0, error: "Se requiere verificación biométrica del usuario (UV)." };
    }

    const newSignCount = authDataBuf.readUInt32BE(33);
    const prevCount = input.previousSignCount ?? 0;
    if (prevCount > 0 && newSignCount <= prevCount) {
      return { verified: false, newSignCount, error: "Contador de firmas inválido (posible clonación)." };
    }

    // Cryptographically verify signature over authenticatorData || SHA-256(clientDataJSON)
    const clientDataHash = crypto.createHash("sha256").update(clientDataBuf).digest();
    const signedData = Buffer.concat([authDataBuf, clientDataHash]);
    const signatureBuf = normalizeBase64ToBuffer(input.signature);
    const spkiBuf = normalizeBase64ToBuffer(input.publicKeySpki);

    const publicKey = crypto.createPublicKey({
      key: spkiBuf,
      format: "der",
      type: "spki",
    });

    const isSignatureValid = crypto.verify("sha256", signedData, publicKey, signatureBuf);
    if (!isSignatureValid) {
      return { verified: false, newSignCount, error: "Firma criptográfica WebAuthn inválida." };
    }

    return { verified: true, newSignCount };
  } catch {
    return { verified: false, newSignCount: 0, error: "Error al verificar firma criptográfica WebAuthn." };
  }
}
