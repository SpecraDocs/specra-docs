<script lang="ts">
  import { page } from '$app/stores';

  const token = $derived($page.url.searchParams.get('token'));

  let status = $state<'loading' | 'success' | 'error'>('loading');
  let message = $state('');
  let orgName = $state('');

  $effect(() => {
    if (!token) {
      status = 'error';
      message = 'No invitation token provided.';
      return;
    }

    fetch('/api/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          status = 'success';
          orgName = data.organization?.name || 'the organization';
        } else {
          status = 'error';
          message = data.error || 'Failed to accept invitation';
        }
      })
      .catch(() => {
        status = 'error';
        message = 'Something went wrong';
      });
  });
</script>

<svelte:head>
  <title>Accept Invitation | Specra</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-background">
  <div class="max-w-md w-full rounded-lg border border-border bg-card p-8 text-center">
    {#if status === 'loading'}
      <h1 class="text-xl font-bold text-foreground mb-2">
        Accepting Invitation...
      </h1>
      <p class="text-muted-foreground">Please wait.</p>
    {/if}

    {#if status === 'success'}
      <h1 class="text-xl font-bold text-foreground mb-2">
        Welcome to {orgName}!
      </h1>
      <p class="text-muted-foreground mb-6">
        You've been added to the organization.
      </p>
      <a
        href="/dashboard/organizations"
        class="inline-flex rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
      >
        Go to Organizations
      </a>
    {/if}

    {#if status === 'error'}
      <h1 class="text-xl font-bold text-destructive mb-2">
        Invitation Error
      </h1>
      <p class="text-muted-foreground mb-6">{message}</p>
      <a
        href="/dashboard"
        class="inline-flex rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
      >
        Go to Dashboard
      </a>
    {/if}
  </div>
</div>
