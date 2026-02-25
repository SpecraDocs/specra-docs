<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { Building2, Check, X, Loader2 } from 'lucide-svelte';

  const orgId = $derived($page.url.searchParams.get('orgId'));

  let name = $state('');
  let slug = $state('');
  let error = $state('');
  let loading = $state(false);
  let orgName = $state<string | null>(null);
  let orgLoading = $state(!!$page.url.searchParams.get('orgId'));

  let slugAvailable = $state<boolean | null>(null);
  let slugReason = $state('');
  let slugChecking = $state(false);
  let checkTimeout = $state<ReturnType<typeof setTimeout> | null>(null);
  let checkAbort = $state<AbortController | null>(null);

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

  function checkSlugAvailability(value: string) {
    if (checkTimeout) clearTimeout(checkTimeout);
    if (checkAbort) checkAbort.abort();

    if (!value || value.length < 3) {
      slugAvailable = null;
      slugReason = value.length > 0 ? 'Must be at least 3 characters' : '';
      slugChecking = false;
      return;
    }

    if (!/^[a-z0-9-]+$/.test(value)) {
      slugAvailable = false;
      slugReason = 'Only lowercase letters, numbers, and hyphens';
      slugChecking = false;
      return;
    }

    slugChecking = true;
    slugAvailable = null;
    slugReason = '';

    checkTimeout = setTimeout(async () => {
      const controller = new AbortController();
      checkAbort = controller;
      try {
        const res = await fetch(`/api/projects/check-slug?slug=${encodeURIComponent(value)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (slug === value) {
          slugAvailable = data.available;
          slugReason = data.reason || '';
          slugChecking = false;
        }
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        if (slug === value) {
          slugChecking = false;
        }
      }
    }, 300);
  }

  function handleNameChange(value: string) {
    name = value;
    const newSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    slug = newSlug;
    checkSlugAvailability(newSlug);
  }

  function handleSlugInput(value: string) {
    slug = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    checkSlugAvailability(slug);
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

  const slugInvalid = $derived(
    slugAvailable === false || (slug.length > 0 && slug.length < 3)
  );
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
        <div class="relative w-full">
          <input
            id="slug"
            type="text"
            value={slug}
            oninput={(e) => handleSlugInput((e.target as HTMLInputElement).value)}
            placeholder="my-docs"
            required
            pattern="^[a-z0-9-]+$"
            class="w-full rounded-l-md border bg-background px-3 py-2 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 {slugAvailable === true ? 'border-emerald-500' : slugInvalid ? 'border-destructive' : 'border-border'}"
          />
          {#if slugChecking}
            <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Loader2 class="h-4 w-4 animate-spin" />
            </span>
          {:else if slugAvailable === true}
            <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500">
              <Check class="h-4 w-4" />
            </span>
          {:else if slugAvailable === false}
            <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-destructive">
              <X class="h-4 w-4" />
            </span>
          {/if}
        </div>
        <span class="rounded-r-md border border-l-0 border-border bg-accent px-3 py-2 text-sm text-muted-foreground whitespace-nowrap">
          .docs.specra-docs.com
        </span>
      </div>
      {#if slugReason}
        <p class="text-xs text-destructive mt-1">{slugReason}</p>
      {:else if slugAvailable === true}
        <p class="text-xs text-emerald-500 mt-1">{slug}.docs.specra-docs.com is available</p>
      {:else if slugAvailable === false}
        <p class="text-xs text-destructive mt-1">This subdomain is already taken</p>
      {/if}
    </div>

    {#if error}
      <p class="text-sm text-destructive">{error}</p>
    {/if}

    <button
      type="submit"
      disabled={loading || !name || !slug || slugAvailable !== true || slugChecking}
      class="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Creating...' : 'Create Project'}
    </button>
  </form>
</div>
