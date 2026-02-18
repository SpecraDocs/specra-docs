<script lang="ts">
  import { ShieldX } from 'lucide-svelte';
</script>

<svelte:head>
  <title>Account Blocked | Specra</title>
</svelte:head>

<div class="min-h-screen bg-background flex items-center justify-center px-4">
  <div class="w-full max-w-md space-y-8">
    <div class="text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <ShieldX class="h-6 w-6 text-destructive" />
      </div>
      <h1 class="text-3xl font-bold text-foreground">Account Blocked</h1>
      <p class="mt-2 text-muted-foreground">
        Your account has been disabled. If you believe this is an error, please contact support.
      </p>
    </div>

    <div class="rounded-lg border border-border bg-card p-8 shadow-sm space-y-4 text-center">
      <a
        href="mailto:support@specra-docs.com"
        class="inline-block rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Contact Support
      </a>
      <p class="text-sm text-muted-foreground">
        <a href="/auth/login" class="font-medium text-primary hover:underline">
          Back to sign in
        </a>
      </p>
    </div>
  </div>
</div>
