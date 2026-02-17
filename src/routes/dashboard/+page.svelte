<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<div class="space-y-8">
  <div>
    <h1 class="text-2xl font-bold text-foreground">Overview</h1>
    <p class="text-muted-foreground mt-1">
      Welcome back, {data.session.user?.name || data.session.user?.email}
    </p>
  </div>

  <div class="grid md:grid-cols-3 gap-6">
    <!-- Current Plan -->
    <div class="rounded-lg border border-border bg-card p-6">
      <h3 class="text-sm font-medium text-muted-foreground">Current Plan</h3>
      <p class="mt-2 text-2xl font-bold text-foreground">
        {data.userIsAdmin ? 'Admin' : data.subscription?.plan?.name ?? 'Free'}
      </p>
      {#if data.userIsAdmin}
        <p class="mt-1 text-sm text-muted-foreground">
          Full platform access
        </p>
      {:else if data.subscription}
        <p class="mt-1 text-sm text-muted-foreground">
          {data.subscription.interval === 'ANNUAL' ? 'Annual' : 'Monthly'} billing
        </p>
      {/if}
      <a
        href="/dashboard/billing"
        class="mt-4 inline-block text-sm text-primary hover:underline"
      >
        Manage plan
      </a>
    </div>

    <!-- Projects count -->
    <div class="rounded-lg border border-border bg-card p-6">
      <h3 class="text-sm font-medium text-muted-foreground">Projects</h3>
      <p class="mt-2 text-2xl font-bold text-foreground">
        {data.projectCount}
      </p>
      <a
        href="/dashboard/projects"
        class="mt-4 inline-block text-sm text-primary hover:underline"
      >
        View projects
      </a>
    </div>

    <!-- Subscription Status -->
    <div class="rounded-lg border border-border bg-card p-6">
      <h3 class="text-sm font-medium text-muted-foreground">Status</h3>
      <div class="mt-2 flex items-center gap-2">
        <div
          class="h-2 w-2 rounded-full {!data.subscription || data.subscription.status === 'ACTIVE'
            ? 'bg-green-500'
            : data.subscription.status === 'PAST_DUE'
              ? 'bg-yellow-500'
              : 'bg-red-500'}"
        ></div>
        <span class="text-2xl font-bold text-foreground capitalize">
          {data.subscription?.status?.toLowerCase() ?? 'Active'}
        </span>
      </div>
      {#if data.subscription?.currentPeriodEnd}
        <p class="mt-1 text-sm text-muted-foreground">
          Renews {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}
        </p>
      {/if}
    </div>
  </div>

  <!-- Quick actions -->
  {#if !data.subscription && !data.userIsAdmin}
    <div class="rounded-xl border border-border bg-card p-8 text-center space-y-4">
      <h2 class="text-xl font-semibold text-foreground">
        Upgrade your plan
      </h2>
      <p class="text-muted-foreground max-w-md mx-auto">
        Get access to custom domains, advanced analytics, AI-powered search (comming soon), and more.
      </p>
      <a
        href="/pricing"
        class="inline-block rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        View Plans
      </a>
    </div>
  {/if}
</div>
