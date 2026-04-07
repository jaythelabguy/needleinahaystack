'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ScholarshipCard } from '@/components/scholarship-card'
import type { MatchWithScholarship, MatchStatus } from '@/types/match'

export default function SavedPage() {
  const [matches, setMatches] = useState<MatchWithScholarship[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSaved = useCallback(async () => {
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

    const { data } = await supabase
      .from('scholarship_matches')
      .select(
        `*, scholarship:scholarships(id, name, provider, amount_min, amount_max, amount_description, deadline, url, description, category, requirements, renewable)`
      )
      .eq('student_id', student.id)
      .eq('status', 'saved')
      .order('match_score', { ascending: false })

    setMatches((data || []) as MatchWithScholarship[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSaved()
  }, [fetchSaved])

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

    fetchSaved()
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading saved scholarships...</div>
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Saved Scholarships</h1>

      {matches.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">
          No saved scholarships yet. Save scholarships from your matches to track them here.
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
