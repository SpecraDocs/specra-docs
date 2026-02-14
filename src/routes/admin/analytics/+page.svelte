<script lang="ts">
  import { Eye, Users } from 'lucide-svelte';

  interface AnalyticsData {
    last30Days: { totalViews: number; uniqueVisitors: number };
    last7Days: { totalViews: number; uniqueVisitors: number };
    topProjects: Array<{
      project: { id: string; name: string; subdomain: string } | null;
      views: number;
    }>;
  }

  let data = $state<AnalyticsData | null>(null);
  let loading = $state(true);

  $effect(() => {
    fetch('/api/admin/analytics')
      .then((r) => r.json())
      .then((result) => {
        data = result;
      })
      .finally(() => {
        loading = false;
      });
  });
</script>

{#if loading}
  <div class="text-muted-foreground">Loading...</div>
{:else if data}
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-foreground">
        Platform Analytics
      </h1>
      <p class="text-muted-foreground mt-1">
        Aggregated traffic across all hosted docs
      </p>
    </div>

    <!-- Traffic Overview -->
    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="rounded-lg border border-border bg-card p-5">
        <div class="flex items-center gap-2 text-muted-foreground mb-2">
          <Eye class="h-4 w-4" />
          <span class="text-xs font-medium">Views (7d)</span>
        </div>
        <p class="text-2xl font-bold text-foreground">
          {data.last7Days.totalViews.toLocaleString()}
        </p>
      </div>
      <div class="rounded-lg border border-border bg-card p-5">
        <div class="flex items-center gap-2 text-muted-foreground mb-2">
          <Users class="h-4 w-4" />
          <span class="text-xs font-medium">Visitors (7d)</span>
        </div>
        <p class="text-2xl font-bold text-foreground">
          {data.last7Days.uniqueVisitors.toLocaleString()}
        </p>
      </div>
      <div class="rounded-lg border border-border bg-card p-5">
        <div class="flex items-center gap-2 text-muted-foreground mb-2">
          <Eye class="h-4 w-4" />
          <span class="text-xs font-medium">Views (30d)</span>
        </div>
        <p class="text-2xl font-bold text-foreground">
          {data.last30Days.totalViews.toLocaleString()}
        </p>
      </div>
      <div class="rounded-lg border border-border bg-card p-5">
        <div class="flex items-center gap-2 text-muted-foreground mb-2">
          <Users class="h-4 w-4" />
          <span class="text-xs font-medium">Visitors (30d)</span>
        </div>
        <p class="text-2xl font-bold text-foreground">
          {data.last30Days.uniqueVisitors.toLocaleString()}
        </p>
      </div>
    </div>

    <!-- Top Projects -->
    <div class="rounded-lg border border-border bg-card p-6">
      <h2 class="text-lg font-semibold text-foreground mb-4">
        Top Projects by Traffic (30 days)
      </h2>
      {#if data.topProjects.length === 0}
        <p class="text-sm text-muted-foreground text-center py-4">
          No traffic data yet.
        </p>
      {:else}
        <div class="space-y-3">
          {#each data.topProjects as entry, i}
            {@const max = data.topProjects[0]?.views || 1}
            <div>
              <div class="flex items-center justify-between text-sm mb-1">
                <span class="text-foreground">
                  {entry.project?.name || 'Unknown'}
                  {' '}
                  <span class="text-muted-foreground">
                    ({entry.project?.subdomain}.docs.specra.dev)
                  </span>
                </span>
                <span class="text-muted-foreground">
                  {entry.views.toLocaleString()} views
                </span>
              </div>
              <div class="h-1.5 bg-accent rounded-full overflow-hidden">
                <div
                  class="h-full bg-foreground/30 rounded-full"
                  style="width: {(entry.views / max) * 100}%"
                ></div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}
