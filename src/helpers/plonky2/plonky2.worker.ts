// Plonky2 Web Worker for WASM-backed cryptographic operations
// Handles heavy computation off the main thread

// Message format:
// { id: string, op: string, args: object }
// Response: { id: string, result?: any, error?: string }

let wasmMod: any = null;
let Circuit: any = null;
let validate_keys: any = null;

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

self.onmessage = async (event: MessageEvent) => {
  const { id, op, args } = event.data;
  try {
    await ensureWasmLoaded();
    let result;
    switch (op) {
      case 'generateSignature': {
        const { message, publicKeys, dk } = args;
        const circuit = new Circuit();
        result = circuit.generate_signature(message, publicKeys, dk);
        break;
      }
      case 'validateKeys': {
        const { publicKeys, dk } = args;
        result = validate_keys(publicKeys, dk);
        break;
      }
      // TODO: Add more operations as needed (e.g., 'readSignature')
      default:
        throw new Error(`Unknown operation: ${op}`);
    }
    self.postMessage({ id, result });
  } catch (error: any) {
    self.postMessage({ id, error: error?.message || String(error) });
  }
}; 