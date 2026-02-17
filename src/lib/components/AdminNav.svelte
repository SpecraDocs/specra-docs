<script lang="ts">
  import { page } from '$app/stores';
  import {
    LayoutDashboard,
    Users,
    CreditCard,
    Server,
    BarChart3,
    User,
    Crown,
    Tag,
    MessageCircle,
    ScrollText,
  } from 'lucide-svelte';

  const adminNavItems = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/subscriptions', label: 'Subscriptions', icon: Crown },
    { href: '/admin/payments', label: 'Payments', icon: CreditCard },
    { href: '/admin/coupons', label: 'Coupons', icon: Tag },
    { href: '/admin/deployments', label: 'Deployments', icon: Server },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/admin/chat', label: 'Chat', icon: MessageCircle },
    { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
  ];
</script>

<nav class="space-y-1">
  {#each adminNavItems as item}
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

  <div class="my-4 border-t border-border"></div>
  <a
    href="/dashboard"
    class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/30 whitespace-nowrap"
  >
    <User class="h-4 w-4 shrink-0" />
    Switch to User Dashboard
  </a>
</nav>
