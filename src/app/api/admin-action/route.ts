import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateKeyHash } from '../../../helpers/utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, targetId, keyHash, githubUsername, avatar_url, public_key } = body;
    if (!action || !keyHash) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    const actionsRequiringTargetId = ['deleteRequest', 'removeMember', 'removeAdmin'];
    if (actionsRequiringTargetId.includes(action) && !targetId) {
      return NextResponse.json({ error: 'Missing targetId for this action.' }, { status: 400 });
    }
    // Validate key hash
    const keyCheck = await validateKeyHash(keyHash, null, supabase);
    if (!keyCheck.valid) {
      return NextResponse.json({ error: keyCheck.error || 'Invalid or missing key hash.' }, { status: 401 });
    }
    // Find the member by hashed_double_blind_key
    const { data: member, error: memberError } = await supabase
      .from('group_members')
      .select('id, public_key')
      .eq('hashed_double_blind_key', keyHash)
      .maybeSingle();
    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found for this key.' }, { status: 403 });
    }
    // Check admin/member privileges
    let isAllowed = false;
    if ([
      'deleteRequest',
      'removeMember',
      'removeAdmin',
      'addMember',
      'addAdmin',
    ].includes(action)) {
      // Only admins can perform these actions
      const { data: admin } = await supabase
        .from('admins')
        .select('id')
        .eq('public_key', member.public_key)
        .maybeSingle();
      isAllowed = !!admin;
    }
    if (!isAllowed) {
      return NextResponse.json({ error: 'Insufficient privileges.' }, { status: 403 });
    }
    // Perform the action
    if (action === 'deleteRequest') {
      const { error } = await supabase.from('office_requests').update({ deleted: true }).eq('id', targetId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (action === 'removeMember') {
      const { error } = await supabase.from('group_members').delete().eq('id', targetId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (action === 'removeAdmin') {
      const { error } = await supabase.from('admins').delete().eq('id', targetId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (action === 'addMember') {
      if (!githubUsername || !avatar_url || !public_key) {
        return NextResponse.json({ error: 'Missing member fields.' }, { status: 400 });
      }
      const { error } = await supabase.from('group_members').insert({
        github_username: githubUsername,
        avatar_url,
        public_key,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (action === 'addAdmin') {
      if (!githubUsername || !public_key) {
        return NextResponse.json({ error: 'Missing admin fields.' }, { status: 400 });
      }
      const { error } = await supabase.from('admins').insert({
        github_username: githubUsername,
        public_key,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error)?.message || 'Unexpected error.' }, { status: 500 });
  }
} 