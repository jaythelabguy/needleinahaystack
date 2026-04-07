import { getClaudeClient } from '@/lib/claude'

export interface ScholarshipSource {
  name: string
  buildSearchUrls: (keywords: string[]) => string[]
}

export interface DiscoveredScholarship {
  url: string
  source: string
  source_id: string
}

/**
 * Map student keywords to URL-friendly slugs for each source.
 */
function slugify(keyword: string): string {
  return keyword.toLowerCase().replace(/\s+/g, '-')
}

const SOURCES: ScholarshipSource[] = [
  {
    name: 'fastweb',
    buildSearchUrls: (keywords) => {
      const urls: string[] = []
      // Browse first few pages of all scholarships
      for (let page = 1; page <= 3; page++) {
        urls.push(
          `https://www.fastweb.com/college-scholarships/external_scholarships_search/browse-scholarships?page=${page}`
        )
      }
      // Major-specific directories
      for (const kw of keywords) {
        const slug = slugify(kw)
        urls.push(
          `https://www.fastweb.com/directory/scholarships-for-${slug}-majors`
        )
      }
      return urls
    },
  },
  {
    name: 'bold.org',
    buildSearchUrls: (keywords) => {
      const urls: string[] = []
      // First few pages of all scholarships
      for (let page = 1; page <= 3; page++) {
        urls.push(`https://bold.org/scholarships/${page}/`)
      }
      // By major
      for (const kw of keywords) {
        const slug = slugify(kw)
        urls.push(
          `https://bold.org/scholarships/by-major/${slug}-scholarships/`
        )
      }
      // By state (only for state-like keywords — 2 chars)
      for (const kw of keywords) {
        if (kw.length === 2) {
          // Map state abbreviations to full names
          const stateMap: Record<string, string> = {
            HI: 'hawaii',
            CA: 'california',
            NY: 'new-york',
            TX: 'texas',
            FL: 'florida',
            WA: 'washington',
            OR: 'oregon',
            AZ: 'arizona',
            CO: 'colorado',
            NE: 'nebraska',
          }
          const stateName = stateMap[kw.toUpperCase()]
          if (stateName) {
            urls.push(
              `https://bold.org/scholarships/by-state/${stateName}-scholarships/`
            )
          }
        }
      }
      return urls
    },
  },
]

/**
 * Use Claude to extract scholarship links from a search results page.
 * This approach is resilient to HTML structure changes.
 */
async function extractLinksFromSearchPage(
  html: string,
  sourceUrl: string,
  sourceName: string
): Promise<string[]> {
  const claude = getClaudeClient()

  const textContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20000)

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    tools: [
      {
        name: 'save_links' as const,
        description: 'Save the extracted scholarship URLs',
        input_schema: {
          type: 'object' as const,
          properties: {
            urls: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of absolute URLs to individual scholarship pages',
            },
          },
          required: ['urls'],
        },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Extract all individual scholarship page URLs from this search results page. Only include links to specific scholarship detail pages, not navigation, ads, or category links. Return absolute URLs (prepend the site's origin if needed).

Source site: ${sourceName}
Page URL: ${sourceUrl}

Page HTML:
${textContent}`,
      },
    ],
  })

  const toolUse = response.content.find((block) => block.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    return []
  }

  const input = toolUse.input as { urls?: string[] }
  return (input.urls || []).filter((u) => {
    try {
      new URL(u)
      return true
    } catch {
      return false
    }
  })
}

/**
 * Build search keywords from all student profiles in the database.
 */
export function buildKeywordsFromStudents(
  students: Array<{
    intended_major?: string | null
    state?: string | null
    interests?: string[] | null
    sports?: string[] | null
    intended_school?: string | null
    ethnicity?: string[] | null
  }>
): string[] {
  const keywords = new Set<string>()

  for (const s of students) {
    if (s.intended_major) keywords.add(s.intended_major)
    if (s.state) keywords.add(s.state)
    if (s.intended_school) keywords.add(s.intended_school)
    if (s.interests) s.interests.forEach((i) => keywords.add(i))
    if (s.sports) s.sports.forEach((sp) => keywords.add(sp))
  }

  return Array.from(keywords)
}

export interface ScrapeResult {
  source: string
  discovered: DiscoveredScholarship[]
  errors: string[]
}

/**
 * Scrape a single source for scholarship URLs using the given keywords.
 */
async function scrapeSource(
  source: ScholarshipSource,
  keywords: string[]
): Promise<ScrapeResult> {
  const discovered: DiscoveredScholarship[] = []
  const errors: string[] = []
  const seenUrls = new Set<string>()

  const searchUrls = source.buildSearchUrls(keywords)

  for (const searchUrl of searchUrls) {
    try {
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) {
        errors.push(`${searchUrl}: HTTP ${response.status}`)
        continue
      }

      const html = await response.text()
      const links = await extractLinksFromSearchPage(html, searchUrl, source.name)

      for (const url of links) {
        if (seenUrls.has(url)) continue
        seenUrls.add(url)
        discovered.push({
          url,
          source: source.name,
          source_id: url,
        })
      }
    } catch (err) {
      errors.push(`${searchUrl}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return { source: source.name, discovered, errors }
}

/**
 * Run all scrapers against the given keywords. Returns discovered scholarship URLs.
 */
export async function scrapeAllSources(
  keywords: string[]
): Promise<{ results: ScrapeResult[]; totalDiscovered: number }> {
  const results = await Promise.allSettled(
    SOURCES.map((source) => scrapeSource(source, keywords))
  )

  const settled: ScrapeResult[] = results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { source: SOURCES[i].name, discovered: [], errors: [String(r.reason)] }
  )

  const totalDiscovered = settled.reduce((sum, r) => sum + r.discovered.length, 0)

  return { results: settled, totalDiscovered }
}
