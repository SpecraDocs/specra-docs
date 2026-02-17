<script lang="ts">
  import { MessageSquare, AlertCircle, CheckCircle } from 'lucide-svelte';
  import { onMount } from 'svelte';

  interface FeedbackItem {
    id: string;
    projectId: string | null;
    name: string;
    email: string;
    message: string;
    type: 'FEEDBACK' | 'ISSUE';
    status: 'OPEN' | 'RESOLVED';
    source: 'CONTACT_FORM' | 'ADMIN';
    resolvedAt: string | null;
    resolver: { id: string; name: string | null; email: string } | null;
    project: { id: string; name: string; user: { name: string | null; email: string } } | null;
    createdAt: string;
  }

  let items = $state<FeedbackItem[]>([]);
  let loading = $state(true);
  let filter = $state<'ALL' | 'OPEN' | 'RESOLVED' | 'ISSUES'>('ALL');

  async function loadItems() {
    const params = new URLSearchParams();
    if (filter === 'OPEN') params.set('status', 'OPEN');
    if (filter === 'RESOLVED') params.set('status', 'RESOLVED');
    if (filter === 'ISSUES') params.set('type', 'ISSUE');

    const res = await fetch(`/api/admin/feedback?${params}`);
    if (res.ok) {
      const data = await res.json();
      items = data.items;
    }
    loading = false;
  }

  onMount(() => {
    loadItems();
  });

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  $effect(() => {
    filter;
    loading = true;
    loadItems();
  });
</script>

<div class="space-y-6">
  <h1 class="text-2xl font-bold text-foreground">All Feedback & Issues</h1>
  <p class="text-sm text-muted-foreground">
    Read-only view of all feedback and issues across all projects and the landing page.
  </p>

  <!-- Filter Tabs -->
  <div class="flex gap-1 border-b border-border">
    {#each ['ALL', 'OPEN', 'RESOLVED', 'ISSUES'] as tab}
      <button
        onclick={() => (filter = tab as typeof filter)}
        class="px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px {filter === tab
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'}"
      >
        {tab === 'ALL' ? 'All' : tab === 'ISSUES' ? 'Issues' : tab === 'OPEN' ? 'Open' : 'Resolved'}
      </button>
    {/each}
  </div>

  {#if loading}
    <div class="text-muted-foreground">Loading...</div>
  {:else if items.length === 0}
    <div class="rounded-lg border border-border bg-card p-12 text-center">
      <MessageSquare class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h2 class="text-lg font-semibold text-foreground mb-2">No feedback</h2>
      <p class="text-sm text-muted-foreground">No feedback or issues have been submitted yet.</p>
    </div>
  {:else}
    <div class="rounded-lg border border-border bg-card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border bg-accent/30">
            <th class="text-left py-3 px-4 font-medium text-muted-foreground">From</th>
            <th class="text-left py-3 px-4 font-medium text-muted-foreground">Project</th>
            <th class="text-left py-3 px-4 font-medium text-muted-foreground">Message</th>
            <th class="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
            <th class="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
            <th class="text-left py-3 px-4 font-medium text-muted-foreground">Source</th>
            <th class="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
          </tr>
        </thead>
        <tbody>
          {#each items as item (item.id)}
            <tr class="border-b border-border/50 hover:bg-accent/20">
              <td class="py-3 px-4">
                <div class="text-foreground">{item.name}</div>
                <div class="text-xs text-muted-foreground">{item.email}</div>
              </td>
              <td class="py-3 px-4">
                {#if item.project}
                  <div class="text-foreground">{item.project.name}</div>
                  <div class="text-xs text-muted-foreground">{item.project.user.name || item.project.user.email}</div>
                {:else}
                  <span class="text-xs text-muted-foreground italic">Platform</span>
                {/if}
              </td>
              <td class="py-3 px-4 text-foreground max-w-xs">
                <div class="truncate" title={item.message}>{item.message}</div>
              </td>
              <td class="py-3 px-4">
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {item.type === 'ISSUE'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'}">
                  {item.type === 'ISSUE' ? 'Issue' : 'Feedback'}
                </span>
              </td>
              <td class="py-3 px-4">
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {item.status === 'OPEN'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'}">
                  {item.status === 'OPEN' ? 'Open' : 'Resolved'}
                </span>
              </td>
              <td class="py-3 px-4">
                <span class="text-xs text-muted-foreground">
                  {item.source === 'CONTACT_FORM' ? 'Contact Form' : 'Admin'}
                </span>
              </td>
              <td class="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(item.createdAt)}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
