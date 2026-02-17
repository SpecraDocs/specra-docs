<script lang="ts">
  import { ArrowLeft } from 'lucide-svelte';
  import AdminNav from '$lib/components/AdminNav.svelte';

  let { data, children } = $props();
</script>

<div class="min-h-screen bg-background">
  <header class="border-b border-border bg-destructive/5">
    <div class="container flex h-16 items-center justify-between px-6 mx-auto">
      <div class="flex items-center gap-6">
        <a
          href="/dashboard"
          class="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft class="h-4 w-4" />
          <span class="font-semibold text-lg text-foreground">
            Specra
          </span>
        </a>
        <span class="text-muted-foreground/40">|</span>
        <span class="text-sm font-medium text-destructive">Admin</span>
      </div>
      <div class="flex items-center gap-4">
        <span class="text-sm text-muted-foreground">
          {data.session.user?.email}
        </span>
      </div>
    </div>
  </header>

  <div class="container px-6 mx-auto flex gap-8 py-8">
    <aside class="w-56 shrink-0">
      <AdminNav />
    </aside>

    <main class="flex-1 min-w-0">
      {@render children()}
    </main>
  </div>
</div>
