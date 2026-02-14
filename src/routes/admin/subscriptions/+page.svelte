<script lang="ts">
  import { Crown, Plus, X, RefreshCw } from 'lucide-svelte';

  interface Subscription {
    id: string;
    status: string;
    paymentProvider: string;
    interval: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    grantedBy: string | null;
    grantReason: string | null;
    user: { id: string; name: string | null; email: string };
    plan: { id: string; name: string; slug: string };
  }

  interface Plan {
    id: string;
    name: string;
    slug: string;
  }

  interface UserResult {
    id: string;
    name: string | null;
    email: string;
  }

  interface PaginationData {
    page: number;
    totalPages: number;
    total: number;
  }

  const statusColors: Record<string, string> = {
    ACTIVE: 'text-green-600 bg-green-500/10',
    CANCELLED: 'text-red-600 bg-red-500/10',
    PAST_DUE: 'text-yellow-600 bg-yellow-500/10',
    TRIALING: 'text-blue-600 bg-blue-500/10',
    INCOMPLETE: 'text-muted-foreground bg-accent',
  };

  const providerColors: Record<string, string> = {
    STRIPE: 'text-purple-600 bg-purple-500/10',
    MPESA: 'text-green-600 bg-green-500/10',
    ADMIN: 'text-orange-600 bg-orange-500/10',
  };

  let subscriptions = $state<Subscription[]>([]);
  let pagination = $state<PaginationData>({ page: 1, totalPages: 1, total: 0 });
  let statusFilter = $state('');
  let providerFilter = $state('');
  let loading = $state(true);
  let showGrantModal = $state(false);
  let showChangePlanModal = $state<string | null>(null);
  let plans = $state<Plan[]>([]);
  let userResults = $state<UserResult[]>([]);
  let userSearch = $state('');
  let grantForm = $state({ userId: '', planId: '', interval: 'monthly', reason: '' });
  let changePlanForm = $state({ planId: '', reason: '' });
  let submitting = $state(false);

  function loadSubscriptions(page = 1) {
    loading = true;
    const params = new URLSearchParams({ page: String(page) });
    if (statusFilter) params.set('status', statusFilter);
    if (providerFilter) params.set('provider', providerFilter);

    fetch(`/api/admin/subscriptions?${params}`)
      .then((r) => r.json())
      .then((data) => {
        subscriptions = data.subscriptions;
        pagination = data.pagination;
      })
      .finally(() => {
        loading = false;
      });
  }

  function searchUsers(query: string) {
    if (query.length < 2) return;
    fetch(`/api/admin/users?search=${encodeURIComponent(query)}&limit=10`)
      .then((r) => r.json())
      .then((data) => {
        userResults = data.users || [];
      });
  }

  $effect(() => {
    // Reload when filters change
    statusFilter;
    providerFilter;
    loadSubscriptions();
  });

  $effect(() => {
    // Fetch plans for modals on mount
    fetch('/api/admin/subscriptions?page=1')
      .then((r) => r.json())
      .then((data) => {
        const uniquePlans = new Map<string, Plan>();
        data.subscriptions?.forEach((s: Subscription) => {
          uniquePlans.set(s.plan.id, s.plan);
        });
        if (uniquePlans.size > 0) plans = Array.from(uniquePlans.values());
      });
  });

  // Debounced user search
  $effect(() => {
    const currentSearch = userSearch;
    const timer = setTimeout(() => {
      if (currentSearch.length >= 2) searchUsers(currentSearch);
    }, 300);
    return () => clearTimeout(timer);
  });

  async function handleGrant() {
    if (!grantForm.userId || !grantForm.planId) return;
    submitting = true;
    try {
      const res = await fetch('/api/admin/subscriptions/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(grantForm),
      });
      if (res.ok) {
        showGrantModal = false;
        grantForm = { userId: '', planId: '', interval: 'monthly', reason: '' };
        loadSubscriptions();
      }
    } finally {
      submitting = false;
    }
  }

  async function handleChangePlan(subscriptionId: string) {
    if (!changePlanForm.planId) return;
    submitting = true;
    try {
      const res = await fetch(`/api/admin/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changePlanForm),
      });
      if (res.ok) {
        showChangePlanModal = null;
        changePlanForm = { planId: '', reason: '' };
        loadSubscriptions();
      }
    } finally {
      submitting = false;
    }
  }

  async function handleCancel(subscriptionId: string) {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;
    const res = await fetch(`/api/admin/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
    });
    if (res.ok) loadSubscriptions();
  }

  let availablePlans = $derived(
    plans.length > 0
      ? plans
      : [{ id: '', name: 'Select a plan', slug: '' }]
  );
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-foreground flex items-center gap-2">
        <Crown class="h-6 w-6" />
        Subscriptions
      </h1>
      <p class="text-muted-foreground mt-1">
        {pagination.total} total subscriptions
      </p>
    </div>
    <div class="flex items-center gap-3">
      <button
        onclick={() => loadSubscriptions()}
        class="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <RefreshCw class="h-4 w-4" />
      </button>
      <button
        onclick={() => { showGrantModal = true; }}
        class="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus class="h-4 w-4" />
        Grant Access
      </button>
    </div>
  </div>

  <!-- Filters -->
  <div class="flex gap-4">
    <div class="flex gap-1 rounded-md border border-border bg-card p-0.5">
      {#each ['', 'ACTIVE', 'CANCELLED', 'PAST_DUE'] as s}
        <button
          onclick={() => { statusFilter = s; }}
          class="rounded px-3 py-1 text-sm font-medium transition-colors {statusFilter === s
            ? 'bg-foreground text-background'
            : 'text-muted-foreground hover:text-foreground'}"
        >
          {s || 'All Status'}
        </button>
      {/each}
    </div>
    <div class="flex gap-1 rounded-md border border-border bg-card p-0.5">
      {#each ['', 'STRIPE', 'MPESA', 'ADMIN'] as p}
        <button
          onclick={() => { providerFilter = p; }}
          class="rounded px-3 py-1 text-sm font-medium transition-colors {providerFilter === p
            ? 'bg-foreground text-background'
            : 'text-muted-foreground hover:text-foreground'}"
        >
          {p || 'All Providers'}
        </button>
      {/each}
    </div>
  </div>

  <!-- Subscriptions table -->
  <div class="rounded-lg border border-border bg-card overflow-hidden">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-border bg-accent/50">
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Provider</th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Interval</th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Period End</th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        {#if loading}
          <tr>
            <td colspan="7" class="text-center py-8 text-muted-foreground">
              Loading...
            </td>
          </tr>
        {:else if subscriptions.length === 0}
          <tr>
            <td colspan="7" class="text-center py-8 text-muted-foreground">
              No subscriptions found.
            </td>
          </tr>
        {:else}
          {#each subscriptions as sub (sub.id)}
            <tr class="hover:bg-accent/30">
              <td class="px-4 py-3">
                <p class="font-medium text-foreground">
                  {sub.user.name || sub.user.email}
                </p>
                <p class="text-xs text-muted-foreground">{sub.user.email}</p>
              </td>
              <td class="px-4 py-3 font-medium text-foreground">{sub.plan.name}</td>
              <td class="px-4 py-3">
                <span class="text-xs rounded-full px-2 py-0.5 {providerColors[sub.paymentProvider] || ''}">
                  {sub.paymentProvider}
                </span>
                {#if sub.paymentProvider === 'ADMIN' && sub.grantReason}
                  <p class="text-xs text-muted-foreground mt-1" title={sub.grantReason}>
                    {sub.grantReason.length > 30 ? sub.grantReason.slice(0, 30) + '...' : sub.grantReason}
                  </p>
                {/if}
              </td>
              <td class="px-4 py-3">
                <span class="text-xs rounded-full px-2 py-0.5 {statusColors[sub.status] || ''}">
                  {sub.status}
                </span>
              </td>
              <td class="px-4 py-3 text-muted-foreground">{sub.interval}</td>
              <td class="px-4 py-3 text-muted-foreground">
                {new Date(sub.currentPeriodEnd).toLocaleDateString()}
              </td>
              <td class="px-4 py-3">
                {#if sub.status === 'ACTIVE'}
                  <div class="flex gap-2">
                    <button
                      onclick={() => {
                        showChangePlanModal = sub.id;
                        changePlanForm = { planId: '', reason: '' };
                      }}
                      class="text-xs rounded border border-border px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Change Plan
                    </button>
                    <button
                      onclick={() => handleCancel(sub.id)}
                      class="text-xs rounded border border-red-500/30 px-2 py-1 text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                {/if}
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Pagination -->
  {#if pagination.totalPages > 1}
    <div class="flex items-center justify-center gap-2">
      {#if pagination.page > 1}
        <button
          onclick={() => loadSubscriptions(pagination.page - 1)}
          class="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Previous
        </button>
      {/if}
      <span class="text-sm text-muted-foreground">
        Page {pagination.page} of {pagination.totalPages}
      </span>
      {#if pagination.page < pagination.totalPages}
        <button
          onclick={() => loadSubscriptions(pagination.page + 1)}
          class="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Next
        </button>
      {/if}
    </div>
  {/if}

  <!-- Grant Access Modal -->
  {#if showGrantModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-foreground">Grant Access</h2>
          <button onclick={() => { showGrantModal = false; }} class="text-muted-foreground hover:text-foreground">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-foreground mb-1">Search User</label>
            <input
              type="text"
              placeholder="Search by email..."
              bind:value={userSearch}
              class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
            {#if userResults.length > 0 && userSearch.length >= 2}
              <div class="mt-1 rounded-md border border-border bg-card max-h-32 overflow-y-auto">
                {#each userResults as u (u.id)}
                  <button
                    onclick={() => {
                      grantForm.userId = u.id;
                      userSearch = u.email;
                      userResults = [];
                    }}
                    class="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    <span class="text-foreground">{u.name || u.email}</span>
                    <span class="text-xs text-muted-foreground ml-2">{u.email}</span>
                  </button>
                {/each}
              </div>
            {/if}
          </div>

          <div>
            <label class="block text-sm font-medium text-foreground mb-1">Plan</label>
            <select
              bind:value={grantForm.planId}
              class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">Select a plan</option>
              {#each availablePlans.filter((p) => p.id) as p (p.id)}
                <option value={p.id}>{p.name}</option>
              {/each}
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-foreground mb-1">Interval</label>
            <div class="flex gap-2">
              {#each ['monthly', 'annual'] as int}
                <button
                  onclick={() => { grantForm.interval = int; }}
                  class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors {grantForm.interval === int
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border text-muted-foreground hover:text-foreground'}"
                >
                  {int.charAt(0).toUpperCase() + int.slice(1)}
                </button>
              {/each}
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-foreground mb-1">Reason (optional)</label>
            <input
              type="text"
              placeholder="e.g., Beta tester reward"
              bind:value={grantForm.reason}
              class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          <button
            onclick={handleGrant}
            disabled={submitting || !grantForm.userId || !grantForm.planId}
            class="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Granting...' : 'Grant Access'}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Change Plan Modal -->
  {#if showChangePlanModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-foreground">Change Plan</h2>
          <button onclick={() => { showChangePlanModal = null; }} class="text-muted-foreground hover:text-foreground">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-foreground mb-1">New Plan</label>
            <select
              bind:value={changePlanForm.planId}
              class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">Select a plan</option>
              {#each availablePlans.filter((p) => p.id) as p (p.id)}
                <option value={p.id}>{p.name}</option>
              {/each}
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-foreground mb-1">Reason (optional)</label>
            <input
              type="text"
              placeholder="e.g., Upgrade for support case"
              bind:value={changePlanForm.reason}
              class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          <button
            onclick={() => handleChangePlan(showChangePlanModal!)}
            disabled={submitting || !changePlanForm.planId}
            class="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Updating...' : 'Change Plan'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
