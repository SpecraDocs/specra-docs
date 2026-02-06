"use client"

interface DataPoint {
  date: string
  count: number
}

export function VisitorsChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">
          Visitors Over Time
        </h3>
        <p className="text-sm text-muted-foreground text-center py-8">
          No data for this period
        </p>
      </div>
    )
  }

  const max = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        Page Views Over Time
      </h3>
      <div className="flex items-end gap-1 h-40">
        {data.map((d) => {
          const height = Math.max((d.count / max) * 100, 2)
          return (
            <div
              key={d.date}
              className="flex-1 group relative"
              title={`${d.date}: ${d.count} views`}
            >
              <div
                className="bg-foreground/20 hover:bg-foreground/40 rounded-t transition-colors w-full"
                style={{ height: `${height}%` }}
              />
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {d.count} views
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  )
}
