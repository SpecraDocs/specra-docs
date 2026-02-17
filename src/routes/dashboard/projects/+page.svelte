<script lang="ts">
  import { Plus, Globe, Circle } from 'lucide-svelte';
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
      <h1 class="text-2xl font-bold text-foreground">Projects</h1>
      <p class="text-muted-foreground mt-1">
        {data.projects.length} of {data.limits.maxProjects === Infinity ? 'unlimited' : data.limits.maxProjects} projects
      </p>
    </div>
    {#if data.limits.canCreateProject}
      <a
        href={data.newProjectHref}
        class="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
      >
        <Plus class="h-4 w-4" />
        New Project
      </a>
    {/if}
  </div>

  {#if data.projects.length === 0}
    <div class="rounded-lg border border-border bg-card p-12 text-center">
      <Globe class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h2 class="text-lg font-semibold text-foreground mb-2">
        No projects yet
      </h2>
      <p class="text-muted-foreground mb-6">
        Create your first project to deploy your docs online.
      </p>
      {#if data.limits.canCreateProject}
        <a
          href={data.newProjectHref}
          class="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
        >
          <Plus class="h-4 w-4" />
          Create Project
        </a>
      {/if}
      {#if !data.limits.canDeploy}
        <p class="text-sm text-muted-foreground mt-4">
          Upgrade to a paid plan to deploy projects.
          <a href="/pricing" class="text-foreground underline">View plans</a>
        </p>
      {/if}
    </div>
  {:else}
    <div class="grid gap-4">
      {#each data.projects as project (project.id)}
        {@const status = project.latestDeployStatus as string}
        <a
          href="/dashboard/projects/{project.id}"
          class="rounded-lg border border-border bg-card p-6 hover:border-foreground/20 transition-colors"
        >
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-semibold text-foreground">
                {project.name}
              </h3>
              <p class="text-sm text-muted-foreground mt-1">
                {project.subdomain}.docs.specra.dev
                {#if project.customDomain}
                  <span class="ml-2">({project.customDomain})</span>
                {/if}
              </p>
              {#if project.organization}
                <p class="text-xs text-muted-foreground mt-1">
                  {project.organization.name}
                </p>
              {/if}
            </div>
            <div class="flex items-center gap-2 text-sm">
              <Circle
                class="h-3 w-3 fill-current {statusColors[status] || 'text-muted-foreground'}"
              />
              <span class="text-muted-foreground capitalize">
                {status === 'NO_DEPLOY' ? 'Not deployed' : status.toLowerCase()}
              </span>
            </div>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
