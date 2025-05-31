// Plonky2 Web Worker for WASM-backed cryptographic operations
// Handles heavy computation off the main thread

// Message format:
// { id: string, op: string, args: object }
// Response: { id: string, result?: any, error?: string }

let wasmMod: any = null;
let Circuit: any = null;
let validate_keys: any = null;
let circuitInstance: any = null;
let circuitReady: boolean = false;
let requestQueue: any[] = [];

async function ensureWasmLoaded() {
  if (!wasmMod) {
    // Dynamic import for WASM module
    wasmMod = await import('./double_blind_web.js');
    // Log the URL being used
    const wasmUrl = self.location.origin + '/wasm/double_blind_web_bg.wasm';
    console.log('[Plonky2 Worker] Loading WASM from:', wasmUrl);
    await wasmMod.default(wasmUrl);
    console.log('[Plonky2 Worker] WASM loaded');
    Circuit = wasmMod.Circuit;
    validate_keys = wasmMod.validate_keys;
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
  try {
    await ensureWasmLoaded();
    // Wait for circuit to be ready if needed
    if (!circuitReady && op !== 'initCircuit') {
      console.log(`[Plonky2 Worker] Circuit not ready, queuing request: op=${op}, id=${id}`);
      requestQueue.push({ event, id, op, args });
      return;
    }
    let result;
    switch (op) {
      case 'initCircuit': {
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
        console.log(`[Plonky2 Worker] Calling generateSignature for id=${id}`);
        const t0 = performance.now();
        const { message, publicKeys, dk } = args;
        result = circuitInstance.generate_signature(message, publicKeys, dk);
        const t1 = performance.now();
        const duration = t1 - t0;
        console.log(`[Plonky2 Worker] generateSignature complete for id=${id} in ${duration.toFixed(0)} ms`);
        self.postMessage({ op: 'timing', operation: 'generateSignature', durationMs: Math.round(duration) });
        self.postMessage({ id, result });
        break;
      }
      case 'validateKeys': {
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
        console.log(`[Plonky2 Worker] Calling verifySignature for id=${id}`);
        const t0 = performance.now();
        const { message, signature } = args;
        try {
          const groupKeys = circuitInstance.read_signature(message, signature);
          result = { valid: true, groupKeys };
        } catch (error) {
          result = { valid: false, error };
        }
        const t1 = performance.now();
        const duration = t1 - t0;
        console.log(`[Plonky2 Worker] verifySignature complete for id=${id} in ${duration.toFixed(0)} ms`);
        self.postMessage({ op: 'timing', operation: 'verifySignature', durationMs: Math.round(duration) });
        self.postMessage({ id, result });
        break;
      }
      default:
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