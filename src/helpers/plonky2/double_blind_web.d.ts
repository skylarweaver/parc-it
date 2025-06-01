/* tslint:disable */
 
export function validate_keys(public_keys: string, double_blind_key: string): KeyCheckResponse;
export class Circuit {
  free(): void;
  constructor();
  generate_signature(message: string, public_keys: string, double_blind_key: string): string;
  /**
   * Verifies the group signature.  On success, returns the list of public keys.
   */
  read_signature(message: string, signature: string): string;
  prover(): Prover;
  verifier(): Verifier;
}
export class KeyCheckResponse {
  private constructor();
  free(): void;
  public_keys_valid: Uint8Array;
  double_blind_key_valid: boolean;
  get user_public_key_index(): number | undefined;
  set user_public_key_index(value: number | null | undefined);
}
export class Prover {
  private constructor();
  free(): void;
  /**
   * Generate a signature without a nullifier.
   */
  generate_signature(message: string, public_keys: string, double_blind_key: string): Signature;
  /**
   * Generate a signature with a nullifier.
   * The nonce should be 32 bytes long.
   */
  generate_signature_with_nullifier(message: string, public_keys: string, double_blind_key: string, nonce: Uint8Array): Signature;
}
export class Signature {
  private constructor();
  free(): void;
  signature(): string;
  public_keys(): string[];
  has_nullifier(): boolean;
  nullifier(): Uint8Array;
  nonce(): Uint8Array;
}
export class Verifier {
  free(): void;
  constructor();
  read_signature(message: string, signature: string): Signature;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_keycheckresponse_free: (a: number, b: number) => void;
  readonly __wbg_get_keycheckresponse_public_keys_valid: (a: number) => [number, number];
  readonly __wbg_set_keycheckresponse_public_keys_valid: (a: number, b: number, c: number) => void;
  readonly __wbg_get_keycheckresponse_double_blind_key_valid: (a: number) => number;
  readonly __wbg_set_keycheckresponse_double_blind_key_valid: (a: number, b: number) => void;
  readonly __wbg_get_keycheckresponse_user_public_key_index: (a: number) => number;
  readonly __wbg_set_keycheckresponse_user_public_key_index: (a: number, b: number) => void;
  readonly __wbg_circuit_free: (a: number, b: number) => void;
  readonly __wbg_prover_free: (a: number, b: number) => void;
  readonly __wbg_verifier_free: (a: number, b: number) => void;
  readonly __wbg_signature_free: (a: number, b: number) => void;
  readonly circuit_new: () => number;
  readonly circuit_generate_signature: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number, number];
  readonly circuit_read_signature: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
  readonly circuit_prover: (a: number) => number;
  readonly circuit_verifier: (a: number) => number;
  readonly verifier_new: () => number;
  readonly verifier_read_signature: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
  readonly prover_generate_signature: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number];
  readonly prover_generate_signature_with_nullifier: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number, number];
  readonly signature_signature: (a: number) => [number, number];
  readonly signature_public_keys: (a: number) => [number, number];
  readonly signature_has_nullifier: (a: number) => number;
  readonly signature_nullifier: (a: number) => [number, number];
  readonly signature_nonce: (a: number) => [number, number];
  readonly validate_keys: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __externref_drop_slice: (a: number, b: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
