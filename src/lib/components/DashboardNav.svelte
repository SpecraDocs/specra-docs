<script lang="ts">
  import { page } from '$app/stores';
  import {
    LayoutDashboard,
    CreditCard,
    Settings,
    FolderGit2,
    BarChart3,
    Building2,
    Shield,
  } from 'lucide-svelte';
  import ScopeSwitcher from '$lib/components/ScopeSwitcher.svelte';
  import type { ComponentType } from 'svelte';

  interface NavItem {
    href: string;
    label: string;
    icon: ComponentType;
  }

  const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/projects', label: 'Projects', icon: FolderGit2 },
    { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/dashboard/organizations', label: 'Organizations', icon: Building2 },
    { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  interface ScopeOrg {
    id: string;
    name: string;
  }

  let {
    isAdmin,
    organizations,
    currentScope,
  }: {
    isAdmin: boolean;
    organizations: ScopeOrg[];
    currentScope: string;
  } = $props();
</script>

<nav class="space-y-1">
  <ScopeSwitcher {organizations} {currentScope} />

  {#each navItems as item}
    {@const isActive = $page.url.pathname === item.href}
    <a
      href={item.href}
      class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors {isActive
        ? 'bg-accent text-foreground shadow-sm border border-border'
        : 'text-muted-foreground hover:text-foreground hover:bg-accent'}"
    >
      <svelte:component this={item.icon} class="h-4 w-4" />
      {item.label}
    </a>
  {/each}

  {#if isAdmin}
    <div class="my-4 border-t border-border"></div>
    <a
      href="/admin"
      class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors border border-blue-500/30"
    >
      <Shield class="h-4 w-4" />
      Switch to Admin Panel
    </a>
  {/if}
</nav>
