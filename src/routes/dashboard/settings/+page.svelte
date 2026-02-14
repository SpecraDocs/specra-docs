<script lang="ts">
  import ApiTokens from '$lib/components/ApiTokens.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<div class="space-y-8">
  <div>
    <h1 class="text-2xl font-bold text-foreground">Settings</h1>
    <p class="text-muted-foreground mt-1">
      Manage your account settings
    </p>
  </div>

  <!-- Profile -->
  <div class="rounded-lg border border-border bg-card p-6 space-y-4">
    <h2 class="text-lg font-semibold text-foreground">Profile</h2>
    <div class="grid sm:grid-cols-2 gap-4 max-w-lg">
      <div>
        <p class="text-sm text-muted-foreground">Name</p>
        <p class="font-medium text-foreground">
          {data.session.user?.name || 'Not set'}
        </p>
      </div>
      <div>
        <p class="text-sm text-muted-foreground">Email</p>
        <p class="font-medium text-foreground">{data.session.user?.email}</p>
      </div>
    </div>
  </div>

  <!-- API Tokens -->
  <ApiTokens initialTokens={data.tokens} />

  <!-- Danger Zone -->
  <div class="rounded-lg border border-destructive/30 bg-card p-6 space-y-4">
    <h2 class="text-lg font-semibold text-destructive">Danger Zone</h2>
    <p class="text-sm text-muted-foreground">
      Once you delete your account, there is no going back. Please be certain.
    </p>
    <button
      class="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors"
      disabled
    >
      Delete Account
    </button>
  </div>
</div>
