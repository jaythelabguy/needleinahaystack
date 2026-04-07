import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Phase 2: Automated scholarship scraping
  // TODO: Implement source-specific scrapers (Fastweb, Bold.org, etc.)
  return NextResponse.json({
    success: true,
    message: 'Cron scrape endpoint ready — automated scrapers not yet implemented',
    scraped: 0,
  })
}
