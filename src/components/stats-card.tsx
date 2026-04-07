import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface StatsCardProps {
  totalMatches: number
  eligibleMatches: number
  saved: number
  applied: number
  totalPotential: number
}

function formatAmount(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function StatsCard({
  totalMatches,
  eligibleMatches,
  saved,
  applied,
  totalPotential,
}: StatsCardProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Matches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalMatches}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Eligible
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{eligibleMatches}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Saved
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{saved}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Applied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{applied}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Potential
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {totalPotential > 0 ? formatAmount(totalPotential) : '$0'}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
