<script lang="ts">
  import { Plus, Building2, Users, FolderGit2 } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-foreground">Organizations</h1>
      <p class="text-muted-foreground mt-1">
        Collaborate with your team on documentation projects
      </p>
    </div>
    <a
      href="/dashboard/organizations/new"
      class="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
    >
      <Plus class="h-4 w-4" />
      New Organization
    </a>
  </div>

  {#if data.memberships.length === 0}
    <div class="rounded-lg border border-border bg-card p-12 text-center">
      <Building2 class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h2 class="text-lg font-semibold text-foreground mb-2">
        No organizations yet
      </h2>
      <p class="text-muted-foreground mb-6">
        Create an organization to collaborate with your team. Requires Pro+ plan.
      </p>
      <a
        href="/dashboard/organizations/new"
        class="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
      >
        <Plus class="h-4 w-4" />
        Create Organization
      </a>
    </div>
  {:else}
    <div class="grid gap-4">
      {#each data.memberships as m}
        <a
          href="/dashboard/organizations/{m.organization.id}"
          class="rounded-lg border border-border bg-card p-6 hover:border-foreground/20 transition-colors"
        >
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-semibold text-foreground">
                {m.organization.name}
              </h3>
              <p class="text-sm text-muted-foreground mt-1">
                {m.organization.slug} &middot;
                <span class="capitalize">{m.role.toLowerCase()}</span>
              </p>
            </div>
            <div class="flex items-center gap-4 text-sm text-muted-foreground">
              <span class="flex items-center gap-1">
                <Users class="h-3.5 w-3.5" />
                {m.organization._count.members}
              </span>
              <span class="flex items-center gap-1">
                <FolderGit2 class="h-3.5 w-3.5" />
                {m.organization._count.projects}
              </span>
            </div>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
