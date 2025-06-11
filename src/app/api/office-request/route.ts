import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateKeyHash } from '../../../helpers/utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SEVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(req: NextRequest) {
  try {
    const { emoji, description, group_members, doxxed_member_id, keyHash } = await req.json();
    if (!emoji || !description || !group_members || !doxxed_member_id || !keyHash) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    const keyCheck = await validateKeyHash(keyHash, null, supabase);
    if (!keyCheck.valid) {
      return NextResponse.json({ error: keyCheck.error || 'Invalid or missing key hash.' }, { status: 401 });
    }
    const { error } = await supabase.from('office_requests').insert({
      emoji,
      description,
      signature: null,
      group_id: '00000000-0000-0000-0000-000000000000',
      public_signal: 'dummy-signal',
      group_members,
      doxxed_member_id,
      deleted: false,
      metadata: {},
    });
    if (error) {
      return NextResponse.json({ error: 'Failed to submit request: ' + error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error)?.message || 'Unexpected error.' }, { status: 500 });
  }
} 