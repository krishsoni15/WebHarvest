import { NextRequest, NextResponse } from 'next/server';
import {
  startManualLogin,
  getManualLoginStatus,
  completeManualLogin,
  cancelManualLogin,
} from '@/lib/auth/manual-login';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, url, sessionId, profileName } = body;

    if (action === 'start') {
      if (!url) {
        return NextResponse.json({ error: 'Target URL is required' }, { status: 400 });
      }
      const newSessionId = await startManualLogin(url);
      return NextResponse.json({ success: true, sessionId: newSessionId, status: 'launching' });
    }

    if (action === 'status') {
      if (!sessionId) {
        return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
      }
      const status = getManualLoginStatus(sessionId);
      if (!status) {
        return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
      }
      return NextResponse.json({ success: true, session: status });
    }

    if (action === 'complete') {
      if (!sessionId) {
        return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
      }
      const res = await completeManualLogin(sessionId, profileName);
      if (!res.success) {
        return NextResponse.json({ error: res.error || 'Failed to capture session' }, { status: 500 });
      }
      return NextResponse.json({ success: true, profileId: res.profileId });
    }

    if (action === 'cancel') {
      if (!sessionId) {
        return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
      }
      await cancelManualLogin(sessionId);
      return NextResponse.json({ success: true, status: 'cancelled' });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Manual login API error' }, { status: 500 });
  }
}
