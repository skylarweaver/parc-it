// Shared utility functions

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