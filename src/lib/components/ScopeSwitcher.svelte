<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { ChevronDown, User, Building2 } from 'lucide-svelte';

  export interface ScopeOrg {
    id: string;
    name: string;
  }

  let {
    organizations,
    currentScope,
  }: {
    organizations: ScopeOrg[];
    currentScope: string;
  } = $props();

  let open = $state(false);
  let ref: HTMLDivElement | undefined = $state();

  $effect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref && !ref.contains(e.target as Node)) {
        open = false;
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });

  const currentOrg = $derived(organizations.find((o) => o.id === currentScope));
  const label = $derived(currentOrg ? currentOrg.name : 'Personal');

  function switchScope(scope: string) {
    document.cookie = `dashboard-scope=${scope};path=/;max-age=${60 * 60 * 24 * 365}`;
    open = false;
    invalidateAll();
  }
</script>

<div bind:this={ref} class="relative mb-4">
  <button
    onclick={() => (open = !open)}
    class="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
  >
    <span class="flex items-center gap-2 truncate">
      {#if currentOrg}
        <Building2 class="h-4 w-4 text-muted-foreground shrink-0" />
      {:else}
        <User class="h-4 w-4 text-muted-foreground shrink-0" />
      {/if}
      <span class="truncate">{label}</span>
    </span>
    <ChevronDown class="h-4 w-4 text-muted-foreground transition-transform {open ? 'rotate-180' : ''}" />
  </button>

  {#if open}
    <div class="absolute left-0 right-0 z-50 mt-1 rounded-md border border-border bg-card shadow-lg">
      <button
        onclick={() => switchScope('personal')}
        class="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors {currentScope === 'personal'
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent'}"
      >
        <User class="h-4 w-4 shrink-0" />
        Personal
      </button>
      {#each organizations as org}
        <button
          onclick={() => switchScope(org.id)}
          class="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors {currentScope === org.id
            ? 'bg-accent text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'}"
        >
          <Building2 class="h-4 w-4 shrink-0" />
          <span class="truncate">{org.name}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>
