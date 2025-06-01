// Plonky2 Verifier Web Worker for lightweight signature verification only
// Handles only verification requests, does NOT initialize or use the circuit

let verifierWasmMod: any = null;

async function ensureWasmLoaded() {
  if (!verifierWasmMod) {
    console.log('[Verifier Worker] WASM module not loaded, starting dynamic import...');
    verifierWasmMod = await import('./double_blind_web.js');
    const wasmUrl = self.location.origin + '/wasm/double_blind_web_bg.wasm';
    console.log('[Verifier Worker] Loading WASM from:', wasmUrl);
    await verifierWasmMod.default(wasmUrl);
    console.log('[Verifier Worker] WASM loaded and initialized');
  } else {
    console.log('[Verifier Worker] WASM module already loaded');
  }
}

async function handleRequest(event: MessageEvent, id: string, op: string, args: any) {
  console.log(`[Verifier Worker] handleRequest called: op=${op}, id=${id}`);
  try {
    await ensureWasmLoaded();
    let result;
    switch (op) {
      case 'verifySignature': {
        console.log('[Verifier Worker] switch: verifySignature');
        const t0 = performance.now();
        const { message, signature } = args;
        try {
          const { Verifier } = verifierWasmMod;
          const verifier = new Verifier();
          console.log(`[Verifier Worker] About to call verifier.read_signature for id=${id}`);
          const sigObj = verifier.read_signature(message, signature);
          console.log(`[Verifier Worker] verifier.read_signature returned for id=${id}`);
          let groupKeys = undefined;
          let nullifier = undefined;
          if (typeof sigObj.public_keys === 'function') {
            groupKeys = sigObj.public_keys().join('\n');
          }
          if (typeof sigObj.has_nullifier === 'function' && sigObj.has_nullifier()) {
            nullifier = sigObj.nullifier();
          }
          result = { valid: true, groupKeys, nullifier };
        } catch (error) {
          console.error(`[Verifier Worker] Error in verifier.read_signature for id=${id}:`, error);
          result = { valid: false, error };
        }
        const t1 = performance.now();
        const duration = t1 - t0;
        console.log(`[Verifier Worker] verifySignature complete for id=${id} in ${duration.toFixed(0)} ms`);
        self.postMessage({ op: 'timing', operation: 'verifySignature', durationMs: Math.round(duration) });
        self.postMessage({ id, result });
        break;
      }
      default:
        console.log(`[Verifier Worker] switch: unknown op ${op}`);
        throw new Error(`Unknown operation: ${op}`);
    }
  } catch (error: any) {
    console.error(`[Verifier Worker] Error in op=${op}, id=${id}:`, error);
    self.postMessage({ id, error: error?.message || String(error) });
  }
}

self.onmessage = (event: MessageEvent) => {
  const { id, op, args } = event.data;
  console.log(`[Verifier Worker] Received request: op=${op}, id=${id}`);
  handleRequest(event, id, op, args);
}; 