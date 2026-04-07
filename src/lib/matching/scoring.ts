import type { Student } from '@/types/student'
import type { Scholarship } from '@/types/scholarship'

export interface ScoreResult {
  score: number
  reasons: string[]
}

export function calculateScore(
  student: Student,
  scholarship: Scholarship
): ScoreResult {
  let score = 0
  const reasons: string[] = []
  const elig = scholarship.eligibility

  // Major alignment: +25 exact match, +10 related field
  if (student.intended_major && (elig.majors?.length || scholarship.category?.length)) {
    const majorLower = student.intended_major.toLowerCase()
    const exactMajor = elig.majors?.some(
      (m) => m.toLowerCase() === majorLower
    )
    const categoryMatch = scholarship.category?.some(
      (c) => c.toLowerCase() === majorLower
    )

    if (exactMajor) {
      score += 25
      reasons.push(`Exact major match: ${student.intended_major}`)
    } else if (categoryMatch) {
      score += 10
      reasons.push(`Related field match via category`)
    } else {
      // Check for related fields
      const relatedFields: Record<string, string[]> = {
        nursing: ['health sciences', 'healthcare', 'pre-med', 'biology', 'stem'],
        'health sciences': ['nursing', 'pre-med', 'biology'],
        'computer science': ['stem', 'engineering', 'technology'],
      }
      const related = relatedFields[majorLower] || []
      const allTargets = [...(elig.majors || []), ...(scholarship.category || [])]
      const hasRelated = allTargets.some((t) =>
        related.includes(t.toLowerCase())
      )
      if (hasRelated) {
        score += 10
        reasons.push(`Related field match`)
      }
    }
  }

  // Location match: +15 if state matches
  if (student.state && elig.states?.length) {
    if (elig.states.includes(student.state)) {
      score += 15
      reasons.push(`State match: ${student.state}`)
    }
  }

  // School-specific: +20
  if (student.intended_school && elig.schools?.length) {
    if (
      elig.schools.some(
        (s) => s.toLowerCase() === student.intended_school!.toLowerCase()
      )
    ) {
      score += 20
      reasons.push(`School-specific: ${student.intended_school}`)
    }
  }

  // Sport match: +10
  if (student.sports?.length && elig.sports?.length) {
    const sportMatch = student.sports.some((s) =>
      elig.sports!.some((es) => es.toLowerCase() === s.toLowerCase())
    )
    if (sportMatch) {
      score += 10
      reasons.push(`Sport match`)
    }
  }

  // Ethnicity match: +15
  if (student.ethnicity?.length && elig.ethnicities?.length) {
    const ethnicityMatch = student.ethnicity.some((e) =>
      elig.ethnicities!.some((ee) => ee.toLowerCase() === e.toLowerCase())
    )
    if (ethnicityMatch) {
      score += 15
      reasons.push(`Ethnicity match`)
    }
  }

  // Financial need alignment: +10
  if (student.financial_need && elig.financial_need) {
    score += 10
    reasons.push(`Financial need alignment`)
  }

  // Extracurricular alignment: +10 (keyword matching)
  if (student.extracurriculars?.length && scholarship.description) {
    const descLower = scholarship.description.toLowerCase()
    const hasMatch = student.extracurriculars.some(
      (ec) =>
        descLower.includes(ec.name.toLowerCase()) ||
        descLower.includes(ec.role.toLowerCase())
    )
    if (hasMatch) {
      score += 10
      reasons.push(`Extracurricular alignment`)
    }
  }

  // Interest/essay topic alignment: +10
  if (
    (student.interests?.length || student.essay_topics?.length) &&
    scholarship.description
  ) {
    const descLower = scholarship.description.toLowerCase()
    const allTopics = [
      ...(student.interests || []),
      ...(student.essay_topics || []),
    ]
    const hasMatch = allTopics.some((t) => descLower.includes(t.toLowerCase()))
    if (hasMatch) {
      score += 10
      reasons.push(`Interest/essay topic alignment`)
    }
  }

  return { score: Math.min(score, 100), reasons }
}
