<script lang="ts">
  interface DeviceData {
    browsers: Array<{ name: string; count: number }>;
    os: Array<{ name: string; count: number }>;
    devices: Array<{ name: string; count: number }>;
  }

  let { data }: { data: DeviceData } = $props();
</script>

{#snippet breakdownList(title: string, items: Array<{ name: string; count: number }>)}
  {@const total = items.reduce((acc, i) => acc + i.count, 0) || 1}
  <div>
    <h4 class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
      {title}
    </h4>
    {#if items.length === 0}
      <p class="text-sm text-muted-foreground">No data</p>
    {:else}
      <div class="space-y-1.5">
        {#each items as item}
          <div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-foreground">{item.name}</span>
              <span class="text-muted-foreground">
                {Math.round((item.count / total) * 100)}%
              </span>
            </div>
            <div class="h-1 bg-accent rounded-full overflow-hidden mt-0.5">
              <div
                class="h-full bg-foreground/30 rounded-full"
                style="width: {(item.count / total) * 100}%"
              ></div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/snippet}

<div class="rounded-lg border border-border bg-card p-6 space-y-6">
  <h3 class="text-sm font-medium text-muted-foreground">
    Devices & Browsers
  </h3>
  <div class="grid sm:grid-cols-3 gap-6">
    {@render breakdownList('Browsers', data.browsers)}
    {@render breakdownList('Operating Systems', data.os)}
    {@render breakdownList('Device Type', data.devices)}
  </div>
</div>
