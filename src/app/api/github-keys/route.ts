import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'Missing username parameter.' }, { status: 400 });
  }

  try {
    const githubResp = await fetch(`https://github.com/${username}.keys`);
    if (!githubResp.ok) {
      return NextResponse.json({ error: 'GitHub user not found or error fetching keys.' }, { status: 404 });
    }
    const keysText = await githubResp.text();
    const keys = keysText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    if (keys.length === 0) {
      return NextResponse.json({ error: 'No public SSH keys found for this user.' }, { status: 404 });
    }
    return NextResponse.json({ keys });
  } catch (e) {
    return NextResponse.json({ error: 'Network error or unexpected error.' }, { status: 500 });
  }
} 