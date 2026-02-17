<script lang="ts">
  import { ArrowLeft, MessageSquare, Plus, AlertCircle, CheckCircle, Trash2 } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  interface FeedbackItem {
    id: string;
    name: string;
    email: string;
    message: string;
    type: 'FEEDBACK' | 'ISSUE';
    status: 'OPEN' | 'RESOLVED';
    source: 'CONTACT_FORM' | 'ADMIN';
    resolvedAt: string | null;
    resolver: { id: string; name: string | null; email: string } | null;
    createdAt: string;
  }

  let projectId = $derived($page.params.projectId);
  let items = $state<FeedbackItem[]>([]);
  let loading = $state(true);
  let filter = $state<'ALL' | 'OPEN' | 'RESOLVED' | 'ISSUES'>('ALL');
  let showCreateForm = $state(false);
  let createName = $state('');
  let createEmail = $state('');
  let createMessage = $state('');
  let createType = $state<'FEEDBACK' | 'ISSUE'>('ISSUE');
  let creating = $state(false);

  async function loadItems() {
    const params = new URLSearchParams();
    if (filter === 'OPEN') params.set('status', 'OPEN');
    if (filter === 'RESOLVED') params.set('status', 'RESOLVED');
    if (filter === 'ISSUES') params.set('type', 'ISSUE');

    const res = await fetch(`/api/projects/${projectId}/feedback?${params}`);
    if (res.ok) {
      const data = await res.json();
      items = data.items;
    }
    loading = false;
  }

  onMount(() => {
    loadItems();
  });

  async function updateItem(id: string, data: Record<string, string>) {
    const res = await fetch(`/api/projects/${projectId}/feedback/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) await loadItems();
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this feedback item?')) return;
    const res = await fetch(`/api/projects/${projectId}/feedback/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) await loadItems();
  }

  async function createItem() {
    if (!createName || !createEmail || !createMessage) return;
    creating = true;
    const res = await fetch(`/api/projects/${projectId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: createName,
        email: createEmail,
        message: createMessage,
        type: createType,
      }),
    });
    if (res.ok) {
      createName = '';
      createEmail = '';
      createMessage = '';
      showCreateForm = false;
      await loadItems();
    }
    creating = false;
  }

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
  <div>
    <a
      href="/dashboard/projects/{projectId}"
      class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
    >
      <ArrowLeft class="h-4 w-4" />
      Back to project
    </a>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-foreground">Feedback & Issues</h1>
      <button
        onclick={() => (showCreateForm = !showCreateForm)}
        class="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus class="h-4 w-4" />
        Create Issue
      </button>
    </div>
  </div>

  {#if showCreateForm}
    <div class="rounded-lg border border-border bg-card p-6 space-y-4">
      <h2 class="text-sm font-semibold text-foreground">Create New Issue</h2>
      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label for="create-name" class="block text-sm font-medium text-muted-foreground mb-1">Name</label>
          <input
            id="create-name"
            type="text"
            bind:value={createName}
            class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            placeholder="Reporter name"
          />
        </div>
        <div>
          <label for="create-email" class="block text-sm font-medium text-muted-foreground mb-1">Email</label>
          <input
            id="create-email"
            type="email"
            bind:value={createEmail}
            class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            placeholder="reporter@example.com"
          />
        </div>
      </div>
      <div>
        <label for="create-type" class="block text-sm font-medium text-muted-foreground mb-1">Type</label>
        <select
          id="create-type"
          bind:value={createType}
          class="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="ISSUE">Issue</option>
          <option value="FEEDBACK">Feedback</option>
        </select>
      </div>
      <div>
        <label for="create-message" class="block text-sm font-medium text-muted-foreground mb-1">Message</label>
        <textarea
          id="create-message"
          bind:value={createMessage}
          rows="3"
          class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground resize-vertical"
          placeholder="Describe the issue or feedback..."
        ></textarea>
      </div>
      <div class="flex gap-2">
        <button
          onclick={createItem}
          disabled={creating || !createName || !createEmail || !createMessage}
          class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {creating ? 'Creating...' : 'Create'}
        </button>
        <button
          onclick={() => (showCreateForm = false)}
          class="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  {/if}

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
      <h2 class="text-lg font-semibold text-foreground mb-2">No feedback yet</h2>
      <p class="text-sm text-muted-foreground">Feedback from your contact form and manually created issues will appear here.</p>
    </div>
  {:else}
    <div class="rounded-lg border border-border bg-card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border bg-accent/30">
            <th class="text-left py-3 px-4 font-medium text-muted-foreground">From</th>
            <th class="text-left py-3 px-4 font-medium text-muted-foreground">Message</th>
            <th class="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
            <th class="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
            <th class="text-left py-3 px-4 font-medium text-muted-foreground">Source</th>
            <th class="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
            <th class="py-3 px-4 font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each items as item (item.id)}
            <tr class="border-b border-border/50 hover:bg-accent/20">
              <td class="py-3 px-4">
                <div class="text-foreground">{item.name}</div>
                <div class="text-xs text-muted-foreground">{item.email}</div>
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
              <td class="py-3 px-4">
                <div class="flex items-center gap-1">
                  {#if item.type === 'FEEDBACK'}
                    <button
                      onclick={() => updateItem(item.id, { type: 'ISSUE' })}
                      title="Mark as Issue"
                      class="p-1 text-muted-foreground hover:text-red-600 transition-colors"
                    >
                      <AlertCircle class="h-4 w-4" />
                    </button>
                  {:else}
                    <button
                      onclick={() => updateItem(item.id, { type: 'FEEDBACK' })}
                      title="Mark as Feedback"
                      class="p-1 text-muted-foreground hover:text-blue-600 transition-colors"
                    >
                      <MessageSquare class="h-4 w-4" />
                    </button>
                  {/if}
                  {#if item.status === 'OPEN'}
                    <button
                      onclick={() => updateItem(item.id, { status: 'RESOLVED' })}
                      title="Resolve"
                      class="p-1 text-muted-foreground hover:text-green-600 transition-colors"
                    >
                      <CheckCircle class="h-4 w-4" />
                    </button>
                  {:else}
                    <button
                      onclick={() => updateItem(item.id, { status: 'OPEN' })}
                      title="Reopen"
                      class="p-1 text-muted-foreground hover:text-yellow-600 transition-colors"
                    >
                      <AlertCircle class="h-4 w-4" />
                    </button>
                  {/if}
                  <button
                    onclick={() => deleteItem(item.id)}
                    title="Delete"
                    class="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
