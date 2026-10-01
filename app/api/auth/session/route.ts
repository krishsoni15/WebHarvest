import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      user: {
        name: 'Vuexy Administrator',
        email: 'admin@vuexy.com',
        image: null,
        role: 'admin',
      },
      expires: '2099-01-01T00:00:00.000Z',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Set-Cookie': '__Secure-next-auth.session-token=webharvest_mock_session_token; Path=/; SameSite=Lax',
      },
    }
  );
}

export async function POST() {
  return GET();
}
