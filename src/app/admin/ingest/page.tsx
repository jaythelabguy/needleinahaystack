'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ExtractedScholarship {
  name: string
  provider: string | null
  amount_min: number | null
  amount_max: number | null
  amount_description: string | null
  deadline: string | null
  url: string
  description: string | null
  eligibility: Record<string, unknown>
  requirements: string[]
  renewable: boolean
  renewable_details: string | null
  category: string[]
  source: string
  source_id: string
  status: string
}

export default function IngestPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [extracted, setExtracted] = useState<ExtractedScholarship | null>(null)
  const [confidence, setConfidence] = useState(0)
  const [editJson, setEditJson] = useState('')
  const [success, setSuccess] = useState('')

  async function handleExtract() {
    setLoading(true)
    setError('')
    setExtracted(null)
    setSuccess('')

    try {
      const res = await fetch('/api/scholarships/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Extraction failed')
        return
      }

      setExtracted(data.scholarship)
      setConfidence(data.confidence)
      setEditJson(JSON.stringify(data.scholarship, null, 2))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const scholarship = JSON.parse(editJson)
      const supabase = createClient()

      const { error: insertError } = await supabase
        .from('scholarships')
        .insert(scholarship)

      if (insertError) {
        setError(insertError.message)
        return
      }

      setSuccess('Scholarship saved successfully!')
      setExtracted(null)
      setEditJson('')
      setUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Scholarship Ingestion</h1>

      <Card>
        <CardHeader>
          <CardTitle>Extract from URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="url">Scholarship URL</Label>
            <div className="flex gap-2">
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/scholarship"
              />
              <Button onClick={handleExtract} disabled={loading || !url}>
                {loading ? 'Extracting...' : 'Extract'}
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}
        </CardContent>
      </Card>

      {extracted && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Extracted Data</span>
              <span className="text-sm font-normal text-muted-foreground">
                Confidence: {(confidence * 100).toFixed(0)}%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Review and edit the extracted JSON before saving:</Label>
              <Textarea
                value={editJson}
                onChange={(e) => setEditJson(e.target.value)}
                rows={20}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Scholarship'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setExtracted(null)
                  setEditJson('')
                }}
              >
                Discard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
