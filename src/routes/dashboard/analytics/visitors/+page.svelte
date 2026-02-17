<script lang="ts">
  import PeriodSelector from '$lib/components/analytics/PeriodSelector.svelte';
  import ProjectFilter from '$lib/components/analytics/ProjectFilter.svelte';
  import { Github } from 'lucide-svelte';

  interface Project {
    id: string;
    name: string;
  }

  interface PageAccess {
    path: string;
    version: string;
    visitedAt: string;
  }

  interface Visitor {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    provider: string;
    pageCount: number;
    lastVisit: string;
    pages: PageAccess[];
  }

  let projects = $state<Project[]>([]);
  let selectedProject = $state('');
  let period = $state('30d');
  let visitors = $state<Visitor[]>([]);
  let loading = $state(true);
  let error = $state('');
  let expandedVisitor = $state<string | null>(null);

  $effect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((p: Project[]) => {
        projects = p;
        if (p.length > 0) {
          selectedProject = p[0].id;
        } else {
          loading = false;
        }
      });
  });

  $effect(() => {
    if (!selectedProject) return;

    loading = true;
    error = '';

    fetch(`/api/analytics/${selectedProject}/visitors?period=${period}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 403 ? 'Analytics requires Starter+ plan' : 'Failed to load');
        return r.json();
      })
      .then((d) => {
        visitors = d.visitors;
      })
      .catch((err) => {
        error = err.message;
      })
      .finally(() => {
        loading = false;
      });
  });

  function toggleVisitor(id: string) {
    expandedVisitor = expandedVisitor === id ? null : id;
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between flex-wrap gap-4">
    <div>
      <div class="flex items-center gap-4 mb-1">
        <a href="/dashboard/analytics" class="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Traffic
        </a>
        <span class="text-sm font-medium text-foreground border-b-2 border-primary pb-0.5">
          Page Visitors
        </span>
      </div>
      <h1 class="text-2xl font-bold text-foreground">Page Visitors</h1>
      <p class="text-muted-foreground mt-1">
        See who accessed your protected documentation pages
      </p>
    </div>
    <div class="flex items-center gap-3">
      {#if projects.length > 0}
        <ProjectFilter
          {projects}
          value={selectedProject}
          onChange={(id) => (selectedProject = id)}
        />
      {/if}
      <PeriodSelector value={period} onChange={(p) => (period = p)} />
    </div>
  </div>

  {#if error}
    <div class="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      {error}
    </div>
  {/if}

  {#if loading}
    <div class="text-muted-foreground text-center py-12">
      Loading visitors...
    </div>
  {:else if projects.length === 0}
    <div class="rounded-lg border border-border bg-card p-12 text-center">
      <p class="text-muted-foreground">
        No projects found. Create a project to start tracking visitors.
      </p>
    </div>
  {:else if visitors.length === 0}
    <div class="rounded-lg border border-border bg-card p-12 text-center">
      <p class="text-muted-foreground">
        No visitors recorded for this period. Protected pages will log visitors after they sign in.
      </p>
    </div>
  {:else}
    <div class="rounded-lg border border-border bg-card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border bg-muted/50">
            <th class="text-left px-4 py-3 font-medium text-muted-foreground">Visitor</th>
            <th class="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
            <th class="text-left px-4 py-3 font-medium text-muted-foreground">Provider</th>
            <th class="text-left px-4 py-3 font-medium text-muted-foreground">Pages</th>
            <th class="text-left px-4 py-3 font-medium text-muted-foreground">Last Visit</th>
          </tr>
        </thead>
        <tbody>
          {#each visitors as visitor (visitor.id)}
            <tr
              class="border-b border-border hover:bg-accent/30 cursor-pointer transition-colors"
              onclick={() => toggleVisitor(visitor.id)}
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  {#if visitor.image}
                    <img
                      src={visitor.image}
                      alt=""
                      class="h-8 w-8 rounded-full"
                    />
                  {:else}
                    <div class="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                      {(visitor.name || visitor.email)[0]?.toUpperCase()}
                    </div>
                  {/if}
                  <span class="font-medium text-foreground">
                    {visitor.name || 'Anonymous'}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 text-muted-foreground">{visitor.email}</td>
              <td class="px-4 py-3">
                {#if visitor.provider === 'github'}
                  <div class="flex items-center gap-1.5 text-muted-foreground">
                    <Github class="h-4 w-4" />
                    GitHub
                  </div>
                {:else}
                  <div class="flex items-center gap-1.5 text-muted-foreground">
                    <svg class="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Google
                  </div>
                {/if}
              </td>
              <td class="px-4 py-3 text-muted-foreground">{visitor.pageCount}</td>
              <td class="px-4 py-3 text-muted-foreground">{formatDate(visitor.lastVisit)}</td>
            </tr>
            {#if expandedVisitor === visitor.id}
              <tr>
                <td colspan="5" class="px-4 py-3 bg-muted/30">
                  <div class="space-y-1">
                    <p class="text-xs font-medium text-muted-foreground mb-2">Pages accessed:</p>
                    {#each visitor.pages as page}
                      <div class="flex items-center justify-between text-xs">
                        <span class="text-foreground font-mono">/{page.path}</span>
                        <span class="text-muted-foreground">{formatDate(page.visitedAt)}</span>
                      </div>
                    {/each}
                  </div>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
