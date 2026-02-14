<script lang="ts">
  let loading = $state(false);

  async function handleClick() {
    loading = true;
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Failed to open portal:', error);
    } finally {
      loading = false;
    }
  }
</script>

<button
  onclick={handleClick}
  disabled={loading}
  class="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
>
  {loading ? 'Loading...' : 'Manage Subscription'}
</button>
