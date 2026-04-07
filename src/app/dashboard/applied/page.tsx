'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DeadlineCountdown } from '@/components/deadline-countdown'
import { Badge } from '@/components/ui/badge'
import type { MatchWithScholarship } from '@/types/match'

export default function AppliedPage() {
  const [matches, setMatches] = useState<MatchWithScholarship[]>([])
  const [loading, setLoading] = useState(true)

  const fetchApplied = useCallback(async () => {
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
      .eq('status', 'applied')
      .order('applied_at', { ascending: false })

    setMatches((data || []) as MatchWithScholarship[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchApplied()
  }, [fetchApplied])

  if (loading) {
    return <div className="text-muted-foreground">Loading applications...</div>
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Application Tracker</h1>

      {matches.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">
          No applications tracked yet. Mark scholarships as applied to track them here.
        </p>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => (
            <div
              key={match.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="space-y-1">
                <a
                  href={match.scholarship?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:underline"
                >
                  {match.scholarship?.name}
                </a>
                <p className="text-sm text-muted-foreground">
                  {match.scholarship?.provider}
                  {match.scholarship?.amount_description &&
                    ` — ${match.scholarship.amount_description}`}
                </p>
                {match.applied_at && (
                  <p className="text-xs text-muted-foreground">
                    Applied{' '}
                    {new Date(match.applied_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="text-right space-y-1">
                <Badge className="bg-green-600">Applied</Badge>
                <div>
                  <DeadlineCountdown deadline={match.scholarship?.deadline} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
