<script lang="ts">
  import { ArrowLeft } from 'lucide-svelte';
  import { signOut } from '@auth/sveltekit/client';
  import DashboardNav from '$lib/components/DashboardNav.svelte';
  import type { Snippet } from 'svelte';
  import type { LayoutData } from './$types';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<div class="min-h-screen bg-background">
  <header class="border-b border-border">
    <div class="container flex h-16 items-center justify-between px-6 mx-auto">
      <div class="flex items-center gap-6">
        <a href="/" class="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft class="h-4 w-4" />
          <span class="font-semibold text-lg text-foreground">Specra</span>
        </a>
        <span class="text-muted-foreground/40">|</span>
        <span class="text-sm font-medium text-muted-foreground">Dashboard</span>
      </div>
      <div class="flex items-center gap-4">
        <span class="text-sm text-muted-foreground">
          {data.session.user?.email}
        </span>
        <button
          type="button"
          onclick={() => signOut({ callbackUrl: '/' })}
          class="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  </header>

  <div class="container px-6 mx-auto flex gap-8 py-8">
    <aside class="w-56 shrink-0">
      <DashboardNav
        isAdmin={data.userIsAdmin}
        organizations={data.organizations}
        currentScope={data.currentScope}
      />
    </aside>

    <main class="flex-1 min-w-0">
      {@render children()}
    </main>
  </div>
</div>
