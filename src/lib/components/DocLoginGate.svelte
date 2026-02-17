<script lang="ts">
  import { Lock, Github } from 'lucide-svelte';

  interface Props {
    version: string;
    slug: string;
  }

  let { version, slug }: Props = $props();

  let callbackPath = $derived(`/docs/${version}/${slug}`);
</script>

<div class="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
  <div class="flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
    <Lock class="h-10 w-10 text-muted-foreground" />
  </div>

  <h2 class="text-xl font-semibold text-foreground mb-2">This page requires sign-in</h2>
  <p class="text-muted-foreground max-w-md mb-8">
    Sign in with your social account to access this content.
  </p>

  <div class="w-full max-w-sm space-y-3">
    <a
      href="/api/docs/auth/google?callbackPath={encodeURIComponent(callbackPath)}"
      class="w-full flex items-center justify-center gap-3 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
    >
      <svg class="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      Continue with Google
    </a>

    <a
      href="/api/docs/auth/github?callbackPath={encodeURIComponent(callbackPath)}"
      class="w-full flex items-center justify-center gap-3 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
    >
      <Github class="h-5 w-5" />
      Continue with GitHub
    </a>
  </div>
</div>
