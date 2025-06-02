import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySignature } from '../../../helpers/plonky2/utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: NextRequest) {
  try {
    const { requestId, signature, message } = await req.json();
    if (!requestId || !signature || !message) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    // 1. Verify the group signature and extract the nullifier
    const result = await verifySignature(message, signature);
    if (!result.valid) {
      return NextResponse.json({ error: 'Invalid group signature.' }, { status: 400 });
    }
    const nullifier = result.nullifier;
    if (!nullifier) {
      return NextResponse.json({ error: 'No nullifier found in signature.' }, { status: 400 });
    }
    // Convert nullifier to hex string for storage
    let nullifierHex;
    if (Array.isArray(nullifier)) {
      nullifierHex = Buffer.from(nullifier).toString('hex');
    } else if (typeof nullifier === 'string') {
      nullifierHex = nullifier;
    } else {
      nullifierHex = String(nullifier);
    }
    // 2. Check for duplicate upvote
    const { data: existing, error: checkError } = await supabase
      .from('request_upvotes')
      .select('id')
      .eq('request_id', requestId)
      .eq('nullifier', nullifierHex)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'Already upvoted.' }, { status: 409 });
    }
    // 3. Insert upvote
    const { error: insertError } = await supabase
      .from('request_upvotes')
      .insert({ request_id: requestId, nullifier: nullifierHex });
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error.' }, { status: 500 });
  }
} 