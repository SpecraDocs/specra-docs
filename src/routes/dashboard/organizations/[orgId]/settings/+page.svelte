<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { ArrowLeft, Trash2 } from 'lucide-svelte';

  interface Org {
    id: string;
    name: string;
    slug: string;
    myRole: string;
  }

  const orgId = $derived($page.params.orgId);

  let org = $state<Org | null>(null);
  let name = $state('');
  let saving = $state(false);
  let deleting = $state(false);

  $effect(() => {
    fetch(`/api/organizations/${orgId}`)
      .then((r) => r.json())
      .then((data) => {
        org = data;
        name = data.name;
      });
  });

  async function handleSave(e: SubmitEvent) {
    e.preventDefault();
    saving = true;
    await fetch(`/api/organizations/${orgId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    saving = false;
  }

  async function handleDelete() {
    if (
      !confirm(
        'Delete this organization? All projects will be unlinked. This cannot be undone.'
      )
    )
      return;
    deleting = true;
    const res = await fetch(`/api/organizations/${orgId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      goto('/dashboard/organizations');
    }
    deleting = false;
  }
</script>

{#if !org}
  <div class="text-muted-foreground">Loading...</div>
{:else}
  <div class="space-y-8 max-w-2xl">
    <div>
      <a
        href="/dashboard/organizations/{orgId}"
        class="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        <ArrowLeft class="h-3 w-3" />
        {org.name}
      </a>
      <h1 class="text-2xl font-bold text-foreground">
        Organization Settings
      </h1>
    </div>

    <!-- General -->
    <form
      onsubmit={handleSave}
      class="rounded-lg border border-border bg-card p-6 space-y-4"
    >
      <h2 class="text-lg font-semibold text-foreground">General</h2>
      <div>
        <label class="block text-sm font-medium text-foreground mb-1">
          Name
        </label>
        <input
          type="text"
          bind:value={name}
          class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-foreground mb-1">
          Slug
        </label>
        <p class="text-sm text-muted-foreground">{org.slug}</p>
      </div>
      <button
        type="submit"
        disabled={saving}
        class="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </form>

    <!-- Danger Zone -->
    {#if org.myRole === 'OWNER'}
      <div class="rounded-lg border border-destructive/30 bg-card p-6 space-y-4">
        <h2 class="text-lg font-semibold text-destructive">
          Danger Zone
        </h2>
        <p class="text-sm text-muted-foreground">
          Deleting this organization will remove all members and unlink all
          projects.
        </p>
        <button
          onclick={handleDelete}
          disabled={deleting}
          class="inline-flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors"
        >
          <Trash2 class="h-4 w-4" />
          {deleting ? 'Deleting...' : 'Delete Organization'}
        </button>
      </div>
    {/if}
  </div>
{/if}
