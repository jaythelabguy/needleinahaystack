import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatsCard } from '@/components/stats-card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!student) redirect('/onboarding')

  // Fetch match stats
  const { data: matches } = await supabase
    .from('scholarship_matches')
    .select('match_score, eligible, status, scholarship_id')
    .eq('student_id', student.id)

  const allMatches = matches || []
  const eligible = allMatches.filter((m) => m.eligible)
  const saved = allMatches.filter((m) => m.status === 'saved')
  const applied = allMatches.filter((m) => m.status === 'applied')

  // Get potential amount from eligible scholarships
  const eligibleIds = eligible.map((m) => m.scholarship_id)
  let totalPotential = 0
  if (eligibleIds.length > 0) {
    const { data: scholarships } = await supabase
      .from('scholarships')
      .select('amount_max')
      .in('id', eligibleIds)

    totalPotential = (scholarships || []).reduce(
      (sum, s) => sum + (s.amount_max || 0),
      0
    )
  }

  // Get top matches for preview
  const { data: topMatches } = await supabase
    .from('scholarship_matches')
    .select(
      `*, scholarship:scholarships(id, name, provider, amount_min, amount_max, amount_description, deadline, url, description, category, requirements, renewable)`
    )
    .eq('student_id', student.id)
    .eq('eligible', true)
    .order('match_score', { ascending: false })
    .limit(5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <form method="POST" action="/api/match">
          <input type="hidden" name="student_id" value={student.id} />
        </form>
      </div>

      <StatsCard
        totalMatches={allMatches.length}
        eligibleMatches={eligible.length}
        saved={saved.length}
        applied={applied.length}
        totalPotential={totalPotential}
      />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Top Matches</h2>
          <Link href="/dashboard/matches">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </div>

        {!topMatches?.length ? (
          <p className="text-muted-foreground">
            No matches yet. Scholarships will be matched to your profile
            automatically.
          </p>
        ) : (
          <div className="space-y-3">
            {topMatches.map((match) => (
              <div
                key={match.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <a
                    href={match.scholarship?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                  >
                    {match.scholarship?.name}
                  </a>
                  <p className="text-sm text-muted-foreground">
                    {match.scholarship?.provider} &mdash;{' '}
                    {match.scholarship?.amount_description ||
                      (match.scholarship?.amount_max
                        ? `$${(match.scholarship.amount_max / 100).toLocaleString()}`
                        : 'Amount varies')}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{match.match_score}%</div>
                  <div className="text-xs text-muted-foreground">
                    match score
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
