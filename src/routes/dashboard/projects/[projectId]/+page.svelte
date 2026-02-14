<script lang="ts">
  import {
    Globe,
    ExternalLink,
    Circle,
    GitBranch,
    Clock,
    Rocket,
  } from 'lucide-svelte';
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
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-foreground">{data.project.name}</h1>
      {#if data.project.organization}
        <p class="text-sm text-muted-foreground">
          {data.project.organization.name}
        </p>
      {/if}
    </div>
    <div class="flex items-center gap-3">
      <a
        href="/dashboard/projects/{data.project.id}/settings"
        class="rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        Settings
      </a>
    </div>
  </div>

  <!-- URLs -->
  <div class="rounded-lg border border-border bg-card p-6 space-y-3">
    <h2 class="text-sm font-medium text-muted-foreground uppercase tracking-wide">
      Site URL
    </h2>
    <div class="flex items-center gap-3">
      <Globe class="h-4 w-4 text-muted-foreground" />
      <a
        href={data.siteUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="text-foreground hover:underline flex items-center gap-1"
      >
        {data.project.subdomain}.{data.baseDomain}
        <ExternalLink class="h-3 w-3" />
      </a>
      {#if data.isRunning}
        <span class="ml-auto flex items-center gap-1.5 text-sm text-green-500">
          <Circle class="h-2.5 w-2.5 fill-current" />
          Live
        </span>
      {/if}
    </div>
    {#if data.project.customDomain}
      <div class="flex items-center gap-3">
        <Globe class="h-4 w-4 text-muted-foreground" />
        <a
          href="https://{data.project.customDomain}"
          target="_blank"
          rel="noopener noreferrer"
          class="text-foreground hover:underline flex items-center gap-1"
        >
          {data.project.customDomain}
          <ExternalLink class="h-3 w-3" />
        </a>
      </div>
    {/if}
    {#if data.project.githubRepo}
      <div class="flex items-center gap-3">
        <GitBranch class="h-4 w-4 text-muted-foreground" />
        <span class="text-sm text-muted-foreground">
          {data.project.githubRepo} ({data.project.githubBranch})
        </span>
      </div>
    {/if}
  </div>

  <!-- Quick Actions -->
  <div class="grid sm:grid-cols-3 gap-4">
    <a
      href="/dashboard/projects/{data.project.id}/deployments"
      class="rounded-lg border border-border bg-card p-4 hover:border-foreground/20 transition-colors"
    >
      <Rocket class="h-5 w-5 text-muted-foreground mb-2" />
      <p class="font-medium text-foreground text-sm">Deployments</p>
      <p class="text-xs text-muted-foreground mt-0.5">
        {data.project.deployments.length} total
      </p>
    </a>
    <a
      href="/dashboard/projects/{data.project.id}/analytics"
      class="rounded-lg border border-border bg-card p-4 hover:border-foreground/20 transition-colors"
    >
      <Clock class="h-5 w-5 text-muted-foreground mb-2" />
      <p class="font-medium text-foreground text-sm">Analytics</p>
      <p class="text-xs text-muted-foreground mt-0.5">View traffic</p>
    </a>
    <a
      href="/dashboard/projects/{data.project.id}/settings"
      class="rounded-lg border border-border bg-card p-4 hover:border-foreground/20 transition-colors"
    >
      <Globe class="h-5 w-5 text-muted-foreground mb-2" />
      <p class="font-medium text-foreground text-sm">Domain</p>
      <p class="text-xs text-muted-foreground mt-0.5">
        {data.project.customDomain || 'Set up custom domain'}
      </p>
    </a>
  </div>

  <!-- Recent Deployments -->
  <div class="rounded-lg border border-border bg-card">
    <div class="px-6 py-4 border-b border-border flex items-center justify-between">
      <h2 class="font-semibold text-foreground">Recent Deployments</h2>
      <a
        href="/dashboard/projects/{data.project.id}/deployments"
        class="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        View all
      </a>
    </div>
    {#if data.project.deployments.length === 0}
      <div class="p-6 text-center text-sm text-muted-foreground">
        No deployments yet. Deploy using the CLI or connect a GitHub repo.
      </div>
    {:else}
      <div class="divide-y divide-border">
        {#each data.project.deployments as deploy (deploy.id)}
          <div class="px-6 py-3 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <Circle
                class="h-2.5 w-2.5 fill-current {statusColors[deploy.status]}"
              />
              <span class="text-sm text-foreground capitalize">
                {deploy.status.toLowerCase()}
              </span>
              {#if deploy.commitSha}
                <code class="text-xs text-muted-foreground bg-accent px-1.5 py-0.5 rounded">
                  {deploy.commitSha.slice(0, 7)}
                </code>
              {/if}
            </div>
            <div class="flex items-center gap-3 text-xs text-muted-foreground">
              <span class="capitalize">{deploy.trigger.toLowerCase()}</span>
              <span>{new Date(deploy.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
