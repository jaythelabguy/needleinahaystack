'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Scholarship } from '@/types/scholarship'

export default function AdminScholarshipsPage() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([])
  const [loading, setLoading] = useState(true)

  const fetchScholarships = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('scholarships')
      .select('*')
      .order('created_at', { ascending: false })

    setScholarships((data || []) as Scholarship[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchScholarships()
  }, [fetchScholarships])

  async function handleDelete(id: string) {
    if (!confirm('Delete this scholarship?')) return
    const supabase = createClient()
    await supabase.from('scholarships').delete().eq('id', id)
    fetchScholarships()
  }

  async function handleToggleStatus(id: string, currentStatus: string) {
    const supabase = createClient()
    const newStatus = currentStatus === 'active' ? 'expired' : 'active'
    await supabase
      .from('scholarships')
      .update({ status: newStatus })
      .eq('id', id)
    fetchScholarships()
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading scholarships...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Scholarship Database ({scholarships.length})
        </h1>
      </div>

      {scholarships.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">
          No scholarships yet. Use the Ingest tool to add some.
        </p>
      ) : (
        <div className="space-y-3">
          {scholarships.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {s.name}
                    </a>
                  </CardTitle>
                  <Badge
                    variant={s.status === 'active' ? 'default' : 'secondary'}
                  >
                    {s.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-2">
                  {s.provider && <span>{s.provider}</span>}
                  {s.amount_description && <span>{s.amount_description}</span>}
                  {s.deadline && <span>Deadline: {s.deadline}</span>}
                  {s.source && <span>Source: {s.source}</span>}
                </div>
                {s.category?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {s.category.map((cat) => (
                      <Badge key={cat} variant="outline" className="text-xs">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleStatus(s.id, s.status)}
                  >
                    {s.status === 'active' ? 'Mark Expired' : 'Mark Active'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => handleDelete(s.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
