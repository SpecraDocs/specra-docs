<script lang="ts">
  import { goto } from '$app/navigation';

  let name = $state('');
  let slug = $state('');
  let error = $state('');
  let loading = $state(false);

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
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      });

      if (!res.ok) {
        const data = await res.json();
        error = data.error || 'Failed to create organization';
        return;
      }

      const org = await res.json();
      goto(`/dashboard/organizations/${org.id}`);
    } catch {
      error = 'Something went wrong';
    } finally {
      loading = false;
    }
  }
</script>

<div class="max-w-lg space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-foreground">
      New Organization
    </h1>
    <p class="text-muted-foreground mt-1">
      Create an organization to collaborate with your team.
    </p>
  </div>

  <form onsubmit={handleSubmit} class="space-y-4">
    <div>
      <label
        for="name"
        class="block text-sm font-medium text-foreground mb-1"
      >
        Organization Name
      </label>
      <input
        id="name"
        type="text"
        value={name}
        oninput={(e) => handleNameChange((e.target as HTMLInputElement).value)}
        placeholder="Acme Inc."
        required
        class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
      />
    </div>

    <div>
      <label
        for="slug"
        class="block text-sm font-medium text-foreground mb-1"
      >
        URL Slug
      </label>
      <input
        id="slug"
        type="text"
        bind:value={slug}
        oninput={(e) => {
          slug = (e.target as HTMLInputElement).value.toLowerCase().replace(/[^a-z0-9-]/g, '');
        }}
        placeholder="acme"
        required
        pattern="^[a-z0-9-]+$"
        class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
      />
    </div>

    {#if error}
      <p class="text-sm text-destructive">{error}</p>
    {/if}

    <button
      type="submit"
      disabled={loading || !name || !slug}
      class="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Creating...' : 'Create Organization'}
    </button>
  </form>
</div>
