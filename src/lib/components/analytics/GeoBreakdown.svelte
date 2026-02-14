<script lang="ts">
  interface GeoEntry {
    country: string;
    visitors: number;
  }

  let { data }: { data: GeoEntry[] } = $props();
</script>

<div class="rounded-lg border border-border bg-card p-6">
  <h3 class="text-sm font-medium text-muted-foreground mb-4">
    Countries
  </h3>
  {#if data.length === 0}
    <p class="text-sm text-muted-foreground text-center py-4">
      No data
    </p>
  {:else}
    <div class="space-y-2">
      {#each data as entry}
        <div class="flex items-center justify-between text-sm">
          <span class="text-foreground">{entry.country}</span>
          <span class="text-muted-foreground">
            {entry.visitors.toLocaleString()}
          </span>
        </div>
      {/each}
    </div>
  {/if}
</div>
