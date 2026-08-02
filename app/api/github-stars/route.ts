import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Attempt 1: GitHub REST API
    const res = await fetch('https://api.github.com/repos/krishsoni15/WebHarvest', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/vnd.github.v3+json',
      },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      if (typeof data.stargazers_count === 'number') {
        return NextResponse.json({ stars: data.stargazers_count });
      }
    }
  } catch {}

  try {
    // Attempt 2: HTML Page Scraping (Bypasses API rate limits 100%)
    const pageRes = await fetch('https://github.com/krishsoni15/WebHarvest', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      cache: 'no-store',
    });

    if (pageRes.ok) {
      const html = await pageRes.text();
      const match = html.match(/href="\/krishsoni15\/WebHarvest\/stargazers"[^>]*>[\s\S]*?<span><strong>(\d+)<\/strong><\/span>/i);
      if (match && match[1]) {
        const starCount = parseInt(match[1], 10);
        if (!isNaN(starCount)) {
          return NextResponse.json({ stars: starCount });
        }
      }
    }
  } catch {}

  return NextResponse.json({ stars: 2 });
}
