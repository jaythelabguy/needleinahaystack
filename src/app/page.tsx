import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Needle in a Haystack</h1>
          <Link href="/login">
            <Button variant="outline">Sign In</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="container mx-auto px-4 py-16 text-center max-w-2xl">
          <h2 className="text-4xl font-bold tracking-tight mb-4">
            Find the scholarships that fit you
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Build your profile, and we&apos;ll match you with scholarships based
            on your academics, activities, interests, and goals. Powered by AI
            to surface opportunities you might miss.
          </p>
          <Link href="/login">
            <Button size="lg" className="text-lg px-8">
              Get Started
            </Button>
          </Link>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Needle in a Haystack &mdash; Scholarship Search Tool
        </div>
      </footer>
    </div>
  )
}
