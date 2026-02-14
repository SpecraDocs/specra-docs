<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>CLI Authentication | Specra</title>
</svelte:head>

{#if data.error}
  <div class="min-h-screen flex items-center justify-center">
    <p class="text-destructive">{data.error}</p>
  </div>
{:else}
  <div class="min-h-screen flex items-center justify-center">
    <p class="text-muted-foreground">Redirecting...</p>
  </div>
{/if}
