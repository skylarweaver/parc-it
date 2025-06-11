// Shared utility functions

import type { SupabaseClient } from '@supabase/supabase-js';

export function is4096RsaKey(sshKey: string): boolean {
  if (!sshKey.startsWith('ssh-rsa ')) return false;
  const b64 = sshKey.split(' ')[1];
  const bytes = typeof Buffer !== 'undefined' ? Buffer.from(b64, 'base64') : Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  let offset = 0;
  function readUint32() {
    return (bytes[offset++] << 24) | (bytes[offset++] << 16) | (bytes[offset++] << 8) | (bytes[offset++]);
  }
  function readBuffer() {
    const len = readUint32();
    const buf = bytes.slice(offset, offset + len);
    offset += len;
    return buf;
  }
  readBuffer(); // type ('ssh-rsa')
  readBuffer(); // e
  let n = readBuffer(); // modulus
  if (n[0] === 0x00) n = n.slice(1);
  const firstByte = n[0];
  let bits = (n.length - 1) * 8;
  let b = firstByte;
  while (b) { bits++; b >>= 1; }
  return bits === 4096;
}

// Backend: Validate key hash against group_members table and check public key matches
export async function validateKeyHash(keyHash: string | null, publicKey: string | null, supabase: SupabaseClient) {
  if (!keyHash) return { valid: false, error: 'Missing key hash' };
  const { data, error } = await supabase
    .from('group_members')
    .select('id, public_key')
    .eq('hashed_double_blind_key', keyHash)
    .maybeSingle();
  if (error) return { valid: false, error: error.message };
  if (!data) return { valid: false, error: 'Invalid key hash' };
  if (publicKey && data.public_key !== publicKey) {
    return { valid: false, error: 'Public key does not match key hash' };
  }
  return { valid: true, member: data };
}

// Utility: SHA-256 hash to hex string
export async function sha256Hex(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
} 