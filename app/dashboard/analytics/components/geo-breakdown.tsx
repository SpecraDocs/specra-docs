"use client"

interface GeoEntry {
  country: string
  visitors: number
}

export function GeoBreakdown({ data }: { data: GeoEntry[] }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        Countries
      </h3>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No data
        </p>
      ) : (
        <div className="space-y-2">
          {data.map((entry) => (
            <div
              key={entry.country}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-foreground">{entry.country}</span>
              <span className="text-muted-foreground">
                {entry.visitors.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
