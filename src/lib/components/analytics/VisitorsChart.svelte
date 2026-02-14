<script lang="ts">
  interface DataPoint {
    date: string;
    count: number;
  }

  let { data }: { data: DataPoint[] } = $props();

  const max = $derived(Math.max(...data.map((d) => d.count), 1));
</script>

<div class="rounded-lg border border-border bg-card p-6">
  <h3 class="text-sm font-medium text-muted-foreground mb-4">
    {data.length === 0 ? 'Visitors Over Time' : 'Page Views Over Time'}
  </h3>
  {#if data.length === 0}
    <p class="text-sm text-muted-foreground text-center py-8">
      No data for this period
    </p>
  {:else}
    <div class="flex items-end gap-1 h-40">
      {#each data as d}
        {@const height = Math.max((d.count / max) * 100, 2)}
        <div
          class="flex-1 group relative"
          title="{d.date}: {d.count} views"
        >
          <div
            class="bg-foreground/20 hover:bg-foreground/40 rounded-t transition-colors w-full"
            style="height: {height}%"
          ></div>
          <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {d.count} views
          </div>
        </div>
      {/each}
    </div>
    <div class="flex justify-between mt-2 text-xs text-muted-foreground">
      <span>{data[0]?.date}</span>
      <span>{data[data.length - 1]?.date}</span>
    </div>
  {/if}
</div>
