<script lang="ts">
  interface Project {
    id: string;
    name: string;
  }

  let {
    projects,
    value,
    onChange,
  }: {
    projects: Project[];
    value: string;
    onChange: (projectId: string) => void;
  } = $props();
</script>

<select
  {value}
  onchange={(e) => onChange((e.target as HTMLSelectElement).value)}
  class="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
>
  {#each projects as p}
    <option value={p.id}>{p.name}</option>
  {/each}
</select>
