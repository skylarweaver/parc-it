// Plonky2 Web Worker for WASM-backed cryptographic operations
// Handles heavy computation off the main thread

// Message format:
// { id: string, op: string, args: object }
// Response: { id: string, result?: any, error?: string }

import { verifySignatureWithWasm } from './verifyShared';

let wasmMod: any = null;
let Circuit: any = null;
let validate_keys: any = null;
let circuitInstance: any = null;
let circuitReady: boolean = false;
const requestQueue: any[] = [];

async function ensureWasmLoaded(caller = 'unknown') {
  console.log(`[Plonky2 Worker] ensureWasmLoaded called by: ${caller}`);
  if (!wasmMod) {
    console.log('[Plonky2 Worker] WASM module not loaded, starting dynamic import...');
    // Dynamic import for WASM module
    wasmMod = await import('./double_blind_web.js');
    // Log the URL being used
    const wasmUrl = self.location.origin + '/wasm/double_blind_web_bg.wasm';
    console.log('[Plonky2 Worker] Loading WASM from:', wasmUrl);
    await wasmMod.default(wasmUrl);
    console.log('[Plonky2 Worker] WASM loaded and initialized');
    Circuit = wasmMod.Circuit;
    validate_keys = wasmMod.validate_keys;
  } else {
    console.log('[Plonky2 Worker] WASM module already loaded');
  }
}

// Helper to process queued requests once the circuit is ready
function processQueue() {
  while (requestQueue.length > 0 && circuitReady) {
    const { event, id, op, args } = requestQueue.shift();
    console.log(`[Plonky2 Worker] Processing queued request: op=${op}, id=${id}`);
    handleRequest(event, id, op, args);
  }
}

async function handleRequest(event: MessageEvent, id: string, op: string, args: any) {
  console.log(`[Plonky2 Worker] handleRequest called: op=${op}, id=${id}`);
  try {
    // Pass caller info for logging
    if (op === 'initCircuit' || op === 'generateSignature' || op === 'validateKeys') {
      await ensureWasmLoaded('circuit-related');
    } else if (op === 'verifySignature') {
      await ensureWasmLoaded('verifySignature');
    } else {
      await ensureWasmLoaded('other');
    }
    // Wait for circuit to be ready if needed
    if (!circuitReady && op !== 'initCircuit' && (op === 'generateSignature' || op === 'validateKeys')) {
      console.log(`[Plonky2 Worker] Circuit not ready, queuing request: op=${op}, id=${id}`);
      requestQueue.push({ event, id, op, args });
      return;
    }
    let result;
    switch (op) {
      case 'initCircuit': {
        console.log('[Plonky2 Worker] switch: initCircuit');
        if (!circuitInstance) {
          console.log('[Plonky2 Worker] Circuit initialization started');
          const t0 = performance.now();
          circuitInstance = new Circuit();
          circuitReady = true;
          const t1 = performance.now();
          const duration = t1 - t0;
          console.log(`[Plonky2 Worker] Circuit initialization complete in ${duration.toFixed(0)} ms`);
          self.postMessage({ op: 'timing', operation: 'initCircuit', durationMs: Math.round(duration) });
          processQueue();
        }
        self.postMessage({ id, result: 'circuitReady' });
        break;
      }
      case 'generateSignature': {
        console.log('[Plonky2 Worker] switch: generateSignature');
        if (!circuitReady) {
          // Wait for circuit to be ready
          requestQueue.push({ event, id, op, args });
          return;
        }
        console.log(`[Plonky2 Worker] Calling generateSignature for id=${id}`);
        const t0 = performance.now();
        const { message, publicKeys, dk } = args;
        const prover = circuitInstance.prover();
        const sigObj = prover.generate_signature(message, publicKeys, dk);
        result = sigObj.signature();
        const t1 = performance.now();
        const duration = t1 - t0;
        console.log(`[Plonky2 Worker] generateSignature complete for id=${id} in ${duration.toFixed(0)} ms`);
        self.postMessage({ op: 'timing', operation: 'generateSignature', durationMs: Math.round(duration) });
        self.postMessage({ id, result });
        break;
      }
      case 'validateKeys': {
        console.log('[Plonky2 Worker] switch: validateKeys');
        if (!circuitReady) {
          // Wait for circuit to be ready
          requestQueue.push({ event, id, op, args });
          return;
        }
        console.log(`[Plonky2 Worker] Calling validateKeys for id=${id}`);
        const t0 = performance.now();
        const { publicKeys, dk } = args;
        result = validate_keys(publicKeys, dk);
        const t1 = performance.now();
        const duration = t1 - t0;
        console.log(`[Plonky2 Worker] validateKeys complete for id=${id} in ${duration.toFixed(0)} ms`);
        self.postMessage({ op: 'timing', operation: 'validateKeys', durationMs: Math.round(duration) });
        self.postMessage({ id, result });
        break;
      }
      case 'verifySignature': {
        console.log('[Plonky2 Worker] switch: verifySignature');
        // Verification does NOT require the circuit, only the Verifier class
        console.log(`[Plonky2 Worker] Calling verifySignature for id=${id}`);
        const t0 = performance.now();
        const { message, signature } = args;
        result = verifySignatureWithWasm(wasmMod, message, signature);
        const t1 = performance.now();
        const duration = t1 - t0;
        console.log(`[Plonky2 Worker] verifySignature complete for id=${id} in ${duration.toFixed(0)} ms`);
        self.postMessage({ op: 'timing', operation: 'verifySignature', durationMs: Math.round(duration) });
        self.postMessage({ id, result });
        break;
      }
      case 'generateSignatureWithNullifier': {
        console.log('[Plonky2 Worker] switch: generateSignatureWithNullifier');
        if (!circuitReady) {
          // Wait for circuit to be ready
          requestQueue.push({ event, id, op, args });
          return;
        }
        console.log(`[Plonky2 Worker] Calling generateSignatureWithNullifier for id=${id}`);
        const t0 = performance.now();
        const { message, publicKeys, dk, nonce } = args;
        let nonceBytes;
        if (typeof nonce === 'string') {
          nonceBytes = Array.from(new TextEncoder().encode(nonce));
        } else if (nonce instanceof Uint8Array) {
          nonceBytes = Array.from(nonce);
        } else if (Array.isArray(nonce)) {
          nonceBytes = nonce;
        } else {
          nonceBytes = [];
        }
        const prover = circuitInstance.prover();
        const sigObj = prover.generate_signature_with_nullifier(message, publicKeys, dk, nonceBytes);
        result = sigObj.signature();
        const t1 = performance.now();
        const duration = t1 - t0;
        console.log(`[Plonky2 Worker] generateSignatureWithNullifier complete for id=${id} in ${duration.toFixed(0)} ms`);
        self.postMessage({ op: 'timing', operation: 'generateSignatureWithNullifier', durationMs: Math.round(duration) });
        self.postMessage({ id, result });
        break;
      }
      default:
        console.log(`[Plonky2 Worker] switch: unknown op ${op}`);
        throw new Error(`Unknown operation: ${op}`);
    }
  } catch (error: any) {
    console.error(`[Plonky2 Worker] Error in op=${op}, id=${id}:`, error);
    self.postMessage({ id, error: error?.message || String(error) });
  }
}

self.onmessage = (event: MessageEvent) => {
  const { id, op, args } = event.data;
  console.log(`[Plonky2 Worker] Received request: op=${op}, id=${id}`);
  handleRequest(event, id, op, args);
}; 