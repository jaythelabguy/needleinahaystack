import { Badge } from '@/components/ui/badge'

export function MatchBadge({ score, eligible }: { score: number; eligible: boolean }) {
  if (!eligible) {
    return <Badge variant="outline" className="text-muted-foreground">Ineligible</Badge>
  }

  if (score >= 90) {
    return <Badge className="bg-green-600 hover:bg-green-700">Excellent</Badge>
  }
  if (score >= 70) {
    return <Badge className="bg-blue-600 hover:bg-blue-700">Good</Badge>
  }
  if (score >= 50) {
    return <Badge className="bg-yellow-600 hover:bg-yellow-700">Fair</Badge>
  }
  return <Badge variant="secondary">Low</Badge>
}
