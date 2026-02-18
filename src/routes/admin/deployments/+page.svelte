<script lang="ts">
  import { Circle, Server } from 'lucide-svelte';

  interface Deployment {
    id: string;
    status: string;
    containerId: string | null;
    port: number | null;
    trigger: string;
    createdAt: string;
    project: {
      id: string;
      name: string;
      subdomain: string;
      user: { email: string };
    };
  }

  const statusColors: Record<string, string> = {
    RUNNING: 'text-green-500',
    BUILDING: 'text-yellow-500',
    DEPLOYING: 'text-blue-500',
    QUEUED: 'text-muted-foreground',
  };

  let deployments = $state<Deployment[]>([]);
  let loading = $state(true);

  $effect(() => {
    fetch('/api/admin/deployments')
      .then((r) => r.json())
      .then((data) => {
        deployments = data;
      })
      .finally(() => {
        loading = false;
      });
  });
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-foreground">
      Active Deployments
    </h1>
    <p class="text-muted-foreground mt-1">
      {deployments.length} active containers
    </p>
  </div>

  {#if loading}
    <div class="text-muted-foreground">Loading...</div>
  {:else if deployments.length === 0}
    <div class="rounded-lg border border-border bg-card p-12 text-center">
      <Server class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <p class="text-muted-foreground">No active deployments.</p>
    </div>
  {:else}
    <div class="rounded-lg border border-border bg-card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border bg-accent/50">
            <th class="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
            <th class="text-left px-4 py-3 font-medium text-muted-foreground">Project</th>
            <th class="text-left px-4 py-3 font-medium text-muted-foreground">Owner</th>
            <th class="text-left px-4 py-3 font-medium text-muted-foreground">Port</th>
            <th class="text-left px-4 py-3 font-medium text-muted-foreground">Trigger</th>
            <th class="text-left px-4 py-3 font-medium text-muted-foreground">Started</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          {#each deployments as d (d.id)}
            <tr class="hover:bg-accent/30">
              <td class="px-4 py-3">
                <span class="flex items-center gap-1.5">
                  <Circle
                    class="h-2.5 w-2.5 fill-current {statusColors[d.status] || 'text-muted-foreground'}"
                  />
                  <span class="capitalize text-foreground">
                    {d.status.toLowerCase()}
                  </span>
                </span>
              </td>
              <td class="px-4 py-3">
                <p class="font-medium text-foreground">
                  {d.project.name}
                </p>
                <p class="text-xs text-muted-foreground">
                  {d.project.subdomain}.docs.specra-docs.com
                </p>
              </td>
              <td class="px-4 py-3 text-muted-foreground">
                {d.project.user.email}
              </td>
              <td class="px-4 py-3 text-muted-foreground font-mono">
                {d.port || '\u2014'}
              </td>
              <td class="px-4 py-3 text-muted-foreground capitalize">
                {d.trigger.toLowerCase()}
              </td>
              <td class="px-4 py-3 text-muted-foreground">
                {new Date(d.createdAt).toLocaleString()}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
