<script lang="ts">
  import { Mail, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-svelte';
  import { onMount } from 'svelte';

  interface Recipient {
    id: string;
    email: string;
    name: string | null;
    active: boolean;
    createdAt: string;
  }

  let recipients = $state<Recipient[]>([]);
  let loading = $state(true);
  let newEmail = $state('');
  let newName = $state('');
  let adding = $state(false);
  let error = $state('');

  async function loadRecipients() {
    const res = await fetch('/api/admin/notification-recipients');
    if (res.ok) {
      const data = await res.json();
      recipients = data.recipients;
    }
    loading = false;
  }

  async function addRecipient() {
    if (!newEmail.trim()) return;
    adding = true;
    error = '';

    const res = await fetch('/api/admin/notification-recipients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail.trim(), name: newName.trim() || undefined }),
    });

    if (res.ok) {
      newEmail = '';
      newName = '';
      await loadRecipients();
    } else {
      const data = await res.json();
      error = data.error || 'Failed to add recipient';
    }
    adding = false;
  }

  async function toggleRecipient(id: string) {
    const res = await fetch(`/api/admin/notification-recipients/${id}`, {
      method: 'PATCH',
    });
    if (res.ok) await loadRecipients();
  }

  async function deleteRecipient(id: string) {
    if (!confirm('Remove this notification recipient?')) return;
    const res = await fetch(`/api/admin/notification-recipients/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) await loadRecipients();
  }

  onMount(() => {
    loadRecipients();
  });

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
</script>

<div class="space-y-6">
  <h1 class="text-2xl font-bold text-foreground">Notification Recipients</h1>
  <p class="text-sm text-muted-foreground">
    Manage additional email addresses that receive contact form notifications alongside the primary admin email.
  </p>

  <!-- Add Recipient Form -->
  <div class="rounded-lg border border-border bg-card p-6 space-y-4">
    <h2 class="text-sm font-semibold text-foreground">Add Recipient</h2>
    <div class="flex gap-3 items-end flex-wrap">
      <div class="flex-1 min-w-[200px]">
        <label for="new-email" class="block text-sm font-medium text-muted-foreground mb-1">Email</label>
        <input
          id="new-email"
          type="email"
          bind:value={newEmail}
          class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
          placeholder="team@example.com"
        />
      </div>
      <div class="flex-1 min-w-[200px]">
        <label for="new-name" class="block text-sm font-medium text-muted-foreground mb-1">Name (optional)</label>
        <input
          id="new-name"
          type="text"
          bind:value={newName}
          class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
          placeholder="Team Member"
        />
      </div>
      <button
        onclick={addRecipient}
        disabled={adding || !newEmail.trim()}
        class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        <Plus class="h-4 w-4" />
        {adding ? 'Adding...' : 'Add'}
      </button>
    </div>
    {#if error}
      <p class="text-sm text-destructive">{error}</p>
    {/if}
  </div>

  <!-- Recipients List -->
  {#if loading}
    <div class="text-muted-foreground">Loading...</div>
  {:else if recipients.length === 0}
    <div class="rounded-lg border border-border bg-card p-12 text-center">
      <Mail class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h2 class="text-lg font-semibold text-foreground mb-2">No additional recipients</h2>
      <p class="text-sm text-muted-foreground">Only the primary admin email receives contact form notifications. Add recipients above to notify more people.</p>
    </div>
  {:else}
    <div class="rounded-lg border border-border bg-card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border bg-accent/30">
            <th class="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
            <th class="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
            <th class="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
            <th class="text-left py-3 px-4 font-medium text-muted-foreground">Added</th>
            <th class="py-3 px-4 font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each recipients as recipient (recipient.id)}
            <tr class="border-b border-border/50 hover:bg-accent/20">
              <td class="py-3 px-4 text-foreground">{recipient.email}</td>
              <td class="py-3 px-4 text-foreground">
                {#if recipient.name}
                  {recipient.name}
                {:else}
                  <span class="text-muted-foreground italic">—</span>
                {/if}
              </td>
              <td class="py-3 px-4">
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {recipient.active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'}">
                  {recipient.active ? 'Active' : 'Paused'}
                </span>
              </td>
              <td class="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(recipient.createdAt)}
              </td>
              <td class="py-3 px-4">
                <div class="flex items-center gap-1">
                  <button
                    onclick={() => toggleRecipient(recipient.id)}
                    title={recipient.active ? 'Pause notifications' : 'Resume notifications'}
                    class="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {#if recipient.active}
                      <ToggleRight class="h-4 w-4 text-green-600" />
                    {:else}
                      <ToggleLeft class="h-4 w-4" />
                    {/if}
                  </button>
                  <button
                    onclick={() => deleteRecipient(recipient.id)}
                    title="Remove recipient"
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

  <div class="rounded-lg border border-border bg-accent/20 p-4">
    <p class="text-sm text-muted-foreground">
      These recipients will receive email notifications for new contact form submissions, in addition to the primary admin email configured via the <code class="text-xs bg-accent px-1 py-0.5 rounded">ADMIN_EMAIL</code> environment variable.
    </p>
  </div>
</div>
