"use client"

interface Page {
  path: string
  views: number
}

export function TopPages({ pages }: { pages: Page[] }) {
  const max = Math.max(...pages.map((p) => p.views), 1)

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        Top Pages
      </h3>
      {pages.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No data
        </p>
      ) : (
        <div className="space-y-3">
          {pages.map((page) => (
            <div key={page.path}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-foreground font-mono truncate max-w-[70%]">
                  {page.path}
                </span>
                <span className="text-muted-foreground">
                  {page.views.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 bg-accent rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground/30 rounded-full"
                  style={{ width: `${(page.views / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
