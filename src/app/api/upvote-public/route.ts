import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// New upvote-public route: upvotes by public key, no cryptographic proof required
export async function POST(req: NextRequest) {
  try {
    const { requestId, publicKey } = await req.json();
    if (!requestId || !publicKey) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    // Check for duplicate upvote (publicKey stored in nullifier column)
    const { data: existing } = await supabase
      .from('request_upvotes')
      .select('id')
      .eq('request_id', requestId)
      .eq('nullifier', publicKey)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'You have already upvoted this request.' }, { status: 409 });
    }
    // Insert upvote
    const { error: insertError } = await supabase
      .from('request_upvotes')
      .insert({ request_id: requestId, nullifier: publicKey });
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error)?.message || 'Unexpected error.' }, { status: 500 });
  }
} 