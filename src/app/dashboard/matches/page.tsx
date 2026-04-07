'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ScholarshipCard } from '@/components/scholarship-card'
import { Button } from '@/components/ui/button'
import type { MatchWithScholarship, MatchStatus } from '@/types/match'

type SortField = 'match_score' | 'deadline' | 'amount'
type FilterField = 'all' | 'eligible' | 'ineligible'

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchWithScholarship[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortField>('match_score')
  const [filter, setFilter] = useState<FilterField>('eligible')
  const [runningMatch, setRunningMatch] = useState(false)

  const fetchMatches = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!student) return

    let query = supabase
      .from('scholarship_matches')
      .select(
        `*, scholarship:scholarships(id, name, provider, amount_min, amount_max, amount_description, deadline, url, description, category, requirements, renewable)`
      )
      .eq('student_id', student.id)
      .neq('status', 'dismissed')

    if (filter === 'eligible') {
      query = query.eq('eligible', true)
    } else if (filter === 'ineligible') {
      query = query.eq('eligible', false)
    }

    if (sortBy === 'match_score') {
      query = query.order('match_score', { ascending: false })
    } else if (sortBy === 'deadline') {
      query = query.order('scholarship(deadline)', { ascending: true })
    }

    const { data } = await query

    let results = (data || []) as MatchWithScholarship[]

    if (sortBy === 'amount') {
      results.sort(
        (a, b) =>
          (b.scholarship?.amount_max || 0) - (a.scholarship?.amount_max || 0)
      )
    }

    setMatches(results)
    setLoading(false)
  }, [filter, sortBy])

  useEffect(() => {
    fetchMatches()
  }, [fetchMatches])

  async function handleUpdateStatus(matchId: string, status: MatchStatus) {
    const supabase = createClient()
    const updateData: Record<string, string> = { status }
    if (status === 'applied') {
      updateData.applied_at = new Date().toISOString()
    }

    await supabase
      .from('scholarship_matches')
      .update(updateData)
      .eq('id', matchId)

    fetchMatches()
  }

  async function handleRunMatching() {
    setRunningMatch(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!student) return

    await fetch('/api/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: student.id }),
    })

    setRunningMatch(false)
    fetchMatches()
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading matches...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">All Matches</h1>
        <Button onClick={handleRunMatching} disabled={runningMatch}>
          {runningMatch ? 'Matching...' : 'Re-run Matching'}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          {(['eligible', 'all', 'ineligible'] as FilterField[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
        <div className="flex gap-1 ml-4">
          {(
            [
              ['match_score', 'Score'],
              ['deadline', 'Deadline'],
              ['amount', 'Amount'],
            ] as [SortField, string][]
          ).map(([field, label]) => (
            <Button
              key={field}
              variant={sortBy === field ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy(field)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {matches.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">
          No matches found. Try running the matching engine or adjusting filters.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {matches.map((match) => (
            <ScholarshipCard
              key={match.id}
              match={match}
              onUpdateStatus={handleUpdateStatus}
            />
          ))}
        </div>
      )}
    </div>
  )
}
