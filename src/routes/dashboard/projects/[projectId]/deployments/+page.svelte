<script lang="ts">
  import { Circle, ArrowLeft } from 'lucide-svelte';
  import type { PageData } from './$types';

  const statusColors: Record<string, string> = {
    RUNNING: 'text-green-500',
    BUILDING: 'text-yellow-500',
    DEPLOYING: 'text-blue-500',
    QUEUED: 'text-muted-foreground',
    STOPPED: 'text-muted-foreground',
    FAILED: 'text-destructive',
  };

  let { data }: { data: PageData } = $props();
</script>

<div class="space-y-6">
  <div>
    <a
      href="/dashboard/projects/{data.project.id}"
      class="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
    >
      <ArrowLeft class="h-3 w-3" />
      {data.project.name}
    </a>
    <h1 class="text-2xl font-bold text-foreground">Deployments</h1>
  </div>

  <div class="rounded-lg border border-border bg-card">
    {#if data.deployments.length === 0}
      <div class="p-6 text-center text-sm text-muted-foreground">
        No deployments yet.
      </div>
    {:else}
      <div class="divide-y divide-border">
        {#each data.deployments as deploy (deploy.id)}
          <div class="px-6 py-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <Circle
                class="h-3 w-3 fill-current {statusColors[deploy.status]}"
              />
              <div>
                <p class="text-sm font-medium text-foreground capitalize">
                  {deploy.status.toLowerCase()}
                </p>
                <p class="text-xs text-muted-foreground mt-0.5">
                  {deploy.id.slice(0, 8)}
                  {#if deploy.commitSha}
                    &middot; {deploy.commitSha.slice(0, 7)}
                  {/if}
                </p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-xs text-muted-foreground capitalize">
                {deploy.trigger.toLowerCase()}
              </p>
              <p class="text-xs text-muted-foreground">
                {new Date(deploy.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  {#if data.totalPages > 1}
    <div class="flex items-center justify-center gap-2">
      {#if data.page > 1}
        <a
          href="/dashboard/projects/{data.project.id}/deployments?page={data.page - 1}"
          class="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Previous
        </a>
      {/if}
      <span class="text-sm text-muted-foreground">
        Page {data.page} of {data.totalPages}
      </span>
      {#if data.page < data.totalPages}
        <a
          href="/dashboard/projects/{data.project.id}/deployments?page={data.page + 1}"
          class="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Next
        </a>
      {/if}
    </div>
  {/if}
</div>
