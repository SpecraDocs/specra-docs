<script lang="ts">
  import PeriodSelector from '$lib/components/analytics/PeriodSelector.svelte';
  import ProjectFilter from '$lib/components/analytics/ProjectFilter.svelte';
  import MetricsCards from '$lib/components/analytics/MetricsCards.svelte';
  import VisitorsChart from '$lib/components/analytics/VisitorsChart.svelte';
  import TopPages from '$lib/components/analytics/TopPages.svelte';
  import GeoBreakdown from '$lib/components/analytics/GeoBreakdown.svelte';
  import Referrers from '$lib/components/analytics/Referrers.svelte';
  import Devices from '$lib/components/analytics/Devices.svelte';

  interface Project {
    id: string;
    name: string;
  }

  interface AnalyticsData {
    totalViews: number;
    uniqueVisitors: number;
    avgDuration: number;
    bounceRate: number;
    topPages: Array<{ path: string; views: number }>;
    pageViews: Array<{ date: string; count: number }>;
    geo: Array<{ country: string; visitors: number }>;
    referrers: Array<{ referrer: string; count: number }>;
    devices: {
      browsers: Array<{ name: string; count: number }>;
      os: Array<{ name: string; count: number }>;
      devices: Array<{ name: string; count: number }>;
    };
  }

  let projects = $state<Project[]>([]);
  let selectedProject = $state('');
  let period = $state('7d');
  let data = $state<AnalyticsData | null>(null);
  let loading = $state(true);
  let error = $state('');

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

    fetch(`/api/analytics/${selectedProject}?period=${period}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 403 ? 'Analytics requires Starter+ plan' : 'Failed to load');
        return r.json();
      })
      .then((d) => {
        data = d;
      })
      .catch((err) => {
        error = err.message;
      })
      .finally(() => {
        loading = false;
      });
  });
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between flex-wrap gap-4">
    <div>
      <h1 class="text-2xl font-bold text-foreground">Analytics</h1>
      <p class="text-muted-foreground mt-1">
        Track visitor traffic across your docs
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
      Loading analytics...
    </div>
  {:else if projects.length === 0}
    <div class="rounded-lg border border-border bg-card p-12 text-center">
      <p class="text-muted-foreground">
        No projects found. Create a project to start tracking analytics.
      </p>
    </div>
  {:else if data}
    <div class="space-y-6">
      <MetricsCards
        totalViews={data.totalViews}
        uniqueVisitors={data.uniqueVisitors}
        avgDuration={data.avgDuration}
        bounceRate={data.bounceRate}
      />
      <VisitorsChart data={data.pageViews} />
      <div class="grid lg:grid-cols-2 gap-6">
        <TopPages pages={data.topPages} />
        <GeoBreakdown data={data.geo} />
      </div>
      <div class="grid lg:grid-cols-2 gap-6">
        <Referrers data={data.referrers} />
      </div>
      <Devices data={data.devices} />
    </div>
  {/if}
</div>
