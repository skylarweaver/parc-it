import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: NextRequest) {
  try {
    const { githubUsername, hashedKey } = await req.json();
    if (!githubUsername || !hashedKey) {
      return NextResponse.json({ error: 'Missing githubUsername or hashedKey.' }, { status: 400 });
    }
    // Check if user already exists
    const { data: existing } = await supabase
      .from('group_members')
      .select('id, hashed_double_blind_key')
      .eq('github_username', githubUsername)
      .single();
    if (existing) {
      if (!existing.hashed_double_blind_key) {
        // User exists but has no DK yet, update the row
        const { error: updateErr } = await supabase
          .from('group_members')
          .update({ hashed_double_blind_key: hashedKey })
          .eq('id', existing.id);
        if (updateErr) {
          return NextResponse.json({ error: 'Failed to update user.' }, { status: 500 });
        }
        return NextResponse.json({ success: true, alreadySignedUp: false }, { status: 200 });
      } else if (existing.hashed_double_blind_key === hashedKey) {
        // Already registered with this DK, auto-login
        return NextResponse.json({ success: true, alreadySignedUp: true }, { status: 200 });
      } else {
        // Registered with a different DK
        return NextResponse.json({ error: 'User already registered with a different double blind key. Contact an admin to reset.' }, { status: 409 });
      }
    }
    // Insert new row
    const { error: insertErr } = await supabase
      .from('group_members')
      .insert({ github_username: githubUsername, hashed_double_blind_key: hashedKey })
      .single();
    if (insertErr) {
      return NextResponse.json({ error: 'Failed to create user.' }, { status: 500 });
    }
    return NextResponse.json({ success: true, alreadySignedUp: false }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 });
  }
} 