"use client"

interface Referrer {
  referrer: string
  count: number
}

export function Referrers({ data }: { data: Referrer[] }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        Traffic Sources
      </h3>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No referrer data
        </p>
      ) : (
        <div className="space-y-2">
          {data.map((ref) => {
            let displayName = ref.referrer
            try {
              displayName = new URL(ref.referrer).hostname
            } catch {
              // keep as-is
            }
            return (
              <div
                key={ref.referrer}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-foreground truncate max-w-[70%]">
                  {displayName}
                </span>
                <span className="text-muted-foreground">
                  {ref.count.toLocaleString()}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
