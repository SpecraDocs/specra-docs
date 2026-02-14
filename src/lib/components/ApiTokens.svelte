<script lang="ts">
  import { Key, Plus, Trash2, Copy } from 'lucide-svelte';

  interface Token {
    id: string;
    name: string;
    lastUsed: string | null;
    expiresAt: string | null;
    createdAt: string;
  }

  let { initialTokens }: { initialTokens: Token[] } = $props();

  let tokens = $state<Token[]>(initialTokens);
  let showCreate = $state(false);
  let tokenName = $state('');
  let newToken = $state<string | null>(null);
  let creating = $state(false);

  async function createToken(e: SubmitEvent) {
    e.preventDefault();
    creating = true;

    const res = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: tokenName, expiresInDays: 90 }),
    });

    if (res.ok) {
      const data = await res.json();
      newToken = data.token;
      tokenName = '';
      showCreate = false;

      // Refresh token list
      const listRes = await fetch('/api/tokens');
      if (listRes.ok) tokens = await listRes.json();
    }

    creating = false;
  }

  async function deleteToken(id: string) {
    if (!confirm('Delete this API token? Any applications using it will stop working.')) return;

    const res = await fetch(`/api/tokens/${id}`, { method: 'DELETE' });
    if (res.ok) {
      tokens = tokens.filter((t) => t.id !== id);
    }
  }

  function copyToken() {
    if (newToken) {
      navigator.clipboard.writeText(newToken);
    }
  }
</script>

<div class="rounded-lg border border-border bg-card p-6 space-y-4">
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-lg font-semibold text-foreground">API Tokens</h2>
      <p class="text-sm text-muted-foreground mt-0.5">
        Tokens for CLI authentication and API access
      </p>
    </div>
    <button
      onclick={() => (showCreate = !showCreate)}
      class="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
    >
      <Plus class="h-3.5 w-3.5" />
      New Token
    </button>
  </div>

  <!-- New token created banner -->
  {#if newToken}
    <div class="rounded-md border border-green-500/30 bg-green-500/10 p-4 space-y-2">
      <p class="text-sm font-medium text-green-700 dark:text-green-400">
        Token created! Copy it now -- it won't be shown again.
      </p>
      <div class="flex items-center gap-2">
        <code class="flex-1 rounded bg-background px-3 py-2 text-xs font-mono text-foreground break-all">
          {newToken}
        </code>
        <button
          onclick={copyToken}
          class="rounded-md border border-border p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Copy class="h-4 w-4" />
        </button>
      </div>
      <button
        onclick={() => (newToken = null)}
        class="text-xs text-muted-foreground hover:text-foreground"
      >
        Dismiss
      </button>
    </div>
  {/if}

  <!-- Create form -->
  {#if showCreate}
    <form onsubmit={createToken} class="flex gap-2">
      <input
        type="text"
        bind:value={tokenName}
        placeholder="Token name (e.g. My Laptop)"
        required
        class="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
      />
      <button
        type="submit"
        disabled={creating || !tokenName}
        class="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
      >
        {creating ? 'Creating...' : 'Create'}
      </button>
    </form>
  {/if}

  <!-- Token list -->
  {#if tokens.length === 0}
    <p class="text-sm text-muted-foreground py-4 text-center">
      No API tokens yet. Create one to use the Specra CLI.
    </p>
  {:else}
    <div class="divide-y divide-border">
      {#each tokens as token (token.id)}
        <div class="flex items-center justify-between py-3">
          <div class="flex items-center gap-3">
            <Key class="h-4 w-4 text-muted-foreground" />
            <div>
              <p class="text-sm font-medium text-foreground">
                {token.name}
              </p>
              <p class="text-xs text-muted-foreground">
                Created {new Date(token.createdAt).toLocaleDateString()}
                {#if token.lastUsed}
                  &middot; Last used {new Date(token.lastUsed).toLocaleDateString()}
                {/if}
                {#if token.expiresAt}
                  &middot; Expires {new Date(token.expiresAt).toLocaleDateString()}
                {/if}
              </p>
            </div>
          </div>
          <button
            onclick={() => deleteToken(token.id)}
            class="rounded-md p-1.5 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 class="h-4 w-4" />
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>
