import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateKeyHash } from '../../../helpers/utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// New upvote-public route: upvotes by public key, no cryptographic proof required
export async function POST(req: NextRequest) {
  try {
    const { requestId, publicKey, keyHash } = await req.json();
    if (!requestId || !publicKey || !keyHash) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    const keyCheck = await validateKeyHash(keyHash, publicKey, supabase);
    if (!keyCheck.valid) {
      return NextResponse.json({ error: keyCheck.error || 'Invalid or missing key hash or public key.' }, { status: 401 });
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

export async function DELETE(req: NextRequest) {
  try {
    const { requestId, publicKey, keyHash } = await req.json();
    if (!requestId || !publicKey || !keyHash) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    const keyCheck = await validateKeyHash(keyHash, publicKey, supabase);
    if (!keyCheck.valid) {
      return NextResponse.json({ error: keyCheck.error || 'Invalid or missing key hash or public key.' }, { status: 401 });
    }
    const { error: deleteError } = await supabase
      .from('request_upvotes')
      .delete()
      .eq('request_id', requestId)
      .eq('nullifier', publicKey);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error)?.message || 'Unexpected error.' }, { status: 500 });
  }
} 