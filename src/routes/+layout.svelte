<script lang="ts">
  import '../app.css';
  import { ConfigProvider, TabProvider } from 'specra/components';
  import type { Snippet } from 'svelte';
  import type { LayoutData } from './$types';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  const defaultTab = data.config.navigation?.tabGroups?.[0]?.id ?? '';
</script>

<svelte:head>
  <title>{data.config.site.title}</title>
  <meta name="description" content={data.config.site.description || 'Modern documentation platform'} />
  <meta property="og:title" content={data.config.site.title} />
  <meta property="og:description" content={data.config.site.description} />
  <meta property="og:type" content="website" />
  {#if data.config.site.url}
    <meta property="og:url" content={data.config.site.url} />
  {/if}
  <meta property="og:site_name" content={data.config.site.title} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={data.config.site.title} />
  <meta name="twitter:description" content={data.config.site.description} />
  <link rel="llms-txt" href="/llms.txt" />
</svelte:head>

<ConfigProvider config={data.config}>
  <TabProvider {defaultTab}>
    {@render children?.()}
  </TabProvider>
</ConfigProvider>
