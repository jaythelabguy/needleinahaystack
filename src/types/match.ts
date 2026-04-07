export interface ScholarshipMatch {
  id: string
  student_id: string
  scholarship_id: string
  match_score: number
  eligible: boolean
  match_reasons: string[]
  disqualifiers: string[]
  status: 'new' | 'saved' | 'applied' | 'dismissed'
  applied_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type MatchStatus = ScholarshipMatch['status']

export interface MatchWithScholarship extends ScholarshipMatch {
  scholarship: {
    id: string
    name: string
    provider: string | null
    amount_min: number | null
    amount_max: number | null
    amount_description: string | null
    deadline: string | null
    url: string
    description: string | null
    category: string[]
    requirements: string[]
    renewable: boolean
  }
}
