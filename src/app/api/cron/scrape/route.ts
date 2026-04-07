import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { extractScholarshipFromContent } from '@/lib/scraping/extractor'
import { scrapeAllSources, buildProfileFromStudents } from '@/lib/scraping/sources'
import { runMatchingForScholarship } from '@/lib/matching/engine'

// Max scholarships to ingest per cron run to stay within Vercel function time limits
const MAX_INGEST_PER_RUN = 20

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()
  const log: string[] = []

  try {
    // 1. Get all student profiles to build search keywords
    const { data: students, error: studError } = await supabase
      .from('students')
      .select('intended_major, state, interests, sports, intended_school, ethnicity')

    if (studError) {
      return NextResponse.json(
        { error: `Failed to fetch students: ${studError.message}` },
        { status: 500 }
      )
    }

    if (!students || students.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No student profiles found — nothing to search for',
        scraped: 0,
      })
    }

    const profile = buildProfileFromStudents(students)
    log.push(`Majors: ${profile.majors.join(', ')}`)
    log.push(`States: ${profile.states.join(', ')}`)
    log.push(`Schools: ${profile.schools.join(', ')}`)
    log.push(`Ethnicities: ${profile.ethnicities.join(', ')}`)
    log.push(`Sports: ${profile.sports.join(', ')}`)

    // 2. Discover scholarship URLs from all sources
    const { results: scrapeResults, totalDiscovered } =
      await scrapeAllSources(profile)

    for (const r of scrapeResults) {
      log.push(`${r.source}: ${r.discovered.length} found, ${r.errors.length} errors`)
      for (const err of r.errors) {
        log.push(`  error: ${err}`)
      }
    }

    if (totalDiscovered === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new scholarship URLs discovered',
        log,
        scraped: 0,
      })
    }

    // 3. Collect all discovered URLs and filter out ones we already have
    const allDiscovered = scrapeResults.flatMap((r) => r.discovered)
    const discoveredUrls = allDiscovered.map((d) => d.url)

    const { data: existing } = await supabase
      .from('scholarships')
      .select('source, source_id')
      .in('source_id', discoveredUrls)

    const existingKeys = new Set(
      (existing || []).map((e) => `${e.source}:${e.source_id}`)
    )

    const newScholarships = allDiscovered.filter(
      (d) => !existingKeys.has(`${d.source}:${d.source_id}`)
    )

    log.push(
      `${totalDiscovered} discovered, ${totalDiscovered - newScholarships.length} already exist, ${newScholarships.length} new`
    )

    // 4. Ingest new scholarships (capped to stay within time limits)
    const toProcess = newScholarships.slice(0, MAX_INGEST_PER_RUN)
    let ingested = 0
    const newScholarshipIds: string[] = []

    for (const item of toProcess) {
      try {
        const response = await fetch(item.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ScholarshipBot/1.0)',
          },
          signal: AbortSignal.timeout(10000),
        })

        if (!response.ok) {
          log.push(`Fetch failed ${item.url}: HTTP ${response.status}`)
          continue
        }

        const html = await response.text()
        const { scholarship } = await extractScholarshipFromContent(item.url, html)

        const { data: saved, error: saveError } = await supabase
          .from('scholarships')
          .upsert(
            {
              ...scholarship,
              source: item.source,
              source_id: item.source_id,
            },
            { onConflict: 'source,source_id' }
          )
          .select('id')
          .single()

        if (saveError) {
          log.push(`Save failed ${item.url}: ${saveError.message}`)
          continue
        }

        ingested++
        if (saved?.id) {
          newScholarshipIds.push(saved.id)
        }
        log.push(`Ingested: ${scholarship.name}`)
      } catch (err) {
        log.push(
          `Ingest error ${item.url}: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    // 5. Run matching for newly ingested scholarships
    let matched = 0
    for (const schId of newScholarshipIds) {
      try {
        await runMatchingForScholarship(schId)
        matched++
      } catch (err) {
        log.push(
          `Matching error ${schId}: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    log.push(`Matching ran for ${matched}/${newScholarshipIds.length} new scholarships`)

    return NextResponse.json({
      success: true,
      scraped: ingested,
      matched,
      remaining: Math.max(0, newScholarships.length - MAX_INGEST_PER_RUN),
      log,
    })
  } catch (error) {
    console.error('Cron scrape error:', error)
    return NextResponse.json(
      {
        error: 'Cron scrape failed',
        details: error instanceof Error ? error.message : String(error),
        log,
      },
      { status: 500 }
    )
  }
}
