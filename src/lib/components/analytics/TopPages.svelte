<script lang="ts">
  interface Page {
    path: string;
    views: number;
  }

  let { pages }: { pages: Page[] } = $props();

  const max = $derived(Math.max(...pages.map((p) => p.views), 1));
</script>

<div class="rounded-lg border border-border bg-card p-6">
  <h3 class="text-sm font-medium text-muted-foreground mb-4">
    Top Pages
  </h3>
  {#if pages.length === 0}
    <p class="text-sm text-muted-foreground text-center py-4">
      No data
    </p>
  {:else}
    <div class="space-y-3">
      {#each pages as pg}
        <div>
          <div class="flex items-center justify-between text-sm mb-1">
            <span class="text-foreground font-mono truncate max-w-[70%]">
              {pg.path}
            </span>
            <span class="text-muted-foreground">
              {pg.views.toLocaleString()}
            </span>
          </div>
          <div class="h-1.5 bg-accent rounded-full overflow-hidden">
            <div
              class="h-full bg-foreground/30 rounded-full"
              style="width: {(pg.views / max) * 100}%"
            ></div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
