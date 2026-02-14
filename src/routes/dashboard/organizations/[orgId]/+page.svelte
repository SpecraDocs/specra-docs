<script lang="ts">
  import { Circle, Users, Settings, FolderGit2 } from 'lucide-svelte';
  import type { PageData } from './$types';

  const statusColors: Record<string, string> = {
    RUNNING: 'text-green-500',
    STOPPED: 'text-muted-foreground',
    FAILED: 'text-destructive',
  };

  let { data }: { data: PageData } = $props();
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-foreground">{data.org.name}</h1>
      <p class="text-sm text-muted-foreground mt-1">
        {data.org.slug} &middot;
        <span class="capitalize">{data.membership.role.toLowerCase()}</span>
      </p>
    </div>
    <div class="flex items-center gap-2">
      <a
        href="/dashboard/organizations/{data.org.id}/members"
        class="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <Users class="h-4 w-4" />
        Members ({data.org._count.members})
      </a>
      {#if data.membership.role !== 'MEMBER'}
        <a
          href="/dashboard/organizations/{data.org.id}/settings"
          class="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings class="h-4 w-4" />
          Settings
        </a>
      {/if}
    </div>
  </div>

  <!-- Projects -->
  <div class="rounded-lg border border-border bg-card">
    <div class="px-6 py-4 border-b border-border flex items-center justify-between">
      <h2 class="font-semibold text-foreground">Projects</h2>
      <a
        href="/dashboard/projects/new?orgId={data.org.id}"
        class="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        New project
      </a>
    </div>
    {#if data.org.projects.length === 0}
      <div class="p-6 text-center text-sm text-muted-foreground">
        No projects in this organization yet.
      </div>
    {:else}
      <div class="divide-y divide-border">
        {#each data.org.projects as project}
          <a
            href="/dashboard/projects/{project.id}"
            class="flex items-center justify-between px-6 py-3 hover:bg-accent/50 transition-colors"
          >
            <div class="flex items-center gap-3">
              <FolderGit2 class="h-4 w-4 text-muted-foreground" />
              <div>
                <p class="text-sm font-medium text-foreground">
                  {project.name}
                </p>
                <p class="text-xs text-muted-foreground">
                  {project.subdomain}.docs.specra.dev
                </p>
              </div>
            </div>
            <Circle
              class="h-2.5 w-2.5 fill-current {project.hasRunningDeployment
                ? statusColors.RUNNING
                : statusColors.STOPPED}"
            />
          </a>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Recent Members -->
  <div class="rounded-lg border border-border bg-card">
    <div class="px-6 py-4 border-b border-border flex items-center justify-between">
      <h2 class="font-semibold text-foreground">Members</h2>
      <a
        href="/dashboard/organizations/{data.org.id}/members"
        class="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        View all
      </a>
    </div>
    <div class="divide-y divide-border">
      {#each data.org.members as m}
        <div class="flex items-center justify-between px-6 py-3">
          <div>
            <p class="text-sm font-medium text-foreground">
              {m.user.name || m.user.email}
            </p>
            <p class="text-xs text-muted-foreground">{m.user.email}</p>
          </div>
          <span class="text-xs text-muted-foreground capitalize rounded-full border border-border px-2 py-0.5">
            {m.role.toLowerCase()}
          </span>
        </div>
      {/each}
    </div>
  </div>
</div>
