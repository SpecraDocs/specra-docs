<script lang="ts">
  import { Tag, Plus, X } from 'lucide-svelte';

  interface Coupon {
    id: string;
    code: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    currency: string | null;
    maxUses: number | null;
    currentUses: number;
    expiresAt: string | null;
    active: boolean;
    applicablePlans: string[];
    createdAt: string;
  }

  interface Pagination {
    page: number;
    totalPages: number;
    total: number;
  }

  let coupons = $state<Coupon[]>([]);
  let pagination = $state<Pagination>({ page: 1, totalPages: 1, total: 0 });
  let loading = $state(true);
  let showCreateModal = $state(false);
  let submitting = $state(false);
  let form = $state({
    code: '',
    type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    value: '',
    currency: 'USD',
    maxUses: '',
    expiresAt: '',
    applicablePlans: '',
  });

  function loadCoupons(page = 1) {
    loading = true;
    fetch(`/api/admin/coupons?page=${page}`)
      .then((r) => r.json())
      .then((data) => {
        coupons = data.coupons;
        pagination = data.pagination;
      })
      .finally(() => {
        loading = false;
      });
  }

  $effect(() => {
    loadCoupons();
  });

  async function handleCreate() {
    if (!form.code || !form.value) return;
    submitting = true;
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code,
          type: form.type,
          value: parseInt(form.value),
          currency: form.type === 'FIXED' ? form.currency : undefined,
          maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
          expiresAt: form.expiresAt || undefined,
          applicablePlans: form.applicablePlans
            ? form.applicablePlans.split(',').map((s) => s.trim())
            : [],
        }),
      });
      if (res.ok) {
        showCreateModal = false;
        form = { code: '', type: 'PERCENTAGE', value: '', currency: 'USD', maxUses: '', expiresAt: '', applicablePlans: '' };
        loadCoupons();
      }
    } finally {
      submitting = false;
    }
  }

  async function toggleActive(couponId: string, active: boolean) {
    await fetch(`/api/admin/coupons/${couponId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    });
    loadCoupons(pagination.page);
  }

  async function handleDelete(couponId: string) {
    if (!confirm('Are you sure you want to deactivate this coupon?')) return;
    await fetch(`/api/admin/coupons/${couponId}`, { method: 'DELETE' });
    loadCoupons(pagination.page);
  }

  function formatValue(coupon: Coupon) {
    if (coupon.type === 'PERCENTAGE') return `${coupon.value}%`;
    if (coupon.currency === 'KES') return `KES ${coupon.value}`;
    return `$${(coupon.value / 100).toFixed(2)}`;
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-foreground flex items-center gap-2">
        <Tag class="h-6 w-6" />
        Coupons
      </h1>
      <p class="text-muted-foreground mt-1">{pagination.total} total coupons</p>
    </div>
    <button
      onclick={() => { showCreateModal = true; }}
      class="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
    >
      <Plus class="h-4 w-4" />
      Create Coupon
    </button>
  </div>

  <div class="rounded-lg border border-border bg-card overflow-hidden">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-border bg-accent/50">
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Value</th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Uses</th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Expires</th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        {#if loading}
          <tr>
            <td colspan="7" class="text-center py-8 text-muted-foreground">Loading...</td>
          </tr>
        {:else if coupons.length === 0}
          <tr>
            <td colspan="7" class="text-center py-8 text-muted-foreground">No coupons found.</td>
          </tr>
        {:else}
          {#each coupons as coupon (coupon.id)}
            <tr class="hover:bg-accent/30">
              <td class="px-4 py-3 font-mono font-medium text-foreground">{coupon.code}</td>
              <td class="px-4 py-3 text-muted-foreground">{coupon.type}</td>
              <td class="px-4 py-3 font-medium text-foreground">{formatValue(coupon)}</td>
              <td class="px-4 py-3 text-muted-foreground">
                {coupon.currentUses}{coupon.maxUses ? ` / ${coupon.maxUses}` : ''}
              </td>
              <td class="px-4 py-3 text-muted-foreground">
                {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'Never'}
              </td>
              <td class="px-4 py-3">
                <span class="text-xs rounded-full px-2 py-0.5 {coupon.active
                  ? 'text-green-600 bg-green-500/10'
                  : 'text-red-600 bg-red-500/10'}">
                  {coupon.active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-2">
                  <button
                    onclick={() => toggleActive(coupon.id, coupon.active)}
                    class="text-xs rounded border border-border px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {coupon.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onclick={() => handleDelete(coupon.id)}
                    class="text-xs rounded border border-red-500/30 px-2 py-1 text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    Delete
                  </button>
                </div>
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
          onclick={() => loadCoupons(pagination.page - 1)}
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
          onclick={() => loadCoupons(pagination.page + 1)}
          class="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Next
        </button>
      {/if}
    </div>
  {/if}

  <!-- Create Coupon Modal -->
  {#if showCreateModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-foreground">Create Coupon</h2>
          <button onclick={() => { showCreateModal = false; }} class="text-muted-foreground hover:text-foreground">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-foreground mb-1">Code</label>
            <input
              type="text"
              placeholder="e.g., WELCOME20"
              bind:value={form.code}
              oninput={(e) => { form.code = (e.target as HTMLInputElement).value.toUpperCase(); }}
              class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground font-mono"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-foreground mb-1">Type</label>
            <div class="flex gap-2">
              {#each ['PERCENTAGE', 'FIXED'] as t}
                <button
                  onclick={() => { form.type = t as 'PERCENTAGE' | 'FIXED'; }}
                  class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors {form.type === t
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border text-muted-foreground hover:text-foreground'}"
                >
                  {t === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'}
                </button>
              {/each}
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-foreground mb-1">
              Value {form.type === 'PERCENTAGE' ? '(0-100%)' : '(in smallest currency unit)'}
            </label>
            <input
              type="number"
              placeholder={form.type === 'PERCENTAGE' ? 'e.g., 20' : 'e.g., 500'}
              bind:value={form.value}
              class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          {#if form.type === 'FIXED'}
            <div>
              <label class="block text-sm font-medium text-foreground mb-1">Currency</label>
              <select
                bind:value={form.currency}
                class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="USD">USD</option>
                <option value="KES">KES</option>
              </select>
            </div>
          {/if}

          <div>
            <label class="block text-sm font-medium text-foreground mb-1">Max Uses (optional)</label>
            <input
              type="number"
              placeholder="Leave empty for unlimited"
              bind:value={form.maxUses}
              class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-foreground mb-1">Expires At (optional)</label>
            <input
              type="datetime-local"
              bind:value={form.expiresAt}
              class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-foreground mb-1">
              Applicable Plans (optional, comma-separated slugs)
            </label>
            <input
              type="text"
              placeholder="e.g., starter,pro (leave empty for all)"
              bind:value={form.applicablePlans}
              class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          <button
            onclick={handleCreate}
            disabled={submitting || !form.code || !form.value}
            class="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Coupon'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
