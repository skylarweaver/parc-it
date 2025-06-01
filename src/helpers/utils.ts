// Shared utility functions

import { createClient } from "@supabase/supabase-js";
import { OfficeRequest, GroupMember, Admin } from "../types/models";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

export async function fetchAdmins(): Promise<Admin[]> {
  const { data, error } = await supabase.from("admins").select("id, github_username, public_key");
  if (error) throw error;
  return data || [];
}

export async function fetchMembers(): Promise<GroupMember[]> {
  const { data, error } = await supabase.from("group_members").select("id, github_username, avatar_url, public_key");
  if (error) throw error;
  return data || [];
}

export async function fetchRequests({
  page = 1,
  pageSize = 10,
  includeDeleted = false,
  withCount = false
}: {
  page?: number;
  pageSize?: number;
  includeDeleted?: boolean;
  withCount?: boolean;
} = {}): Promise<{ data: OfficeRequest[]; count?: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("office_requests")
    .select("id, emoji, description, created_at, deleted, group_members, doxxed_member_id", withCount ? { count: "exact" } : {});
  if (!includeDeleted) query = query.eq("deleted", false);
  query = query.order("created_at", { ascending: false }).range(from, to);
  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data || [], count: count ?? undefined };
} 