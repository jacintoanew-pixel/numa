/**
 * WebAuthn Platform Authenticator Helper for Fingerprint / Touch ID.
 * Uses server-issued challenges and real cryptographic public-key signatures (SPKI DER).
 */

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64OrUrl: string): Uint8Array {
  const normalized = base64OrUrl.trim().replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLen);
  const binaryString = atob(padded);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function isFingerprintAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    return false;
  }
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return false;
  } catch {
    return false;
  }
}

export interface RegisteredFingerprintCredential {
  credentialId: string;
  publicKey: string;
  publicKeySpki: string;
  alg: number;
}

/**
 * Registers a new platform fingerprint credential (Touch ID / Fingerprint sensor)
 * and extracts its real SubjectPublicKeyInfo (SPKI) DER public key for server verification.
 */
export async function registerFingerprintCredential(
  userId: string,
  userName: string
): Promise<RegisteredFingerprintCredential | null> {
  if (!(await isFingerprintAvailable())) {
    throw new Error("El sensor de huella dactilar no está disponible en este dispositivo o navegador.");
  }

  let challengeBytes = new Uint8Array(32);
  window.crypto.getRandomValues(challengeBytes);
  try {
    const chRes = await fetch("/api/auth/biometrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "challenge" }),
    });
    if (chRes.ok) {
      const chData = await chRes.json();
      if (chData?.challenge) {
        challengeBytes = new Uint8Array(base64ToUint8Array(chData.challenge));
      }
    }
  } catch {
    // Fallback to local CSPRNG challenge for registration
  }

  const userIdBytes = new TextEncoder().encode(userId);

  const createOptions: PublicKeyCredentialCreationOptions = {
    challenge: challengeBytes,
    rp: {
      name: "numa",
      id: window.location.hostname === "localhost" ? "localhost" : window.location.hostname,
    },
    user: {
      id: userIdBytes,
      name: userName,
      displayName: userName,
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" }, // ES256
      { alg: -257, type: "public-key" }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred",
    },
    timeout: 60000,
    attestation: "none",
  };

  try {
    const credential = (await navigator.credentials.create({
      publicKey: createOptions,
    })) as PublicKeyCredential | null;

    if (!credential) {
      return null;
    }

    const credentialId = arrayBufferToBase64(credential.rawId);
    const attestationResp = credential.response as AuthenticatorAttestationResponse;

    let publicKeySpki = "";
    let alg = -7;

    if (typeof attestationResp.getPublicKey === "function") {
      const spkiBuf = attestationResp.getPublicKey();
      if (spkiBuf) {
        publicKeySpki = arrayBufferToBase64(spkiBuf);
      }
    }
    if (typeof attestationResp.getPublicKeyAlgorithm === "function") {
      const detectedAlg = attestationResp.getPublicKeyAlgorithm();
      if (typeof detectedAlg === "number") {
        alg = detectedAlg;
      }
    }

    if (!publicKeySpki) {
      throw new Error("El navegador no entregó la clave pública criptográfica del sensor biométrico.");
    }

    return {
      credentialId,
      publicKey: publicKeySpki,
      publicKeySpki,
      alg,
    };
  } catch (err: unknown) {
    const errorName = (err as Error)?.name;
    if (errorName === "NotAllowedError") {
      throw new Error("Registro de huella cancelado o no autorizado por el usuario.");
    }
    throw new Error((err as Error)?.message || "Error al registrar la huella dactilar.");
  }
}

export interface VerifiedFingerprintAssertion {
  success: boolean;
  credentialId?: string;
  challengeToken?: string;
  authenticatorData?: string;
  clientDataJSON?: string;
  signature?: string;
}

/**
 * Challenges the user for fingerprint verification against a server-issued challenge
 * and returns the cryptographic assertion signature.
 */
export async function verifyFingerprint(
  allowedCredentialId?: string
): Promise<VerifiedFingerprintAssertion> {
  if (!(await isFingerprintAvailable())) {
    return { success: false };
  }

  // Request a signed, single-use challenge from the server
  let challengeBytes: Uint8Array;
  let challengeToken = "";
  try {
    const chRes = await fetch("/api/auth/biometrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "challenge" }),
    });
    if (!chRes.ok) {
      return { success: false };
    }
    const chData = await chRes.json();
    if (!chData?.challenge || !chData?.challengeToken) {
      return { success: false };
    }
    challengeBytes = base64ToUint8Array(chData.challenge);
    challengeToken = chData.challengeToken;
  } catch {
    return { success: false };
  }

  const getOptions: PublicKeyCredentialRequestOptions = {
    challenge: challengeBytes as unknown as BufferSource,
    rpId: window.location.hostname === "localhost" ? "localhost" : window.location.hostname,
    userVerification: "required",
    timeout: 60000,
  };

  if (allowedCredentialId) {
    try {
      const bytes = base64ToUint8Array(allowedCredentialId);
      getOptions.allowCredentials = [
        {
          id: bytes as unknown as BufferSource,
          type: "public-key",
          transports: ["internal", "hybrid"],
        },
      ];
    } catch {
      // Ignore if decoding fails and try platform discovery
    }
  }

  try {
    const assertion = (await navigator.credentials.get({
      publicKey: getOptions,
    }).catch(async (err: unknown) => {
      const errorName = (err as Error)?.name;
      if (errorName !== "NotAllowedError" && getOptions.allowCredentials) {
        const fallbackOptions: PublicKeyCredentialRequestOptions = {
          challenge: challengeBytes as unknown as BufferSource,
          rpId: getOptions.rpId,
          userVerification: "required",
          timeout: 60000,
        };
        return (await navigator.credentials.get({
          publicKey: fallbackOptions,
        })) as PublicKeyCredential | null;
      }
      throw err;
    })) as PublicKeyCredential | null;

    if (!assertion) {
      return { success: false };
    }

    const assertionResp = assertion.response as AuthenticatorAssertionResponse;
    const credentialId = arrayBufferToBase64(assertion.rawId);
    const authenticatorData = arrayBufferToBase64(assertionResp.authenticatorData);
    const clientDataJSON = arrayBufferToBase64(assertionResp.clientDataJSON);
    const signature = arrayBufferToBase64(assertionResp.signature);

    return {
      success: true,
      credentialId,
      challengeToken,
      authenticatorData,
      clientDataJSON,
      signature,
    };
  } catch (err: unknown) {
    const errorName = (err as Error)?.name;
    if (errorName === "NotAllowedError") {
      return { success: false };
    }
    console.warn("Biometric verification fallback:", err);
    return { success: false };
  }
}
