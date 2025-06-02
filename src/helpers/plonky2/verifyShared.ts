// Shared helper for Plonky2 signature verification (used by both workers)

export function verifySignatureWithWasm(wasmMod: any, message: string, signature: string) {
  try {
    const { Verifier } = wasmMod;
    const verifier = new Verifier();
    const sigObj = verifier.read_signature(message, signature);
    let groupKeys = undefined;
    let nullifier = undefined;
    if (typeof sigObj.public_keys === 'function') {
      groupKeys = sigObj.public_keys().join('\n');
    }
    if (typeof sigObj.has_nullifier === 'function' && sigObj.has_nullifier()) {
      nullifier = sigObj.nullifier();
    }
    return { valid: true, groupKeys, nullifier };
  } catch (error) {
    return { valid: false, error };
  }
} 