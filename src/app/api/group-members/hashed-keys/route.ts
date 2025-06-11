import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    // Only return the hashes, no other user info
    const { data, error } = await supabase
      .from('group_members')
      .select('hashed_double_blind_key');
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    // Filter out null/empty hashes
    const hashes = (data || [])
      .map((row: { hashed_double_blind_key: string | null | undefined }) => row.hashed_double_blind_key)
      .filter((h: string | null | undefined) => !!h);
    return NextResponse.json({ hashedKeys: hashes }, { status: 200 });
  } catch (e) {
    const err = e as Error;
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
} 