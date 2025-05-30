import { initPlonkyTwoCircuits, KeyCheckResponse } from './initPlonkyTwoCircuits';

/**
 * Checks DK (parcit key) against the group of public keys and returns detailed result.
 * @param publicKeys - Newline-separated public keys
 * @param dk - The user's parcit key
 * @returns Promise<KeyCheckResponse> - detailed result including user_public_key_index
 */
export async function getDKGroupCheck(publicKeys: string, dk: string): Promise<KeyCheckResponse> {
  const { validate_keys } = await initPlonkyTwoCircuits();
  return validate_keys(publicKeys, dk);
}

/**
 * Generates a signature for a message using the group circuit.
 * @param message - The message to sign
 * @param publicKeys - Newline-separated public keys
 * @param dk - The user's parcit key
 * @returns Promise<string> - The generated signature
 */
export async function generateSignature(message: string, publicKeys: string, dk: string): Promise<string> {
  const { Circuit } = await initPlonkyTwoCircuits();
  const circuit = new Circuit();
  return circuit.generate_signature(message, publicKeys, dk);
}

/**
 * Verifies a signature for a message and returns group keys if valid.
 * @param message - The message to verify
 * @param signature - The signature to verify
 * @returns Promise<{valid: boolean, groupKeys?: string, error?: any}>
 */
export async function verifySignature(message: string, signature: string): Promise<{valid: boolean, groupKeys?: string, error?: any}> {
  const { Circuit } = await initPlonkyTwoCircuits();
  const circuit = new Circuit();
  try {
    const groupKeys = circuit.read_signature(message, signature);
    return { valid: true, groupKeys };
  } catch (error) {
    return { valid: false, error };
  }
} 