import { NextRequest, NextResponse } from 'next/server';
import { listAuthProfiles, createAuthProfile } from '@/lib/db/client';
import { parseStorageStateJson } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const domain = url.searchParams.get('domain') || undefined;

    const profiles = listAuthProfiles(domain);

    // Sanitize: return metadata without exposing raw auth cookies
    const sanitized = profiles.map((p) => ({
      id: p.id,
      name: p.name,
      domain: p.domain,
      auth_type: p.auth_type,
      created_at: p.created_at,
      last_used_at: p.last_used_at,
    }));

    return NextResponse.json({ profiles: sanitized });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list profiles' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = body.name;
    const domain = body.domain || body.target_origin || 'example.com';
    const sessionJson = body.sessionJson || body.storageState;

    if (!name || !sessionJson) {
      return NextResponse.json(
        { error: 'Name and sessionJson (or storageState) are required' },
        { status: 400 }
      );
    }

    const parsedState = parseStorageStateJson(
      typeof sessionJson === 'string' ? sessionJson : JSON.stringify(sessionJson)
    );

    if (!parsedState) {
      return NextResponse.json(
        { error: 'Invalid session format. Expected Playwright storageState or cookie array.' },
        { status: 400 }
      );
    }

    const id = `auth_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = createAuthProfile({
      id,
      name,
      domain,
      auth_type: 'storage_state',
      storage_state: JSON.stringify(parsedState),
    });

    return NextResponse.json({
      success: true,
      profile: {
        id: record.id,
        name: record.name,
        domain: record.domain,
        auth_type: record.auth_type,
        created_at: record.created_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save profile' }, { status: 500 });
  }
}
