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

// Singleton Plonky2 worker instance
let plonky2Worker: Worker | null = null;
export function getPlonky2Worker() {
  if (!plonky2Worker) {
    plonky2Worker = new Worker(new URL('./plonky2.worker.ts', import.meta.url), { type: 'module' });
  }
  return plonky2Worker;
}

// Helper to send a message to the Plonky2 worker and await a response
function plonky2WorkerCall<T = any>(op: string, args: any): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = getPlonky2Worker();
    const id = Date.now().toString() + Math.random().toString(16);
    // Listen for both result and timing messages
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
 * Verifies a signature for a message and returns group keys if valid.
 * Offloaded to Plonky2 worker for consistency and performance.
 */
export async function verifySignature(message: string, signature: string): Promise<{valid: boolean, groupKeys?: string, error?: any}> {
  return plonky2WorkerCall('verifySignature', { message, signature });
}

// await wasmMod.default({ url: wasmUrl }); 