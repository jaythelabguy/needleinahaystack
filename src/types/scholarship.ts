export interface ScholarshipEligibility {
  gpa_min?: number
  states?: string[]
  citizenship?: string[]
  majors?: string[]
  gender?: string
  ethnicities?: string[]
  graduation_years?: number[]
  sports?: string[]
  financial_need?: boolean
  schools?: string[]
  min_sat?: number
  min_act?: number
  custom?: string[]
}

export interface Scholarship {
  id: string
  name: string
  provider: string | null
  amount_min: number | null
  amount_max: number | null
  amount_description: string | null
  deadline: string | null
  url: string
  description: string | null
  eligibility: ScholarshipEligibility
  requirements: string[]
  renewable: boolean
  renewable_details: string | null
  category: string[]
  source: string | null
  source_id: string | null
  status: 'active' | 'expired' | 'unknown'
  last_verified_at: string | null
  created_at: string
  updated_at: string
}

export type ScholarshipInsert = Omit<Scholarship, 'id' | 'created_at' | 'updated_at'>
export type ScholarshipUpdate = Partial<ScholarshipInsert>
