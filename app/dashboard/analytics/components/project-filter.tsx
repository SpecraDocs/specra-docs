"use client"

interface Project {
  id: string
  name: string
}

export function ProjectFilter({
  projects,
  value,
  onChange,
}: {
  projects: Project[]
  value: string
  onChange: (projectId: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
    >
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  )
}
