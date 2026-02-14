<script lang="ts">
  import { page } from '$app/stores';
  import { ArrowLeft } from 'lucide-svelte';
  import PeriodSelector from '$lib/components/analytics/PeriodSelector.svelte';
  import MetricsCards from '$lib/components/analytics/MetricsCards.svelte';
  import VisitorsChart from '$lib/components/analytics/VisitorsChart.svelte';
  import TopPages from '$lib/components/analytics/TopPages.svelte';
  import GeoBreakdown from '$lib/components/analytics/GeoBreakdown.svelte';
  import Referrers from '$lib/components/analytics/Referrers.svelte';
  import Devices from '$lib/components/analytics/Devices.svelte';

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

  const projectId = $derived($page.params.projectId);
  let period = $state('7d');
  let data = $state<AnalyticsData | null>(null);
  let loading = $state(true);
  let error = $state('');
  let projectName = $state('');

  $effect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((p) => {
        projectName = p.name;
      });
  });

  $effect(() => {
    loading = true;
    error = '';

    fetch(`/api/analytics/${projectId}?period=${period}`)
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
      <a
        href="/dashboard/projects/{projectId}"
        class="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        <ArrowLeft class="h-3 w-3" />
        {projectName || 'Project'}
      </a>
      <h1 class="text-2xl font-bold text-foreground">Analytics</h1>
    </div>
    <PeriodSelector value={period} onChange={(p) => (period = p)} />
  </div>

  {#if error}
    <div class="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      {error}
    </div>
  {:else if loading}
    <div class="text-muted-foreground text-center py-12">
      Loading analytics...
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
