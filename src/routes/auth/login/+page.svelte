<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { signIn } from '@auth/sveltekit/client';
  import { Github } from 'lucide-svelte';

  const callbackUrl = $derived($page.url.searchParams.get('callbackUrl') || '/dashboard');
  const verified = $derived($page.url.searchParams.get('verified') === 'true');

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    loading = true;

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.code === 'EMAIL_NOT_VERIFIED') {
        goto(`/auth/verify?email=${encodeURIComponent(email)}`);
        return;
      }

      if (result?.error) {
        error = 'Invalid email or password';
      } else {
        goto(callbackUrl);
      }
    } catch {
      error = 'Something went wrong';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Sign In | Specra</title>
</svelte:head>

<div class="min-h-screen bg-background flex items-center justify-center px-4">
  <div class="w-full max-w-md space-y-8">
    <div class="text-center">
      <h1 class="text-3xl font-bold text-foreground">Welcome back</h1>
      <p class="mt-2 text-muted-foreground">
        Sign in to your Specra account
      </p>
    </div>

    <div class="rounded-lg border border-border bg-card p-8 shadow-sm space-y-6">
      {#if verified}
        <div class="rounded-md bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          Email verified successfully. You can now sign in.
        </div>
      {/if}

      <button
        onclick={() => signIn('github', { callbackUrl })}
        class="w-full flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
      >
        <Github class="h-5 w-5" />
        Continue with GitHub
      </button>

      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <span class="w-full border-t border-border"></span>
        </div>
        <div class="relative flex justify-center text-xs uppercase">
          <span class="bg-card px-2 text-muted-foreground">
            Or continue with email
          </span>
        </div>
      </div>

      <form onsubmit={handleSubmit} class="space-y-4">
        {#if error}
          <div class="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        {/if}

        <div class="space-y-2">
          <label for="email" class="text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="email"
            type="email"
            bind:value={email}
            required
            class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="you@example.com"
          />
        </div>

        <div class="space-y-2">
          <label for="password" class="text-sm font-medium text-foreground">
            Password
          </label>
          <input
            id="password"
            type="password"
            bind:value={password}
            required
            class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          class="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p class="text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <a
          href="/auth/register"
          class="font-medium text-primary hover:underline"
        >
          Sign up
        </a>
      </p>
    </div>
  </div>
</div>
