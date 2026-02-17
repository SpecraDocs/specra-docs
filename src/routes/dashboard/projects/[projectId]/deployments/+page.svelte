<script lang="ts">
  import { Circle, ArrowLeft, RotateCcw, Info } from 'lucide-svelte';
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

  let rollingBackId = $state<string | null>(null);
  let rollbackError = $state<string | null>(null);

  async function rollback(deploymentId: string) {
    if (!confirm('Roll back to this deployment? This will create a new deployment from the saved archive.')) {
      return;
    }

    rollingBackId = deploymentId;
    rollbackError = null;

    try {
      const res = await fetch(
        `/api/projects/${data.project.id}/deployments/${deploymentId}/rollback`,
        { method: 'POST' }
      );

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Rollback failed');
      }

      window.location.reload();
    } catch (err) {
      rollbackError = err instanceof Error ? err.message : 'Rollback failed';
    } finally {
      rollingBackId = null;
    }
  }
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

  {#if data.versionHistoryDays > 0}
    <div class="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
      <Info class="h-4 w-4 shrink-0" />
      <span>
        Showing deployments from the last {data.versionHistoryDays} day{data.versionHistoryDays === 1 ? '' : 's'}.
        <a href="/dashboard/billing" class="text-foreground underline underline-offset-2 hover:text-primary">
          Upgrade for longer history.
        </a>
      </span>
    </div>
  {/if}

  {#if rollbackError}
    <div class="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {rollbackError}
    </div>
  {/if}

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
            <div class="flex items-center gap-4">
              {#if deploy.archivePath && deploy.status !== 'RUNNING' && deploy.status !== 'BUILDING' && deploy.status !== 'DEPLOYING' && deploy.status !== 'QUEUED'}
                <button
                  onclick={() => rollback(deploy.id)}
                  disabled={rollingBackId !== null}
                  class="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Rollback to this version"
                >
                  <RotateCcw class="h-3 w-3 {rollingBackId === deploy.id ? 'animate-spin' : ''}" />
                  {rollingBackId === deploy.id ? 'Rolling back...' : 'Rollback'}
                </button>
              {/if}
              <div class="text-right">
                <p class="text-xs text-muted-foreground capitalize">
                  {deploy.trigger.toLowerCase()}
                </p>
                <p class="text-xs text-muted-foreground">
                  {new Date(deploy.createdAt).toLocaleString()}
                </p>
              </div>
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
