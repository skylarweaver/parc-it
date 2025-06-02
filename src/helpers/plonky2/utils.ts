import { initPlonkyTwoCircuits, KeyCheckResponse } from './initPlonkyTwoCircuits';
import { createClient } from '@supabase/supabase-js';

// Set up Supabase client (reuse your existing env vars)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to report timing to Supabase
async function reportPlonky2Timing(operation: string, durationMs: number) {
  try {
    await supabase.from('plonky2_timings').insert([{ operation, duration_ms: Math.round(durationMs) }]);
  } catch (error) {
    // Silently ignore errors
  }
}

// Singleton Plonky2 circuit worker instance
let plonky2Worker: Worker | null = null;
export function getPlonky2Worker() {
  if (!plonky2Worker) {
    plonky2Worker = new Worker(new URL('./plonky2.worker.ts', import.meta.url), { type: 'module' });
  }
  return plonky2Worker;
}

// Singleton Plonky2 verifier worker instance
let verifierWorker: Worker | null = null;
export function getVerifierWorker() {
  if (!verifierWorker) {
    verifierWorker = new Worker(new URL('./plonky2.verify.worker.ts', import.meta.url), { type: 'module' });
  }
  return verifierWorker;
}

// Helper to send a message to the correct worker and await a response
function plonky2WorkerCall<T = any>(op: string, args: any): Promise<T> {
  // Route verifySignature to the verifier worker, all others to the circuit worker
  const worker = op === 'verifySignature' ? getVerifierWorker() : getPlonky2Worker();
  const id = Date.now().toString() + Math.random().toString(16);
  // Listen for both result and timing messages
  return new Promise((resolve, reject) => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.id === id) {
        worker.removeEventListener('message', handleMessage);
        if ('result' in event.data) resolve(event.data.result);
        else reject(new Error(event.data.error));
      } else if (event.data.op === 'timing' && typeof event.data.durationMs === 'number') {
        // Report timing to Supabase
        reportPlonky2Timing(event.data.operation, event.data.durationMs);
      }
    };
    worker.addEventListener('message', handleMessage);
    worker.onerror = (err) => {
      reject(err);
    };
    worker.postMessage({ id, op, args });
  });
}

/**
 * Checks DK (parcit key) against the group of public keys and returns detailed result.
 * This is NOT offloaded to the worker (restored to main-branch style).
 */
export async function getDKGroupCheck(publicKeys: string, dk: string): Promise<KeyCheckResponse> {
  const { validate_keys } = await initPlonkyTwoCircuits();
  return validate_keys(publicKeys, dk);
}

/**
 * Generates a signature for a message using the group circuit.
 * Offloaded to Plonky2 worker.
 */
export async function generateSignature(message: string, publicKeys: string, dk: string): Promise<string> {
  return plonky2WorkerCall('generateSignature', { message, publicKeys, dk });
}

/**
 * Verifies a signature for a message and returns group keys and nullifier if valid.
 * Offloaded to Plonky2 worker for consistency and performance.
 */
export async function verifySignature(message: string, signature: string): Promise<{valid: boolean, groupKeys?: string, nullifier?: Uint8Array | string, error?: any}> {
  return plonky2WorkerCall('verifySignature', { message, signature });
}

/**
 * Generates a group signature with a nullifier for a message (e.g., for upvoting).
 * The nonce should be unique per (user, action), e.g., the request ID.
 */
export async function generateSignatureWithNullifier(message: string, publicKeys: string, dk: string, nonce: string | Uint8Array | number[]): Promise<string> {
  return plonky2WorkerCall('generateSignatureWithNullifier', { message, publicKeys, dk, nonce });
}

/**
 * Hashes an input string to a 32-byte (SHA-256) Uint8Array for use as a nonce.
 */
export async function to32ByteNonce(input: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const nonce = new Uint8Array(hashBuffer);
  console.log(`[to32ByteNonce] input: ${input}, nonce (hex): ${Array.from(nonce).map(b => b.toString(16).padStart(2, '0')).join('')}`);
  return nonce;
}

// await wasmMod.default({ url: wasmUrl }); 