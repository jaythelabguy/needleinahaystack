import type { Student } from '@/types/student'
import type { ScholarshipEligibility } from '@/types/scholarship'

export interface FilterResult {
  eligible: boolean
  disqualifiers: string[]
}

export function checkEligibility(
  student: Student,
  eligibility: ScholarshipEligibility
): FilterResult {
  const disqualifiers: string[] = []

  if (eligibility.gpa_min != null && student.gpa != null) {
    if (student.gpa < eligibility.gpa_min) {
      disqualifiers.push(`GPA ${student.gpa} below minimum ${eligibility.gpa_min}`)
    }
  }

  if (eligibility.states?.length && student.state) {
    if (!eligibility.states.includes(student.state)) {
      disqualifiers.push(`State ${student.state} not in eligible states: ${eligibility.states.join(', ')}`)
    }
  }

  if (eligibility.citizenship?.length) {
    if (!eligibility.citizenship.includes(student.citizenship)) {
      disqualifiers.push(`Citizenship ${student.citizenship} not eligible`)
    }
  }

  if (eligibility.majors?.length && student.intended_major) {
    const majorMatch = eligibility.majors.some(
      (m) => m.toLowerCase() === student.intended_major!.toLowerCase()
    )
    if (!majorMatch) {
      disqualifiers.push(`Major ${student.intended_major} not in eligible majors: ${eligibility.majors.join(', ')}`)
    }
  }

  if (eligibility.gender && student.gender) {
    if (eligibility.gender.toLowerCase() !== student.gender.toLowerCase()) {
      disqualifiers.push(`Gender requirement: ${eligibility.gender}`)
    }
  }

  if (eligibility.graduation_years?.length) {
    if (!eligibility.graduation_years.includes(student.graduation_year)) {
      disqualifiers.push(`Graduation year ${student.graduation_year} not eligible`)
    }
  }

  if (eligibility.min_sat != null && student.sat_score != null) {
    if (student.sat_score < eligibility.min_sat) {
      disqualifiers.push(`SAT score ${student.sat_score} below minimum ${eligibility.min_sat}`)
    }
  }

  if (eligibility.min_act != null && student.act_score != null) {
    if (student.act_score < eligibility.min_act) {
      disqualifiers.push(`ACT score ${student.act_score} below minimum ${eligibility.min_act}`)
    }
  }

  if (eligibility.financial_need && !student.financial_need) {
    disqualifiers.push('Financial need required')
  }

  if (eligibility.ethnicities?.length && student.ethnicity?.length) {
    const hasMatch = student.ethnicity.some((e) =>
      eligibility.ethnicities!.some(
        (re) => re.toLowerCase() === e.toLowerCase()
      )
    )
    if (!hasMatch) {
      disqualifiers.push(`Ethnicity requirement not met`)
    }
  }

  if (eligibility.schools?.length && student.intended_school) {
    const schoolMatch = eligibility.schools.some(
      (s) => s.toLowerCase() === student.intended_school!.toLowerCase()
    )
    if (!schoolMatch) {
      disqualifiers.push(`School ${student.intended_school} not in eligible schools`)
    }
  }

  return {
    eligible: disqualifiers.length === 0,
    disqualifiers,
  }
}
