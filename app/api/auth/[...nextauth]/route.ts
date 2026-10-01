import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.pathname.toLowerCase();

  if (url.includes('/session')) {
    return NextResponse.json({
      user: {
        name: 'Vuexy Administrator',
        email: 'admin@vuexy.com',
        image: null,
        role: 'admin',
      },
      expires: '2099-01-01T00:00:00.000Z',
    });
  }

  if (url.includes('/csrf')) {
    return NextResponse.json({
      csrfToken: 'webharvest_offline_mock_csrf_token',
    });
  }

  if (url.includes('/providers')) {
    return NextResponse.json({
      credentials: {
        id: 'credentials',
        name: 'Credentials',
        type: 'credentials',
        signinUrl: '/api/auth/signin/credentials',
        callbackUrl: '/api/auth/callback/credentials',
      },
    });
  }

  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  const url = req.nextUrl.pathname.toLowerCase();

  if (url.includes('/callback') || url.includes('/signin')) {
    return NextResponse.json(
      { url: '/dashboards/analytics' },
      {
        status: 200,
        headers: {
          'Set-Cookie': '__Secure-next-auth.session-token=webharvest_mock_session_token; Path=/; SameSite=Lax',
        },
      }
    );
  }

  return GET(req);
}
