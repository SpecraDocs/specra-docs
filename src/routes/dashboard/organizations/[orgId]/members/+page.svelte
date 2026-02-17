<script lang="ts">
  import { page } from '$app/stores';
  import { ArrowLeft, UserPlus, Trash2, Mail, Users, Plus, Minus } from 'lucide-svelte';

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

  interface SeatInfo {
    planSlug: string;
    baseSeats: number;
    extraSeats: number;
    totalAllowedSeats: number;
    currentUsage: number;
    memberCount: number;
    pendingInviteCount: number;
    remainingSeats: number;
    canAddSeat: boolean;
    canBuyExtraSeats: boolean;
    pricing: { pricePerSeatUsd: number } | null;
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

  let seatInfo = $state<SeatInfo | null>(null);
  let showSeatManager = $state(false);
  let desiredExtraSeats = $state(0);
  let seatUpdating = $state(false);
  let seatError = $state('');

  const isAdmin = $derived(myRole === 'OWNER' || myRole === 'ADMIN');

  async function loadSeatInfo() {
    const res = await fetch(`/api/organizations/${orgId}/seats`);
    if (res.ok) {
      seatInfo = await res.json();
      desiredExtraSeats = seatInfo?.extraSeats ?? 0;
    }
  }

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

    loadSeatInfo();
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
      if (data.code === 'SEAT_LIMIT_REACHED') {
        inviteError = data.seatInfo?.canBuyExtraSeats
          ? `Seat limit reached (${data.seatInfo.currentUsage}/${data.seatInfo.totalAllowedSeats}). Purchase extra seats to invite more members.`
          : `Seat limit reached (${data.seatInfo.currentUsage}/${data.seatInfo.totalAllowedSeats}). Upgrade your plan for more seats.`;
      } else {
        inviteError = data.error;
      }
      return;
    }

    const inv = await res.json();
    invitations = [inv, ...invitations];
    inviteEmail = '';
    showInvite = false;
    loadSeatInfo();
  }

  async function removeMember(memberId: string) {
    if (!confirm('Remove this member from the organization?')) return;
    const res = await fetch(
      `/api/organizations/${orgId}/members/${memberId}`,
      { method: 'DELETE' }
    );
    if (res.ok) {
      members = members.filter((m) => m.id !== memberId);
      loadSeatInfo();
    }
  }

  async function revokeInvite(inviteId: string) {
    const res = await fetch(
      `/api/organizations/${orgId}/invitations/${inviteId}`,
      { method: 'DELETE' }
    );
    if (res.ok) {
      invitations = invitations.filter((i) => i.id !== inviteId);
      loadSeatInfo();
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

  async function updateSeats() {
    seatUpdating = true;
    seatError = '';

    const res = await fetch(`/api/organizations/${orgId}/seats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: desiredExtraSeats }),
    });

    if (!res.ok) {
      const data = await res.json();
      seatError = data.error;
      seatUpdating = false;
      return;
    }

    seatInfo = await res.json();
    desiredExtraSeats = seatInfo?.extraSeats ?? 0;
    seatUpdating = false;
    showSeatManager = false;
  }

  const seatUsagePercent = $derived(
    seatInfo ? Math.min(100, Math.round((seatInfo.currentUsage / seatInfo.totalAllowedSeats) * 100)) : 0
  );

  const previewTotalSeats = $derived(
    seatInfo ? seatInfo.baseSeats + desiredExtraSeats : 0
  );

  const previewMonthlyCost = $derived(
    seatInfo?.pricing ? (desiredExtraSeats * seatInfo.pricing.pricePerSeatUsd / 100) : 0
  );
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

  <!-- Seat Usage Banner -->
  {#if seatInfo}
    <div class="rounded-lg border border-border bg-card p-4">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <Users class="h-4 w-4 text-muted-foreground" />
          <span class="text-sm font-medium text-foreground">
            {seatInfo.currentUsage} of {seatInfo.totalAllowedSeats} seats used
          </span>
        </div>
        {#if isAdmin && seatInfo.canBuyExtraSeats}
          <button
            onclick={() => { showSeatManager = !showSeatManager; desiredExtraSeats = seatInfo?.extraSeats ?? 0; }}
            class="text-sm font-medium text-foreground hover:text-foreground/80 transition-colors underline underline-offset-2"
          >
            Manage seats
          </button>
        {/if}
      </div>
      <!-- Progress bar -->
      <div class="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-300 {seatUsagePercent >= 90 ? 'bg-destructive' : seatUsagePercent >= 70 ? 'bg-yellow-500' : 'bg-foreground'}"
          style="width: {seatUsagePercent}%"
        ></div>
      </div>
      <div class="flex gap-4 mt-2 text-xs text-muted-foreground">
        <span>{seatInfo.baseSeats} base</span>
        {#if seatInfo.extraSeats > 0}
          <span>+ {seatInfo.extraSeats} extra</span>
        {/if}
        <span>{seatInfo.memberCount} members</span>
        {#if seatInfo.pendingInviteCount > 0}
          <span>{seatInfo.pendingInviteCount} pending</span>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Seat Manager -->
  {#if showSeatManager && seatInfo?.canBuyExtraSeats && seatInfo.pricing}
    <div class="rounded-lg border border-border bg-card p-4 space-y-4">
      <h3 class="text-sm font-medium text-foreground">Purchase Extra Seats</h3>
      <p class="text-xs text-muted-foreground">
        ${(seatInfo.pricing.pricePerSeatUsd / 100).toFixed(2)}/seat/month. Changes are prorated.
      </p>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <button
            onclick={() => { if (desiredExtraSeats > 0) desiredExtraSeats--; }}
            disabled={desiredExtraSeats <= 0}
            class="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Minus class="h-4 w-4" />
          </button>
          <span class="text-lg font-semibold text-foreground w-8 text-center">
            {desiredExtraSeats}
          </span>
          <button
            onclick={() => desiredExtraSeats++}
            class="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border text-foreground hover:bg-muted transition-colors"
          >
            <Plus class="h-4 w-4" />
          </button>
        </div>
        <div class="text-sm text-muted-foreground">
          {previewTotalSeats} total seats &middot;
          {#if previewMonthlyCost > 0}
            ${previewMonthlyCost.toFixed(2)}/mo for extra seats
          {:else}
            No extra seat charges
          {/if}
        </div>
      </div>
      {#if seatError}
        <p class="text-sm text-destructive">{seatError}</p>
      {/if}
      <div class="flex gap-2">
        <button
          onclick={updateSeats}
          disabled={seatUpdating || desiredExtraSeats === seatInfo.extraSeats}
          class="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {seatUpdating ? 'Updating...' : 'Update Seats'}
        </button>
        <button
          onclick={() => { showSeatManager = false; seatError = ''; }}
          class="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  {/if}

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
