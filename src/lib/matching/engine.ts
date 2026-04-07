import { createServiceClient } from '@/lib/supabase/server'
import type { Student } from '@/types/student'
import type { Scholarship } from '@/types/scholarship'
import { checkEligibility } from './filters'
import { calculateScore } from './scoring'

export async function runMatchingForStudent(studentId: string) {
  const supabase = await createServiceClient()

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single()

  if (studentError || !student) {
    throw new Error(`Student not found: ${studentError?.message}`)
  }

  const { data: scholarships, error: schError } = await supabase
    .from('scholarships')
    .select('*')
    .eq('status', 'active')

  if (schError) {
    throw new Error(`Failed to fetch scholarships: ${schError.message}`)
  }

  const results = []

  for (const scholarship of (scholarships || []) as Scholarship[]) {
    const filterResult = checkEligibility(student as Student, scholarship.eligibility)
    const scoreResult = calculateScore(student as Student, scholarship)

    const matchData = {
      student_id: studentId,
      scholarship_id: scholarship.id,
      match_score: filterResult.eligible ? scoreResult.score : 0,
      eligible: filterResult.eligible,
      match_reasons: scoreResult.reasons,
      disqualifiers: filterResult.disqualifiers,
    }

    const { data, error } = await supabase
      .from('scholarship_matches')
      .upsert(matchData, {
        onConflict: 'student_id,scholarship_id',
      })
      .select()
      .single()

    if (error) {
      console.error(`Match upsert failed for scholarship ${scholarship.id}:`, error)
      continue
    }

    results.push(data)
  }

  return results
}

export async function runMatchingForScholarship(scholarshipId: string) {
  const supabase = await createServiceClient()

  const { data: scholarship, error: schError } = await supabase
    .from('scholarships')
    .select('*')
    .eq('id', scholarshipId)
    .single()

  if (schError || !scholarship) {
    throw new Error(`Scholarship not found: ${schError?.message}`)
  }

  const { data: students, error: studError } = await supabase
    .from('students')
    .select('*')

  if (studError) {
    throw new Error(`Failed to fetch students: ${studError.message}`)
  }

  for (const student of (students || []) as Student[]) {
    const filterResult = checkEligibility(student, (scholarship as Scholarship).eligibility)
    const scoreResult = calculateScore(student, scholarship as Scholarship)

    await supabase.from('scholarship_matches').upsert(
      {
        student_id: student.id,
        scholarship_id: scholarshipId,
        match_score: filterResult.eligible ? scoreResult.score : 0,
        eligible: filterResult.eligible,
        match_reasons: scoreResult.reasons,
        disqualifiers: filterResult.disqualifiers,
      },
      { onConflict: 'student_id,scholarship_id' }
    )
  }
}
