'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

const STEPS = ['Personal', 'Academic', 'Activities', 'Preferences']

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV',
  'NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN',
  'TX','UT','VT','VA','WA','WV','WI','WY','DC',
]

interface FormData {
  first_name: string
  last_name: string
  email: string
  date_of_birth: string
  state: string
  city: string
  gender: string
  ethnicity: string[]
  citizenship: string
  graduation_year: number
  gpa: string
  sat_score: string
  act_score: string
  intended_major: string
  intended_school: string
  sports: string
  volunteer_hours: string
  interests: string
  essay_topics: string
  financial_need: boolean
  notes: string
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const [form, setForm] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    date_of_birth: '',
    state: '',
    city: '',
    gender: '',
    ethnicity: [],
    citizenship: 'US',
    graduation_year: new Date().getFullYear() + 1,
    gpa: '',
    sat_score: '',
    act_score: '',
    intended_major: '',
    intended_school: '',
    sports: '',
    volunteer_hours: '',
    interests: '',
    essay_topics: '',
    financial_need: false,
    notes: '',
  })

  function updateField(field: keyof FormData, value: string | boolean | number | string[]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    const payload = {
      user_id: user.id,
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email || null,
      date_of_birth: form.date_of_birth || null,
      graduation_year: form.graduation_year,
      gpa: form.gpa ? parseFloat(form.gpa) : null,
      sat_score: form.sat_score ? parseInt(form.sat_score) : null,
      act_score: form.act_score ? parseInt(form.act_score) : null,
      state: form.state || null,
      city: form.city || null,
      ethnicity: form.ethnicity,
      gender: form.gender || null,
      citizenship: form.citizenship,
      financial_need: form.financial_need,
      intended_major: form.intended_major || null,
      intended_school: form.intended_school || null,
      sports: form.sports
        ? form.sports.split(',').map((s) => s.trim())
        : [],
      volunteer_hours: form.volunteer_hours
        ? parseInt(form.volunteer_hours)
        : null,
      interests: form.interests
        ? form.interests.split(',').map((s) => s.trim())
        : [],
      essay_topics: form.essay_topics
        ? form.essay_topics.split(',').map((s) => s.trim())
        : [],
      notes: form.notes || null,
      extracurriculars: [],
      awards: [],
      work_experience: [],
    }

    const { data: student, error: insertError } = await supabase
      .from('students')
      .insert(payload)
      .select('id')
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    // Trigger matching engine for the new profile
    fetch('/api/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: student.id }),
    }).catch(() => {
      // Non-blocking — matches will be generated in background
    })

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Set Up Your Profile</CardTitle>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              {STEPS.map((s, i) => (
                <span
                  key={s}
                  className={i === step ? 'font-semibold text-foreground' : ''}
                >
                  {s}
                </span>
              ))}
            </div>
            <Progress value={((step + 1) / STEPS.length) * 100} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={form.first_name}
                    onChange={(e) => updateField('first_name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={form.last_name}
                    onChange={(e) => updateField('last_name', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => updateField('date_of_birth', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="state">State</Label>
                  <select
                    id="state"
                    value={form.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  >
                    <option value="">Select state</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  value={form.gender}
                  onChange={(e) => updateField('gender', e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                >
                  <option value="">Select</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
              <div>
                <Label htmlFor="citizenship">Citizenship</Label>
                <select
                  id="citizenship"
                  value={form.citizenship}
                  onChange={(e) => updateField('citizenship', e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                >
                  <option value="US">US Citizen</option>
                  <option value="permanent_resident">Permanent Resident</option>
                  <option value="international">International</option>
                </select>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <Label htmlFor="grad_year">Graduation Year *</Label>
                <Input
                  id="grad_year"
                  type="number"
                  value={form.graduation_year}
                  onChange={(e) =>
                    updateField('graduation_year', parseInt(e.target.value))
                  }
                  min={2024}
                  max={2035}
                />
              </div>
              <div>
                <Label htmlFor="gpa">GPA (on 4.0 scale)</Label>
                <Input
                  id="gpa"
                  type="number"
                  step="0.01"
                  max="4.00"
                  min="0"
                  value={form.gpa}
                  onChange={(e) => updateField('gpa', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sat">SAT Score</Label>
                  <Input
                    id="sat"
                    type="number"
                    max="1600"
                    min="400"
                    value={form.sat_score}
                    onChange={(e) => updateField('sat_score', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="act">ACT Score</Label>
                  <Input
                    id="act"
                    type="number"
                    max="36"
                    min="1"
                    value={form.act_score}
                    onChange={(e) => updateField('act_score', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="major">Intended Major</Label>
                <Input
                  id="major"
                  value={form.intended_major}
                  onChange={(e) => updateField('intended_major', e.target.value)}
                  placeholder="e.g., Nursing"
                />
              </div>
              <div>
                <Label htmlFor="school">Intended School</Label>
                <Input
                  id="school"
                  value={form.intended_school}
                  onChange={(e) =>
                    updateField('intended_school', e.target.value)
                  }
                  placeholder="e.g., Creighton University"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <Label htmlFor="sports">
                  Sports (comma-separated)
                </Label>
                <Input
                  id="sports"
                  value={form.sports}
                  onChange={(e) => updateField('sports', e.target.value)}
                  placeholder="e.g., Track and Field, Swimming"
                />
              </div>
              <div>
                <Label htmlFor="volunteer">Volunteer Hours</Label>
                <Input
                  id="volunteer"
                  type="number"
                  value={form.volunteer_hours}
                  onChange={(e) =>
                    updateField('volunteer_hours', e.target.value)
                  }
                />
              </div>
              <p className="text-sm text-muted-foreground">
                You can add detailed extracurriculars, awards, and work
                experience from your profile page after completing setup.
              </p>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <Label htmlFor="interests">
                  Interests (comma-separated)
                </Label>
                <Input
                  id="interests"
                  value={form.interests}
                  onChange={(e) => updateField('interests', e.target.value)}
                  placeholder="e.g., healthcare, community service, faith"
                />
              </div>
              <div>
                <Label htmlFor="essay_topics">
                  Essay Topics (comma-separated)
                </Label>
                <Input
                  id="essay_topics"
                  value={form.essay_topics}
                  onChange={(e) => updateField('essay_topics', e.target.value)}
                  placeholder="e.g., leadership, overcoming adversity"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="financial_need"
                  checked={form.financial_need}
                  onCheckedChange={(checked) =>
                    updateField('financial_need', !!checked)
                  }
                />
                <Label htmlFor="financial_need">
                  I have demonstrated financial need
                </Label>
              </div>
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Anything else we should know..."
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
            >
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 0 && (!form.first_name || !form.last_name)}
              >
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Saving...' : 'Complete Setup'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
