<script lang="ts">
  interface Payment {
    id: string;
    amount: number;
    currency: string;
    provider: string;
    status: string;
    createdAt: string;
    user: { name: string | null; email: string };
    subscription: { plan: { name: string } } | null;
  }

  interface Pagination {
    page: number;
    totalPages: number;
    total: number;
  }

  const statusColors: Record<string, string> = {
    COMPLETED: 'text-green-600 bg-green-500/10',
    PENDING: 'text-yellow-600 bg-yellow-500/10',
    FAILED: 'text-red-600 bg-red-500/10',
    REFUNDED: 'text-muted-foreground bg-accent',
  };

  let payments = $state<Payment[]>([]);
  let pagination = $state<Pagination>({ page: 1, totalPages: 1, total: 0 });
  let filter = $state('');
  let loading = $state(true);

  function loadPayments(page = 1) {
    loading = true;
    const params = new URLSearchParams({ page: String(page) });
    if (filter) params.set('provider', filter);

    fetch(`/api/admin/payments?${params}`)
      .then((r) => r.json())
      .then((data) => {
        payments = data.payments;
        pagination = data.pagination;
      })
      .finally(() => {
        loading = false;
      });
  }

  $effect(() => {
    filter;
    loadPayments();
  });

  function formatAmount(amount: number, currency: string) {
    if (currency === 'KES') return `KES ${amount.toLocaleString()}`;
    return `$${(amount / 100).toFixed(2)}`;
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-foreground">Payments</h1>
      <p class="text-muted-foreground mt-1">
        {pagination.total} total payments
      </p>
    </div>
    <div class="flex gap-1 rounded-md border border-border bg-card p-0.5">
      {#each ['', 'STRIPE', 'MPESA'] as p}
        <button
          onclick={() => { filter = p; }}
          class="rounded px-3 py-1 text-sm font-medium transition-colors {filter === p
            ? 'bg-foreground text-background'
            : 'text-muted-foreground hover:text-foreground'}"
        >
          {p || 'All'}
        </button>
      {/each}
    </div>
  </div>

  <div class="rounded-lg border border-border bg-card overflow-hidden">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-border bg-accent/50">
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Provider</th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        {#if loading}
          <tr>
            <td colspan="6" class="text-center py-8 text-muted-foreground">
              Loading...
            </td>
          </tr>
        {:else if payments.length === 0}
          <tr>
            <td colspan="6" class="text-center py-8 text-muted-foreground">
              No payments found.
            </td>
          </tr>
        {:else}
          {#each payments as payment (payment.id)}
            <tr class="hover:bg-accent/30">
              <td class="px-4 py-3">
                <p class="font-medium text-foreground">
                  {payment.user.name || payment.user.email}
                </p>
                <p class="text-xs text-muted-foreground">
                  {payment.user.email}
                </p>
              </td>
              <td class="px-4 py-3 text-muted-foreground">
                {payment.subscription?.plan.name || '\u2014'}
              </td>
              <td class="px-4 py-3 font-medium text-foreground">
                {formatAmount(payment.amount, payment.currency)}
              </td>
              <td class="px-4 py-3 text-muted-foreground">
                {payment.provider}
              </td>
              <td class="px-4 py-3">
                <span
                  class="text-xs rounded-full px-2 py-0.5 {statusColors[payment.status] || 'text-muted-foreground'}"
                >
                  {payment.status}
                </span>
              </td>
              <td class="px-4 py-3 text-muted-foreground">
                {new Date(payment.createdAt).toLocaleDateString()}
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  {#if pagination.totalPages > 1}
    <div class="flex items-center justify-center gap-2">
      {#if pagination.page > 1}
        <button
          onclick={() => loadPayments(pagination.page - 1)}
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
          onclick={() => loadPayments(pagination.page + 1)}
          class="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Next
        </button>
      {/if}
    </div>
  {/if}
</div>
