import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check if student profile exists
  const { data: student } = await supabase
    .from('students')
    .select('id, first_name')
    .eq('user_id', user.id)
    .single()

  if (!student) redirect('/onboarding')

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-bold text-lg">
              Needle in a Haystack
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm">
              <Link
                href="/dashboard"
                className="text-muted-foreground hover:text-foreground"
              >
                Overview
              </Link>
              <Link
                href="/dashboard/matches"
                className="text-muted-foreground hover:text-foreground"
              >
                Matches
              </Link>
              <Link
                href="/dashboard/saved"
                className="text-muted-foreground hover:text-foreground"
              >
                Saved
              </Link>
              <Link
                href="/dashboard/applied"
                className="text-muted-foreground hover:text-foreground"
              >
                Applied
              </Link>
              <Link
                href="/dashboard/profile"
                className="text-muted-foreground hover:text-foreground"
              >
                Profile
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {student.first_name}
            </span>
            <form
              action={async () => {
                'use server'
                const supabase = await createClient()
                await supabase.auth.signOut()
                redirect('/login')
              }}
            >
              <Button variant="ghost" size="sm" type="submit">
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
