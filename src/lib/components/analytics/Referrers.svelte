<script lang="ts">
  interface Referrer {
    referrer: string;
    count: number;
  }

  let { data }: { data: Referrer[] } = $props();

  function getDisplayName(referrer: string): string {
    try {
      return new URL(referrer).hostname;
    } catch {
      return referrer;
    }
  }
</script>

<div class="rounded-lg border border-border bg-card p-6">
  <h3 class="text-sm font-medium text-muted-foreground mb-4">
    Traffic Sources
  </h3>
  {#if data.length === 0}
    <p class="text-sm text-muted-foreground text-center py-4">
      No referrer data
    </p>
  {:else}
    <div class="space-y-2">
      {#each data as ref}
        <div class="flex items-center justify-between text-sm">
          <span class="text-foreground truncate max-w-[70%]">
            {getDisplayName(ref.referrer)}
          </span>
          <span class="text-muted-foreground">
            {ref.count.toLocaleString()}
          </span>
        </div>
      {/each}
    </div>
  {/if}
</div>
