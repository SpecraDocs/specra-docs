<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { Building2 } from 'lucide-svelte';

  const orgId = $derived($page.url.searchParams.get('orgId'));

  let name = $state('');
  let slug = $state('');
  let error = $state('');
  let loading = $state(false);
  let orgName = $state<string | null>(null);
  let orgLoading = $state(!!$page.url.searchParams.get('orgId'));

  $effect(() => {
    if (!orgId) return;
    fetch(`/api/organizations/${orgId}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((org) => {
        orgName = org.name;
      })
      .catch(() => {
        orgName = null;
      })
      .finally(() => {
        orgLoading = false;
      });
  });

  function handleNameChange(value: string) {
    name = value;
    slug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    loading = true;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, ...(orgId ? { orgId } : {}) }),
      });

      if (!res.ok) {
        const data = await res.json();
        error = data.error || 'Failed to create project';
        return;
      }

      const project = await res.json();
      goto(`/dashboard/projects/${project.id}`);
    } catch {
      error = 'Something went wrong';
    } finally {
      loading = false;
    }
  }
</script>

<div class="max-w-lg space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-foreground">New Project</h1>
    <p class="text-muted-foreground mt-1">
      Create a new docs project to deploy online.
    </p>
  </div>

  {#if orgLoading}
    <div class="rounded-md border border-border bg-accent/50 px-4 py-3 text-sm text-muted-foreground">
      Loading organization...
    </div>
  {:else if orgId && orgName}
    <div class="flex items-center gap-2 rounded-md border border-border bg-accent/50 px-4 py-3 text-sm">
      <Building2 class="h-4 w-4 text-muted-foreground" />
      <span class="text-muted-foreground">
        Creating project in
        <span class="font-medium text-foreground">{orgName}</span>
      </span>
    </div>
  {:else}
    <div class="rounded-md border border-border bg-accent/50 px-4 py-3 text-sm text-muted-foreground">
      Creating personal project
    </div>
  {/if}

  <form onsubmit={handleSubmit} class="space-y-4">
    <div>
      <label
        for="name"
        class="block text-sm font-medium text-foreground mb-1"
      >
        Project Name
      </label>
      <input
        id="name"
        type="text"
        value={name}
        oninput={(e) => handleNameChange((e.target as HTMLInputElement).value)}
        placeholder="My Docs"
        required
        class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
      />
    </div>

    <div>
      <label
        for="slug"
        class="block text-sm font-medium text-foreground mb-1"
      >
        Subdomain
      </label>
      <div class="flex items-center gap-0">
        <input
          id="slug"
          type="text"
          bind:value={slug}
          oninput={(e) => {
            slug = (e.target as HTMLInputElement).value.toLowerCase().replace(/[^a-z0-9-]/g, '');
          }}
          placeholder="my-docs"
          required
          pattern="^[a-z0-9-]+$"
          class="w-full rounded-l-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
        />
        <span class="rounded-r-md border border-l-0 border-border bg-accent px-3 py-2 text-sm text-muted-foreground whitespace-nowrap">
          .docs.specra.dev
        </span>
      </div>
    </div>

    {#if error}
      <p class="text-sm text-destructive">{error}</p>
    {/if}

    <button
      type="submit"
      disabled={loading || !name || !slug}
      class="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Creating...' : 'Create Project'}
    </button>
  </form>
</div>
