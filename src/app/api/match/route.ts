import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runMatchingForStudent } from '@/lib/matching/engine'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { student_id } = body

  if (!student_id) {
    return NextResponse.json({ error: 'student_id required' }, { status: 400 })
  }

  // Verify the student belongs to this user
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('id', student_id)
    .eq('user_id', user.id)
    .single()

  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  try {
    const results = await runMatchingForStudent(student_id)
    return NextResponse.json({
      matched: results.length,
      eligible: results.filter((r) => r.eligible).length,
    })
  } catch (error) {
    console.error('Matching error:', error)
    return NextResponse.json({ error: 'Matching failed' }, { status: 500 })
  }
}
