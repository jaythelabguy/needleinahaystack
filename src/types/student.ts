export interface Extracurricular {
  name: string
  role: string
  years: number
  description: string
}

export interface Award {
  name: string
  year: number
  description: string
}

export interface WorkExperience {
  employer: string
  role: string
  dates: string
  description: string
}

export interface Student {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string | null
  date_of_birth: string | null
  graduation_year: number
  gpa: number | null
  sat_score: number | null
  act_score: number | null
  state: string | null
  city: string | null
  ethnicity: string[]
  gender: string | null
  citizenship: string
  financial_need: boolean
  intended_major: string | null
  intended_school: string | null
  extracurriculars: Extracurricular[]
  sports: string[]
  awards: Award[]
  volunteer_hours: number | null
  work_experience: WorkExperience[]
  interests: string[]
  essay_topics: string[]
  notes: string | null
  created_at: string
  updated_at: string
}

export type StudentInsert = Omit<Student, 'id' | 'created_at' | 'updated_at'>
export type StudentUpdate = Partial<StudentInsert>
