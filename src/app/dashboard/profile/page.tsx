'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Student } from '@/types/student'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV',
  'NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN',
  'TX','UT','VT','VA','WA','WV','WI','WY','DC',
]

export default function ProfilePage() {
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const fetchProfile = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', user.id)
      .single()

    setStudent(data as Student | null)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  async function handleSave() {
    if (!student) return
    setSaving(true)
    setMessage('')

    const supabase = createClient()
    const { error } = await supabase
      .from('students')
      .update({
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        date_of_birth: student.date_of_birth,
        graduation_year: student.graduation_year,
        gpa: student.gpa,
        sat_score: student.sat_score,
        act_score: student.act_score,
        state: student.state,
        city: student.city,
        gender: student.gender,
        ethnicity: student.ethnicity,
        citizenship: student.citizenship,
        financial_need: student.financial_need,
        intended_major: student.intended_major,
        intended_school: student.intended_school,
        sports: student.sports,
        volunteer_hours: student.volunteer_hours,
        interests: student.interests,
        essay_topics: student.essay_topics,
        notes: student.notes,
      })
      .eq('id', student.id)

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setMessage('Profile updated successfully')
    }
    setSaving(false)
    router.refresh()
  }

  function update(field: keyof Student, value: unknown) {
    setStudent((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading profile...</div>
  }

  if (!student) {
    return <div>No profile found.</div>
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Edit Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First Name</Label>
              <Input
                value={student.first_name}
                onChange={(e) => update('first_name', e.target.value)}
              />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input
                value={student.last_name}
                onChange={(e) => update('last_name', e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Gender</Label>
            <select
              value={student.gender || ''}
              onChange={(e) => update('gender', e.target.value || null)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              <option value="">Select</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="non-binary">Non-binary</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>
          <div>
            <Label>Ethnicity (comma-separated)</Label>
            <Input
              defaultValue={student.ethnicity?.join(', ') || ''}
              onBlur={(e) =>
                update(
                  'ethnicity',
                  e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                )
              }
              placeholder="e.g., Native Hawaiian, Pacific Islander"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>State</Label>
              <select
                value={student.state || ''}
                onChange={(e) => update('state', e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                <option value="">Select</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>City</Label>
              <Input
                value={student.city || ''}
                onChange={(e) => update('city', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Academic</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Graduation Year</Label>
              <Input
                type="number"
                value={student.graduation_year}
                onChange={(e) =>
                  update('graduation_year', parseInt(e.target.value))
                }
              />
            </div>
            <div>
              <Label>GPA</Label>
              <Input
                type="number"
                step="0.01"
                value={student.gpa || ''}
                onChange={(e) =>
                  update('gpa', e.target.value ? parseFloat(e.target.value) : null)
                }
              />
            </div>
            <div>
              <Label>SAT</Label>
              <Input
                type="number"
                value={student.sat_score || ''}
                onChange={(e) =>
                  update(
                    'sat_score',
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Intended Major</Label>
              <Input
                value={student.intended_major || ''}
                onChange={(e) => update('intended_major', e.target.value)}
              />
            </div>
            <div>
              <Label>Intended School</Label>
              <Input
                value={student.intended_school || ''}
                onChange={(e) => update('intended_school', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activities & Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Sports (comma-separated)</Label>
            <Input
              defaultValue={student.sports?.join(', ') || ''}
              onBlur={(e) =>
                update(
                  'sports',
                  e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                )
              }
            />
          </div>
          <div>
            <Label>Interests (comma-separated)</Label>
            <Input
              defaultValue={student.interests?.join(', ') || ''}
              onBlur={(e) =>
                update(
                  'interests',
                  e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                )
              }
            />
          </div>
          <div>
            <Label>Essay Topics (comma-separated)</Label>
            <Input
              defaultValue={student.essay_topics?.join(', ') || ''}
              onBlur={(e) =>
                update(
                  'essay_topics',
                  e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                )
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={student.financial_need}
              onCheckedChange={(checked) =>
                update('financial_need', !!checked)
              }
            />
            <Label>Demonstrated financial need</Label>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={student.notes || ''}
              onChange={(e) => update('notes', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {message && (
        <p
          className={`text-sm ${message.startsWith('Error') ? 'text-destructive' : 'text-green-600'}`}
        >
          {message}
        </p>
      )}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Profile'}
      </Button>
    </div>
  )
}
