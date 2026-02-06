"use client"

const periods = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
]

export function PeriodSelector({
  value,
  onChange,
}: {
  value: string
  onChange: (period: string) => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
      {periods.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
            value === p.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
