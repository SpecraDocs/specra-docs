<script lang="ts">
  import {
    DollarSign,
    Users,
    Server,
    Eye,
    TrendingDown,
    UserPlus,
  } from 'lucide-svelte';

  interface Stats {
    mrr: number;
    churnRate: number;
    totalUsers: number;
    newUsers: number;
    activeDeployments: number;
    traffic: { totalViews: number; uniqueVisitors: number };
    revenue: {
      stripe: { revenue: number; count: number };
      mpesa: { revenue: number; count: number };
    };
  }

  function formatCents(cents: number) {
    return `$${(cents / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  let stats = $state<Stats | null>(null);
  let loading = $state(true);

  const kpiIcons = {
    'Monthly Recurring Revenue': DollarSign,
    'Total Users': Users,
    'New Users (30d)': UserPlus,
    'Churn Rate (30d)': TrendingDown,
    'Active Deployments': Server,
    'Page Views (30d)': Eye,
  };

  $effect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((data) => {
        stats = data;
      })
      .finally(() => {
        loading = false;
      });
  });

  let kpis = $derived(
    stats
      ? [
          { label: 'Monthly Recurring Revenue', value: formatCents(stats.mrr), icon: DollarSign },
          { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users },
          { label: 'New Users (30d)', value: stats.newUsers.toLocaleString(), icon: UserPlus },
          { label: 'Churn Rate (30d)', value: `${stats.churnRate}%`, icon: TrendingDown },
          { label: 'Active Deployments', value: stats.activeDeployments.toLocaleString(), icon: Server },
          { label: 'Page Views (30d)', value: stats.traffic.totalViews.toLocaleString(), icon: Eye },
        ]
      : []
  );
</script>

{#if loading}
  <div class="text-muted-foreground">Loading admin data...</div>
{:else if stats}
  <div class="space-y-8">
    <div>
      <h1 class="text-2xl font-bold text-foreground">Admin Dashboard</h1>
      <p class="text-muted-foreground mt-1">
        Platform overview and key metrics
      </p>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {#each kpis as kpi}
        <div class="rounded-lg border border-border bg-card p-5">
          <div class="flex items-center gap-2 text-muted-foreground mb-2">
            <svelte:component this={kpi.icon} class="h-4 w-4" />
            <span class="text-xs font-medium">{kpi.label}</span>
          </div>
          <p class="text-2xl font-bold text-foreground">{kpi.value}</p>
        </div>
      {/each}
    </div>

    <!-- Revenue by Provider -->
    <div class="rounded-lg border border-border bg-card p-6">
      <h2 class="text-lg font-semibold text-foreground mb-4">
        Revenue by Provider
      </h2>
      <div class="grid sm:grid-cols-2 gap-4">
        <div class="rounded-md border border-border p-4">
          <p class="text-sm text-muted-foreground mb-1">Stripe</p>
          <p class="text-xl font-bold text-foreground">
            {formatCents(stats.revenue.stripe.revenue)}
          </p>
          <p class="text-xs text-muted-foreground mt-1">
            {stats.revenue.stripe.count} payments
          </p>
        </div>
        <div class="rounded-md border border-border p-4">
          <p class="text-sm text-muted-foreground mb-1">M-Pesa</p>
          <p class="text-xl font-bold text-foreground">
            KES {stats.revenue.mpesa.revenue.toLocaleString()}
          </p>
          <p class="text-xs text-muted-foreground mt-1">
            {stats.revenue.mpesa.count} payments
          </p>
        </div>
      </div>
    </div>

    <!-- Traffic Summary -->
    <div class="rounded-lg border border-border bg-card p-6">
      <h2 class="text-lg font-semibold text-foreground mb-4">
        Platform Traffic (30 days)
      </h2>
      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <p class="text-sm text-muted-foreground">Total Page Views</p>
          <p class="text-xl font-bold text-foreground">
            {stats.traffic.totalViews.toLocaleString()}
          </p>
        </div>
        <div>
          <p class="text-sm text-muted-foreground">Unique Visitors</p>
          <p class="text-xl font-bold text-foreground">
            {stats.traffic.uniqueVisitors.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  </div>
{/if}
