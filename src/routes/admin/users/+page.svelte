<script lang="ts">
  import { Search, Shield, User, X, Ban, CheckCircle, MoreVertical, Crown, UserX, UserCheck } from 'lucide-svelte';

  interface UserData {
    id: string;
    name: string | null;
    email: string;
    role: string;
    status: string;
    createdAt: string;
    isPrimaryAdmin: boolean;
    isOnline: boolean;
    activeSubscription: { planName: string; planSlug: string; status: string } | null;
    _count: { subscriptions: number; projects: number };
  }

  interface Pagination {
    page: number;
    totalPages: number;
    total: number;
  }

  let users = $state<UserData[]>([]);
  let pagination = $state<Pagination>({ page: 1, totalPages: 1, total: 0 });
  let search = $state('');
  let loading = $state(true);
  let openMenuId = $state<string | null>(null);

  function loadUsers(page = 1, searchTerm = search) {
    loading = true;
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (searchTerm) params.set('search', searchTerm);

    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((data) => {
        users = data.users;
        pagination = data.pagination;
      })
      .finally(() => {
        loading = false;
      });
  }

  $effect(() => {
    loadUsers();
  });

  function handleSearch(e: SubmitEvent) {
    e.preventDefault();
    loadUsers(1, search);
  }

  function clearSearch() {
    search = '';
    loadUsers(1, '');
  }

  async function toggleRole(userId: string, currentRole: string) {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!confirm(`Change this user's role to ${newRole}?`)) return;

    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });

    if (res.ok) {
      users = users.map((u) => (u.id === userId ? { ...u, role: newRole } : u));
    } else {
      const error = await res.json();
      alert(error.error || 'Failed to change user role');
    }
  }

  async function toggleUserStatus(userId: string, currentStatus: string) {
    const newStatus = currentStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    const action = newStatus === 'BLOCKED' ? 'block' : 'unblock';

    if (
      !confirm(
        `Are you sure you want to ${action} this user? ${
          newStatus === 'BLOCKED'
            ? 'This will invalidate all their active sessions.'
            : ''
        }`
      )
    )
      return;

    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.ok) {
      users = users.map((u) =>
        u.id === userId
          ? { ...u, status: newStatus, isOnline: newStatus === 'BLOCKED' ? false : u.isOnline }
          : u
      );
    } else {
      const error = await res.json();
      alert(error.error || `Failed to ${action} user`);
    }
  }

  function handleClickOutside(e: MouseEvent) {
    if (openMenuId && !(e.target as HTMLElement).closest('.actions-menu')) {
      openMenuId = null;
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-foreground">Users</h1>
    <p class="text-muted-foreground mt-1">
      {pagination.total} total users
    </p>
  </div>

  <!-- Search -->
  <form onsubmit={handleSearch} class="flex gap-2 max-w-md">
    <div class="relative flex-1">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        bind:value={search}
        placeholder="Search by name or email..."
        class="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
      />
    </div>
    <button
      type="submit"
      class="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
    >
      Search
    </button>
    {#if search}
      <button
        type="button"
        onclick={clearSearch}
        class="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2"
      >
        <X class="h-4 w-4" />
        Clear
      </button>
    {/if}
  </form>

  <!-- Users Table -->
  <div class="rounded-lg border border-border bg-card overflow-hidden">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-border bg-accent/50">
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Subscription</th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Projects</th>
          <th class="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
          <th class="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        {#if loading}
          <tr>
            <td colspan="7" class="text-center py-8 text-muted-foreground">
              Loading...
            </td>
          </tr>
        {:else if users.length === 0}
          <tr>
            <td colspan="7" class="text-center py-8 text-muted-foreground">
              No users found.
            </td>
          </tr>
        {:else}
          {#each users as user (user.id)}
            <tr class="hover:bg-accent/30">
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <div>
                    <p class="font-medium text-foreground">
                      {user.name || '\u2014'}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  {#if user.isOnline}
                    <div class="relative flex h-2 w-2">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </div>
                  {/if}
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <span
                    class="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 {user.role === 'ADMIN'
                      ? 'bg-destructive/10 text-destructive border border-destructive/30'
                      : 'bg-accent text-muted-foreground border border-border'}"
                  >
                    {#if user.role === 'ADMIN'}
                      <Shield class="h-3 w-3" />
                    {:else}
                      <User class="h-3 w-3" />
                    {/if}
                    {user.role}
                  </span>
                  {#if user.isPrimaryAdmin}
                    <span class="text-xs text-muted-foreground italic">(Primary)</span>
                  {/if}
                </div>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 {user.status === 'ACTIVE'
                    ? 'bg-green-500/10 text-green-600 border border-green-500/30'
                    : 'bg-red-500/10 text-red-600 border border-red-500/30'}"
                >
                  {#if user.status === 'ACTIVE'}
                    <CheckCircle class="h-3 w-3" />
                  {:else}
                    <Ban class="h-3 w-3" />
                  {/if}
                  {user.status}
                </span>
              </td>
              <td class="px-4 py-3">
                {#if user.activeSubscription}
                  <span class="inline-flex items-center text-xs rounded-full px-2 py-0.5 bg-primary/10 text-primary border border-primary/30">
                    {user.activeSubscription.planName}
                  </span>
                {:else}
                  <span class="text-xs text-muted-foreground">Free</span>
                {/if}
              </td>
              <td class="px-4 py-3 text-muted-foreground">
                {user._count.projects}
              </td>
              <td class="px-4 py-3 text-muted-foreground">
                {new Date(user.createdAt).toLocaleDateString()}
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end">
                  {#if user.isPrimaryAdmin}
                    <span class="text-xs text-muted-foreground italic">Protected</span>
                  {:else}
                    <div class="relative actions-menu">
                      <button
                        onclick={() => { openMenuId = openMenuId === user.id ? null : user.id; }}
                        class="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <MoreVertical class="h-4 w-4" />
                      </button>

                      {#if openMenuId === user.id}
                        <div class="absolute right-0 z-50 mt-1 w-48 rounded-md border border-border bg-card shadow-lg py-1">
                          <button
                            onclick={() => {
                              openMenuId = null;
                              toggleRole(user.id, user.role);
                            }}
                            class="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          >
                            {#if user.role === 'ADMIN'}
                              <User class="h-4 w-4" />
                              Remove Admin
                            {:else}
                              <Crown class="h-4 w-4" />
                              Make Admin
                            {/if}
                          </button>
                          <button
                            onclick={() => {
                              openMenuId = null;
                              toggleUserStatus(user.id, user.status);
                            }}
                            class="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors {user.status === 'ACTIVE'
                              ? 'text-red-600 hover:bg-red-500/10'
                              : 'text-green-600 hover:bg-green-500/10'}"
                          >
                            {#if user.status === 'ACTIVE'}
                              <UserX class="h-4 w-4" />
                              Block User
                            {:else}
                              <UserCheck class="h-4 w-4" />
                              Unblock User
                            {/if}
                          </button>
                        </div>
                      {/if}
                    </div>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Pagination -->
  {#if pagination.totalPages > 1}
    <div class="flex items-center justify-center gap-2">
      {#if pagination.page > 1}
        <button
          onclick={() => loadUsers(pagination.page - 1)}
          class="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Previous
        </button>
      {/if}
      <span class="text-sm text-muted-foreground">
        Page {pagination.page} of {pagination.totalPages}
      </span>
      {#if pagination.page < pagination.totalPages}
        <button
          onclick={() => loadUsers(pagination.page + 1)}
          class="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Next
        </button>
      {/if}
    </div>
  {/if}
</div>
