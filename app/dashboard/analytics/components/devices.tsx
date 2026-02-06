"use client"

interface DeviceData {
  browsers: Array<{ name: string; count: number }>
  os: Array<{ name: string; count: number }>
  devices: Array<{ name: string; count: number }>
}

function BreakdownList({
  title,
  items,
}: {
  title: string
  items: Array<{ name: string; count: number }>
}) {
  const total = items.reduce((acc, i) => acc + i.count, 0) || 1

  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => (
            <div key={item.name}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">{item.name}</span>
                <span className="text-muted-foreground">
                  {Math.round((item.count / total) * 100)}%
                </span>
              </div>
              <div className="h-1 bg-accent rounded-full overflow-hidden mt-0.5">
                <div
                  className="h-full bg-foreground/30 rounded-full"
                  style={{ width: `${(item.count / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function Devices({ data }: { data: DeviceData }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-6">
      <h3 className="text-sm font-medium text-muted-foreground">
        Devices & Browsers
      </h3>
      <div className="grid sm:grid-cols-3 gap-6">
        <BreakdownList title="Browsers" items={data.browsers} />
        <BreakdownList title="Operating Systems" items={data.os} />
        <BreakdownList title="Device Type" items={data.devices} />
      </div>
    </div>
  )
}
