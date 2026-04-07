export function DeadlineCountdown({ deadline }: { deadline: string | null }) {
  if (!deadline) {
    return <span className="text-sm text-muted-foreground">No deadline</span>
  }

  const deadlineDate = new Date(deadline)
  const now = new Date()
  const diffMs = deadlineDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return <span className="text-sm text-muted-foreground line-through">Expired</span>
  }

  let colorClass = 'text-muted-foreground'
  if (diffDays <= 7) colorClass = 'text-red-600 font-semibold'
  else if (diffDays <= 30) colorClass = 'text-yellow-600 font-medium'

  return (
    <span className={`text-sm ${colorClass}`}>
      {diffDays === 0
        ? 'Due today'
        : diffDays === 1
          ? '1 day left'
          : `${diffDays} days left`}
    </span>
  )
}
