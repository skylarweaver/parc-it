// Plonky2 WASM loader and API for Next.js (browser only)

import { Circuit, KeyCheckResponse } from './double_blind_web';

// Type for the validate_keys function
export type ValidateKeys = (public_keys: string, double_blind_key: string) => KeyCheckResponse;

let wasmModule: { Circuit: typeof Circuit; validate_keys: ValidateKeys } | null = null;

export async function initPlonkyTwoCircuits(): Promise<{
  Circuit: typeof Circuit;
  validate_keys: ValidateKeys;
}> {
  if (!wasmModule) {
    // Dynamic import for browser-only loading
    const mod = await import('./double_blind_web.js');
    // Always load WASM from the public/wasm path
    const wasmUrl = '/wasm/double_blind_web_bg.wasm';
    await mod.default(wasmUrl); // Initializes WASM from public path
    wasmModule = {
      Circuit: mod.Circuit,
      validate_keys: mod.validate_keys,
    };
  }
  return wasmModule;
}

export { Circuit, KeyCheckResponse }; 