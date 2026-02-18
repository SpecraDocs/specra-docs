<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  const email = $derived($page.url.searchParams.get('email') || '');

  let code = $state('');
  let error = $state('');
  let success = $state('');
  let loading = $state(false);
  let resending = $state(false);
  let blocked = $state(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    success = '';
    loading = true;

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (data.blocked) {
        blocked = true;
        return;
      }

      if (!res.ok) {
        error = data.error || 'Verification failed';
        if (data.resent) {
          success = 'A new code has been sent to your email.';
        }
        return;
      }

      goto('/auth/login?verified=true');
    } catch {
      error = 'Something went wrong';
    } finally {
      loading = false;
    }
  }

  async function handleResend() {
    error = '';
    success = '';
    resending = true;

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.blocked) {
        blocked = true;
        return;
      }

      if (!res.ok) {
        error = data.error || 'Failed to resend code';
        return;
      }

      success = 'A new verification code has been sent to your email.';
    } catch {
      error = 'Something went wrong';
    } finally {
      resending = false;
    }
  }
</script>

<svelte:head>
  <title>Verify Email | Specra</title>
</svelte:head>

<div class="min-h-screen bg-background flex items-center justify-center px-4">
  <div class="w-full max-w-md space-y-8">
    <div class="text-center">
      <h1 class="text-3xl font-bold text-foreground">Verify your email</h1>
      <p class="mt-2 text-muted-foreground">
        {#if blocked}
          Your account has been locked.
        {:else}
          We sent a 6-digit code to <strong>{email}</strong>
        {/if}
      </p>
    </div>

    <div class="rounded-lg border border-border bg-card p-8 shadow-sm space-y-6">
      {#if blocked}
        <div class="text-center space-y-4">
          <div class="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            Your account has been locked due to too many verification attempts.
          </div>
          <p class="text-sm text-muted-foreground">
            Please contact support to unlock your account.
          </p>
          <a
            href="mailto:{import.meta.env.VITE_SUPPORT_EMAIL || 'support@specra-docs.com'}"
            class="inline-block rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Contact Support
          </a>
        </div>
      {:else}
        <form onsubmit={handleSubmit} class="space-y-4">
          {#if error}
            <div class="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          {/if}

          {#if success}
            <div class="rounded-md bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-700 dark:text-green-400">
              {success}
            </div>
          {/if}

          <div class="space-y-2">
            <label for="code" class="text-sm font-medium text-foreground">
              Verification Code
            </label>
            <input
              id="code"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength={6}
              bind:value={code}
              required
              class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground text-center tracking-widest text-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="000000"
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            class="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        <div class="text-center">
          <button
            onclick={handleResend}
            disabled={resending}
            class="text-sm font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline"
          >
            {resending ? 'Sending...' : "Didn't get a code? Resend"}
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>
