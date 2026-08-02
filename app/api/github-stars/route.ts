import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch('https://api.github.com/repos/krishsoni15/WebHarvest', {
      headers: {
        'User-Agent': 'WebHarvest-App-Engine',
        'Accept': 'application/vnd.github.v3+json',
      },
      next: { revalidate: 60 },
    });

    if (res.ok) {
      const data = await res.json();
      if (typeof data.stargazers_count === 'number') {
        return NextResponse.json({ stars: data.stargazers_count });
      }
    }
  } catch {}

  // Dynamic fallback if API fails or rate-limited
  return NextResponse.json({ stars: 3 });
}
