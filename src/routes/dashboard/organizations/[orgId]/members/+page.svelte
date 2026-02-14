<script lang="ts">
  import { page } from '$app/stores';
  import { ArrowLeft, UserPlus, Trash2, Mail } from 'lucide-svelte';

  interface Member {
    id: string;
    role: string;
    user: { id: string; name: string | null; email: string };
  }

  interface Invitation {
    id: string;
    email: string;
    role: string;
    status: string;
    expiresAt: string;
  }

  const orgId = $derived($page.params.orgId);

  let members = $state<Member[]>([]);
  let invitations = $state<Invitation[]>([]);
  let orgName = $state('');
  let myRole = $state('');
  let inviteEmail = $state('');
  let inviteRole = $state('MEMBER');
  let inviteError = $state('');
  let showInvite = $state(false);

  const isAdmin = $derived(myRole === 'OWNER' || myRole === 'ADMIN');

  $effect(() => {
    Promise.all([
      fetch(`/api/organizations/${orgId}`).then((r) => r.json()),
      fetch(`/api/organizations/${orgId}/members`).then((r) => r.json()),
      fetch(`/api/organizations/${orgId}/invitations`).then((r) => r.json()),
    ]).then(([org, m, invites]) => {
      orgName = org.name;
      myRole = org.myRole;
      members = m;
      invitations = invites;
    });
  });

  async function sendInvite(e: SubmitEvent) {
    e.preventDefault();
    inviteError = '';

    const res = await fetch(`/api/organizations/${orgId}/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });

    if (!res.ok) {
      const data = await res.json();
      inviteError = data.error;
      return;
    }

    const inv = await res.json();
    invitations = [inv, ...invitations];
    inviteEmail = '';
    showInvite = false;
  }

  async function removeMember(memberId: string) {
    if (!confirm('Remove this member from the organization?')) return;
    const res = await fetch(
      `/api/organizations/${orgId}/members/${memberId}`,
      { method: 'DELETE' }
    );
    if (res.ok) {
      members = members.filter((m) => m.id !== memberId);
    }
  }

  async function revokeInvite(inviteId: string) {
    const res = await fetch(
      `/api/organizations/${orgId}/invitations/${inviteId}`,
      { method: 'DELETE' }
    );
    if (res.ok) {
      invitations = invitations.filter((i) => i.id !== inviteId);
    }
  }

  async function updateRole(memberId: string, role: string) {
    await fetch(`/api/organizations/${orgId}/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    members = members.map((m) => (m.id === memberId ? { ...m, role } : m));
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <a
        href="/dashboard/organizations/{orgId}"
        class="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        <ArrowLeft class="h-3 w-3" />
        {orgName}
      </a>
      <h1 class="text-2xl font-bold text-foreground">Members</h1>
    </div>
    {#if isAdmin}
      <button
        onclick={() => (showInvite = !showInvite)}
        class="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
      >
        <UserPlus class="h-4 w-4" />
        Invite Member
      </button>
    {/if}
  </div>

  <!-- Invite Form -->
  {#if showInvite}
    <form
      onsubmit={sendInvite}
      class="rounded-lg border border-border bg-card p-4 flex gap-2 items-end"
    >
      <div class="flex-1">
        <label class="block text-xs font-medium text-muted-foreground mb-1">
          Email
        </label>
        <input
          type="email"
          bind:value={inviteEmail}
          placeholder="colleague@example.com"
          required
          class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
        />
      </div>
      <div>
        <label class="block text-xs font-medium text-muted-foreground mb-1">
          Role
        </label>
        <select
          bind:value={inviteRole}
          class="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="MEMBER">Member</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      <button
        type="submit"
        class="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
      >
        Send
      </button>
    </form>
  {/if}
  {#if inviteError}
    <p class="text-sm text-destructive">{inviteError}</p>
  {/if}

  <!-- Pending Invitations -->
  {#if invitations.length > 0}
    <div class="rounded-lg border border-border bg-card">
      <div class="px-6 py-3 border-b border-border">
        <h2 class="text-sm font-medium text-muted-foreground">
          Pending Invitations
        </h2>
      </div>
      <div class="divide-y divide-border">
        {#each invitations as inv (inv.id)}
          <div class="flex items-center justify-between px-6 py-3">
            <div class="flex items-center gap-3">
              <Mail class="h-4 w-4 text-muted-foreground" />
              <div>
                <p class="text-sm text-foreground">{inv.email}</p>
                <p class="text-xs text-muted-foreground capitalize">
                  {inv.role.toLowerCase()} &middot; Expires {new Date(inv.expiresAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            {#if isAdmin}
              <button
                onclick={() => revokeInvite(inv.id)}
                class="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Members List -->
  <div class="rounded-lg border border-border bg-card">
    <div class="px-6 py-3 border-b border-border">
      <h2 class="text-sm font-medium text-muted-foreground">
        Members ({members.length})
      </h2>
    </div>
    <div class="divide-y divide-border">
      {#each members as m (m.id)}
        <div class="flex items-center justify-between px-6 py-3">
          <div>
            <p class="text-sm font-medium text-foreground">
              {m.user.name || m.user.email}
            </p>
            <p class="text-xs text-muted-foreground">{m.user.email}</p>
          </div>
          <div class="flex items-center gap-3">
            {#if isAdmin && m.role !== 'OWNER'}
              <select
                value={m.role}
                onchange={(e) => updateRole(m.id, (e.target as HTMLSelectElement).value)}
                class="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            {:else}
              <span class="text-xs text-muted-foreground capitalize rounded-full border border-border px-2 py-0.5">
                {m.role.toLowerCase()}
              </span>
            {/if}
            {#if isAdmin && m.role !== 'OWNER'}
              <button
                onclick={() => removeMember(m.id)}
                class="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
