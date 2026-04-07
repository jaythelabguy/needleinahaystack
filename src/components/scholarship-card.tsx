'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MatchBadge } from './match-badge'
import { DeadlineCountdown } from './deadline-countdown'
import type { MatchWithScholarship, MatchStatus } from '@/types/match'

interface ScholarshipCardProps {
  match: MatchWithScholarship
  onUpdateStatus: (matchId: string, status: MatchStatus) => void
}

function formatAmount(min: number | null, max: number | null, desc: string | null): string {
  if (desc) return desc
  if (min && max && min !== max) {
    return `$${(min / 100).toLocaleString()} - $${(max / 100).toLocaleString()}`
  }
  if (max) return `$${(max / 100).toLocaleString()}`
  if (min) return `$${(min / 100).toLocaleString()}`
  return 'Amount varies'
}

export function ScholarshipCard({ match, onUpdateStatus }: ScholarshipCardProps) {
  const s = match.scholarship

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-lg leading-tight">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {s.name}
              </a>
            </CardTitle>
            {s.provider && (
              <p className="text-sm text-muted-foreground">{s.provider}</p>
            )}
          </div>
          <MatchBadge score={match.match_score} eligible={match.eligible} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="font-medium">
            {formatAmount(s.amount_min, s.amount_max, s.amount_description)}
          </span>
          <span className="text-muted-foreground">|</span>
          <DeadlineCountdown deadline={s.deadline} />
          {s.renewable && (
            <>
              <span className="text-muted-foreground">|</span>
              <span className="text-green-600 text-sm">Renewable</span>
            </>
          )}
        </div>

        {s.category?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {s.category.map((cat) => (
              <Badge key={cat} variant="secondary" className="text-xs">
                {cat}
              </Badge>
            ))}
          </div>
        )}

        {s.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {s.description}
          </p>
        )}

        {match.match_reasons?.length > 0 && (
          <div className="text-sm">
            <span className="font-medium">Why it matches: </span>
            {match.match_reasons.join(', ')}
          </div>
        )}

        {!match.eligible && match.disqualifiers?.length > 0 && (
          <div className="text-sm text-destructive">
            <span className="font-medium">Issues: </span>
            {match.disqualifiers.join(', ')}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {match.status !== 'saved' && match.status !== 'applied' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdateStatus(match.id, 'saved')}
            >
              Save
            </Button>
          )}
          {match.status !== 'applied' && (
            <Button
              size="sm"
              onClick={() => onUpdateStatus(match.id, 'applied')}
            >
              Mark Applied
            </Button>
          )}
          {match.status !== 'dismissed' && match.status !== 'applied' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdateStatus(match.id, 'dismissed')}
            >
              Dismiss
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
