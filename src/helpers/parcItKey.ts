// parcItKey.ts - Helper functions for Double Blind Key derivation and validation
// Ported from double-blind/src/helpers/sshFormat.ts, binaryFormat.ts, rsa.ts

// --- Utility functions ---
export function stringToBytes(str: string): Uint8Array {
  return Uint8Array.from(str, (x) => x.charCodeAt(0));
}

function bytesToInt(bytes: Uint8Array): number {
  return bytes[3] + 256 * (bytes[2] + 256 * (bytes[1] + 256 * bytes[0]));
}

function unpackSshBytes(bytes: Uint8Array, numStrings: number): Uint8Array[] {
  const result = [];
  let offset = 0;
  for (let i = 0; i < numStrings; ++i) {
    const lenBytes = bytes.slice(offset, offset + 4);
    const len = bytesToInt(lenBytes);
    const str = bytes.slice(offset + 4, offset + 4 + len);
    result.push(str);
    offset += 4 + len;
  }
  if (offset !== bytes.length) {
    throw new Error("Error unpacking; offset is not at end of bytes");
  }
  return result;
}

// --- Key extraction ---
export function extractPublicKeyFromSignature(signature: string): string {
  // Ported from double-blind/src/helpers/sshFormat.ts: sshSignatureToPubKey
  try {
    const encodedPart = signature
      .split("\n")
      .filter((line) => !line.includes("SSH SIGNATURE"))
      .join("");
    const bytes = stringToBytes(atob(encodedPart));
    const strings = unpackSshBytes(bytes.slice(10), 5);
    const [pubKeyEncoded] = strings;
    const pubKeyParts = unpackSshBytes(pubKeyEncoded, 3);
    const pubSSHKeyStr: string = Array.prototype.map
      .call(pubKeyEncoded, function (ch: number) {
        return String.fromCharCode(ch);
      })
      .join("");
    const keytype = new TextDecoder().decode(pubKeyParts[0]);
    if (keytype !== "ssh-rsa") {
      return "ERROR: Only ssh-rsa supported";
    }
    return keytype + " " + btoa(pubSSHKeyStr);
  } catch (e) {
    return "";
  }
}

// --- Signature parsing ---
function getRawSignature(signature: string) {
  // Ported from double-blind/src/helpers/sshFormat.ts: getRawSignature
  const encodedPart = signature
    .split("\n")
    .filter((line) => !line.includes("SSH SIGNATURE"))
    .join("");
  const bytes = stringToBytes(atob(encodedPart));
  const strings = unpackSshBytes(bytes.slice(10), 5);
  const [pubKeyEncoded, namespace, , hash_algorithm, rawSignatureEncoded] = strings;
  const pubKeyParts = unpackSshBytes(pubKeyEncoded, 3);
  const pubSSHKeyStr = Array.prototype.map
    .call(pubKeyEncoded, function (ch: number) {
      return String.fromCharCode(ch);
    })
    .join("");
  const rawSigParts = unpackSshBytes(rawSignatureEncoded, 2);
  const rawSignature = rawSigParts[1];
  return {
    rawSignature,
    namespace,
    hash_algorithm,
    pubKeyEncoded,
    pubKeyParts,
    pubSSHKeyStr,
  } as const;
}

// --- RSA verification ---
function modExp(a: bigint, b: number, c: bigint): bigint {
  let res = 1n;
  for (let i = 0; i < 30; ++i) {
    if ((b >> i) & 1) res = (res * a) % c;
    a = (a * a) % c;
  }
  return res;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let res = 0n;
  for (let i = 0; i < bytes.length; ++i) {
    res = (res << 8n) + BigInt(bytes[i]);
  }
  return res;
}

function verifyRSA(sig: bigint, modulus: bigint): bigint {
  return modExp(sig, 65537, modulus);
}

// --- Signature validation ---
export function validateParcItKey(signature: string, expectedMessageBigInt: bigint): boolean {
  // Ported from double-blind/src/helpers/groupSignature/sign.ts: getCircuitInputs
  try {
    const rawSig = getRawSignature(signature);
    const rawSignature = rawSig.rawSignature;
    const pubKeyParts = rawSig.pubKeyParts;
    const modulusBigInt = bytesToBigInt(pubKeyParts[2]);
    const signatureBigInt = bytesToBigInt(rawSignature);
    const messageBigInt = verifyRSA(signatureBigInt, modulusBigInt);
    // For double-blind, expectedMessageBigInt is MAGIC_DOUBLE_BLIND_BASE_MESSAGE
    // For parc-it, pass your own value
    // Only check the lower N bits (672 for double-blind)
    const N = 672;
    const validMessage =
      (messageBigInt & ((1n << BigInt(N)) - 1n)) === expectedMessageBigInt;
    return validMessage;
  } catch (e) {
    return false;
  }
} 