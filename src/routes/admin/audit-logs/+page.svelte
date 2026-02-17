<script lang="ts">
  import { Search, X, ChevronDown, ChevronRight } from 'lucide-svelte';

  interface AuditLogEntry {
    id: string;
    userId: string | null;
    orgId: string | null;
    action: string;
    target: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    user: { id: string; name: string | null; email: string } | null;
  }

  interface Pagination {
    page: number;
    totalPages: number;
    total: number;
  }

  const ACTION_CATEGORIES = [
    { value: '', label: 'All Actions' },
    { value: 'PROJECT', label: 'Project' },
    { value: 'DEPLOYMENT', label: 'Deployment' },
    { value: 'ORG', label: 'Organization' },
    { value: 'ADMIN', label: 'Admin' },
    { value: 'START_FREE_TRIAL', label: 'Trial' },
  ];

  let logs = $state<AuditLogEntry[]>([]);
  let pagination = $state<Pagination>({ page: 1, totalPages: 1, total: 0 });
  let search = $state('');
  let actionFilter = $state('');
  let loading = $state(true);
  let expandedId = $state<string | null>(null);

  function loadLogs(page = 1) {
    loading = true;
    const params = new URLSearchParams({ page: String(page), limit: '30' });
    if (search) params.set('search', search);
    if (actionFilter) params.set('action', actionFilter);

    fetch(`/api/admin/audit-logs?${params}`)
      .then((r) => r.json())
      .then((data) => {
        logs = data.logs;
        pagination = data.pagination;
      })
      .finally(() => {
        loading = false;
      });
  }

  $effect(() => {
    loadLogs();
  });

  function handleSearch(e: SubmitEvent) {
    e.preventDefault();
    loadLogs(1);
  }

  function clearSearch() {
    search = '';
    loadLogs(1);
  }

  function handleActionFilter(e: Event) {
    actionFilter = (e.target as HTMLSelectElement).value;
    loadLogs(1);
  }

  function toggleExpand(id: string) {
    expandedId = expandedId === id ? null : id;
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleString();
  }

  function actionColor(action: string): string {
    if (action.startsWith('PROJECT')) return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
    if (action.startsWith('DEPLOYMENT')) return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
    if (action.startsWith('ORG')) return 'bg-green-500/10 text-green-600 border-green-500/30';
    if (action.startsWith('ADMIN')) return 'bg-red-500/10 text-red-600 border-red-500/30';
    return 'bg-accent text-muted-foreground border-border';
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-foreground">Audit Logs</h1>
    <p class="text-muted-foreground mt-1">
      {pagination.total} total entries
    </p>
  </div>

  <!-- Filters -->
  <div class="flex gap-2 max-w-2xl flex-wrap">
    <form onsubmit={handleSearch} class="flex gap-2 flex-1 min-w-[200px]">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          bind:value={search}
          placeholder="Search by action, target, user..."
          class="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
        />
      </div>
      <button
        type="submit"
        class="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
      >
        Search
      </button>
      {#if search}
        <button
          type="button"
          onclick={clearSearch}
          class="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <X class="h-4 w-4" />
        </button>
      {/if}
    </form>

    <select
      value={actionFilter}
      onchange={handleActionFilter}
      class="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
    >
      {#each ACTION_CATEGORIES as cat}
        <option value={cat.value}>{cat.label}</option>
      {/each}
    </select>
  </div>

  <!-- Logs Table -->
  <div class="rounded-lg border border-border bg-card overflow-hidden">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-border bg-accent/50">
          <th class="w-8 px-2 py-3"></th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Time</th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Target</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        {#if loading}
          <tr>
            <td colspan="5" class="text-center py-8 text-muted-foreground">
              Loading...
            </td>
          </tr>
        {:else if logs.length === 0}
          <tr>
            <td colspan="5" class="text-center py-8 text-muted-foreground">
              No audit logs found.
            </td>
          </tr>
        {:else}
          {#each logs as log (log.id)}
            <tr
              class="hover:bg-accent/30 cursor-pointer"
              onclick={() => toggleExpand(log.id)}
            >
              <td class="px-2 py-3 text-muted-foreground">
                {#if log.metadata && Object.keys(log.metadata).length > 0}
                  {#if expandedId === log.id}
                    <ChevronDown class="h-4 w-4" />
                  {:else}
                    <ChevronRight class="h-4 w-4" />
                  {/if}
                {/if}
              </td>
              <td class="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {formatTime(log.createdAt)}
              </td>
              <td class="px-4 py-3">
                {#if log.user}
                  <div>
                    <p class="font-medium text-foreground text-xs">
                      {log.user.name || '\u2014'}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      {log.user.email}
                    </p>
                  </div>
                {:else}
                  <span class="text-xs text-muted-foreground">System</span>
                {/if}
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center text-xs rounded-full px-2 py-0.5 border {actionColor(log.action)}"
                >
                  {log.action}
                </span>
              </td>
              <td class="px-4 py-3 text-muted-foreground font-mono text-xs">
                {log.target || '\u2014'}
              </td>
            </tr>
            {#if expandedId === log.id && log.metadata && Object.keys(log.metadata).length > 0}
              <tr class="bg-accent/20">
                <td colspan="5" class="px-6 py-3">
                  <pre class="text-xs text-muted-foreground overflow-x-auto">{JSON.stringify(log.metadata, null, 2)}</pre>
                </td>
              </tr>
            {/if}
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
          onclick={() => loadLogs(pagination.page - 1)}
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
          onclick={() => loadLogs(pagination.page + 1)}
          class="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Next
        </button>
      {/if}
    </div>
  {/if}
</div>
