import { getClaudeClient } from '@/lib/claude'

export interface ScholarshipSource {
  name: string
  buildSearchUrls: (profile: StudentProfile) => string[]
}

export interface DiscoveredScholarship {
  url: string
  source: string
  source_id: string
}

/** Aggregated profile data from all students, used to drive search queries. */
export interface StudentProfile {
  majors: string[]
  states: string[]
  schools: string[]
  interests: string[]
  sports: string[]
  ethnicities: string[]
}

function slugify(keyword: string): string {
  return keyword.toLowerCase().replace(/\s+/g, '-')
}

/** Map of known university scholarship pages. */
const UNIVERSITY_SCHOLARSHIP_URLS: Record<string, string[]> = {
  'creighton university': [
    'https://www.creighton.edu/financial-aid/scholarships-grants',
    'https://www.creighton.edu/financial-aid/scholarships-grants/freshman-scholarships',
    'https://www.creighton.edu/financial-aid/scholarships-grants/departmental-scholarships',
  ],
}

const SOURCES: ScholarshipSource[] = [
  {
    name: 'fastweb',
    buildSearchUrls: (profile) => {
      const urls: string[] = []
      // Browse first few pages
      for (let page = 1; page <= 3; page++) {
        urls.push(
          `https://www.fastweb.com/college-scholarships/external_scholarships_search/browse-scholarships?page=${page}`
        )
      }
      // By major
      for (const major of profile.majors) {
        urls.push(
          `https://www.fastweb.com/directory/scholarships-for-${slugify(major)}-majors`
        )
      }
      // By ethnicity
      for (const eth of profile.ethnicities) {
        urls.push(
          `https://www.fastweb.com/directory/scholarships-for-${slugify(eth)}-students`
        )
        urls.push(
          `https://www.fastweb.com/directory/${slugify(eth)}-scholarships`
        )
      }
      // By sport
      for (const sport of profile.sports) {
        urls.push(
          `https://www.fastweb.com/directory/${slugify(sport)}-scholarships`
        )
      }
      return urls
    },
  },
  {
    name: 'bold.org',
    buildSearchUrls: (profile) => {
      const urls: string[] = []
      // Browse pages
      for (let page = 1; page <= 3; page++) {
        urls.push(`https://bold.org/scholarships/${page}/`)
      }
      // By major
      for (const major of profile.majors) {
        urls.push(
          `https://bold.org/scholarships/by-major/${slugify(major)}-scholarships/`
        )
      }
      // By state
      const stateMap: Record<string, string> = {
        HI: 'hawaii', CA: 'california', NY: 'new-york', TX: 'texas',
        FL: 'florida', WA: 'washington', OR: 'oregon', AZ: 'arizona',
        CO: 'colorado', NE: 'nebraska', IL: 'illinois', OH: 'ohio',
        PA: 'pennsylvania', GA: 'georgia', NC: 'north-carolina',
        MI: 'michigan', NJ: 'new-jersey', VA: 'virginia', MA: 'massachusetts',
      }
      for (const state of profile.states) {
        const stateName = stateMap[state.toUpperCase()]
        if (stateName) {
          urls.push(
            `https://bold.org/scholarships/by-state/${stateName}-scholarships/`
          )
        }
      }
      // By demographics/ethnicity
      for (const eth of profile.ethnicities) {
        const slug = slugify(eth)
        urls.push(
          `https://bold.org/scholarships/by-demographics/${slug}/`
        )
        urls.push(
          `https://bold.org/scholarships/by-demographics/minorities/${slug}-scholarships/`
        )
      }
      return urls
    },
  },
  {
    name: 'university',
    buildSearchUrls: (profile) => {
      const urls: string[] = []
      for (const school of profile.schools) {
        const key = school.toLowerCase()
        const schoolUrls = UNIVERSITY_SCHOLARSHIP_URLS[key]
        if (schoolUrls) {
          urls.push(...schoolUrls)
        }
      }
      return urls
    },
  },
  {
    name: 'scholarships360',
    buildSearchUrls: (profile) => {
      const urls: string[] = [
        'https://www.scholarships360.org/scholarships/easy-scholarships-to-apply-for/',
        'https://www.scholarships360.org/scholarships/no-essay-scholarships/',
      ]
      // Ethnicity-specific curated lists
      for (const eth of profile.ethnicities) {
        const slug = slugify(eth)
        urls.push(
          `https://www.scholarships360.org/scholarships/${slug}-scholarships/`
        )
        urls.push(
          `https://www.scholarships360.org/scholarships/scholarships-for-${slug}-students/`
        )
      }
      // Major-specific
      for (const major of profile.majors) {
        urls.push(
          `https://www.scholarships360.org/scholarships/${slugify(major)}-scholarships/`
        )
      }
      return urls
    },
  },
]

/**
 * Use Claude to extract scholarship links from a search results page.
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
        content: `Extract all individual scholarship page URLs from this webpage. Include links to specific scholarship detail/info pages. Return absolute URLs (prepend the site's origin if needed). If this is a university financial aid page, extract links to individual scholarship descriptions or application pages.

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
 * Build a structured profile from all student records for driving searches.
 */
export function buildProfileFromStudents(
  students: Array<{
    intended_major?: string | null
    state?: string | null
    interests?: string[] | null
    sports?: string[] | null
    intended_school?: string | null
    ethnicity?: string[] | null
  }>
): StudentProfile {
  const majors = new Set<string>()
  const states = new Set<string>()
  const schools = new Set<string>()
  const interests = new Set<string>()
  const sports = new Set<string>()
  const ethnicities = new Set<string>()

  for (const s of students) {
    if (s.intended_major) majors.add(s.intended_major)
    if (s.state) states.add(s.state)
    if (s.intended_school) schools.add(s.intended_school)
    if (s.interests) s.interests.forEach((i) => interests.add(i))
    if (s.sports) s.sports.forEach((sp) => sports.add(sp))
    if (s.ethnicity) s.ethnicity.forEach((e) => ethnicities.add(e))
  }

  return {
    majors: Array.from(majors),
    states: Array.from(states),
    schools: Array.from(schools),
    interests: Array.from(interests),
    sports: Array.from(sports),
    ethnicities: Array.from(ethnicities),
  }
}

export interface ScrapeResult {
  source: string
  discovered: DiscoveredScholarship[]
  errors: string[]
}

async function scrapeSource(
  source: ScholarshipSource,
  profile: StudentProfile
): Promise<ScrapeResult> {
  const discovered: DiscoveredScholarship[] = []
  const errors: string[] = []
  const seenUrls = new Set<string>()

  const searchUrls = source.buildSearchUrls(profile)

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
 * Run all scrapers against the student profile. Returns discovered scholarship URLs.
 */
export async function scrapeAllSources(
  profile: StudentProfile
): Promise<{ results: ScrapeResult[]; totalDiscovered: number }> {
  const results = await Promise.allSettled(
    SOURCES.map((source) => scrapeSource(source, profile))
  )

  const settled: ScrapeResult[] = results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { source: SOURCES[i].name, discovered: [], errors: [String(r.reason)] }
  )

  const totalDiscovered = settled.reduce((sum, r) => sum + r.discovered.length, 0)

  return { results: settled, totalDiscovered }
}
