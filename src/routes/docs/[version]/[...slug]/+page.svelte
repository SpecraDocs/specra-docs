<script lang="ts">
  import {
    TableOfContents,
    Header,
    DocLayout,
    CategoryIndex,
    HotReloadIndicator,
    DevModeBadge,
    MdxHotReload,
    MdxContent,
    NotFoundContent,
    SearchHighlight,
    MobileDocLayout,
    mdxComponents,
  } from 'specra/components';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{data.title}</title>
  <meta name="description" content={data.description} />
  <meta property="og:title" content={data.title} />
  <meta property="og:description" content={data.description} />
  <meta property="og:url" content={data.ogUrl} />
  <meta property="og:site_name" content="Documentation Platform" />
  <meta property="og:type" content="article" />
  <meta property="og:locale" content="en_US" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={data.title} />
  <meta name="twitter:description" content={data.description} />
  <link rel="canonical" href={data.ogUrl} />
</svelte:head>

{#if !data.doc && data.isCategory}
  <!-- Category page without doc content -->
  <MobileDocLayout
    docs={data.allDocs}
    version={data.version}
    config={data.config}
    activeTabGroup={data.categoryTabGroup}
  >
    {#snippet header()}
      <Header currentVersion={data.version} versions={data.versions} config={data.config} />
    {/snippet}
    <CategoryIndex
      categoryPath={data.slug}
      version={data.version}
      allDocs={data.allDocs}
      title={data.categoryTitle}
      description={data.categoryDescription}
      config={data.config}
      {mdxComponents}
    />
  </MobileDocLayout>
  <MdxHotReload />
  <HotReloadIndicator />
  <DevModeBadge />
{:else if data.isNotFound}
  <!-- Not found -->
  <MobileDocLayout
    docs={data.allDocs}
    version={data.version}
    config={data.config}
  >
    {#snippet header()}
      <Header currentVersion={data.version} versions={data.versions} config={data.config} />
    {/snippet}
    <NotFoundContent version={data.version} />
  </MobileDocLayout>
  <MdxHotReload />
  <HotReloadIndicator />
  <DevModeBadge />
{:else if data.doc}
  <!-- Normal doc or category with doc content -->
  <MobileDocLayout
    docs={data.allDocs}
    version={data.version}
    config={data.config}
    activeTabGroup={data.categoryTabGroup}
  >
    {#snippet header()}
      <Header currentVersion={data.version} versions={data.versions} config={data.config} />
    {/snippet}
    {#snippet toc()}
      {#if !data.isCategory}
        <TableOfContents items={data.toc} config={data.config} />
      {/if}
    {/snippet}

    {#if data.isCategory}
      <CategoryIndex
        categoryPath={data.slug}
        version={data.version}
        allDocs={data.allDocs}
        title={data.doc.meta.title}
        description={data.doc.meta.description}
        content={data.doc.content}
        config={data.config}
        {mdxComponents}
      />
    {:else}
      <SearchHighlight />
      <DocLayout
        meta={data.doc.meta}
        previousDoc={data.previous}
        nextDoc={data.next}
        version={data.version}
        slug={data.slug}
        config={data.config}
      >
        {#if data.doc.contentNodes}
          <MdxContent nodes={data.doc.contentNodes} components={mdxComponents} />
        {:else}
          {@html data.doc.content}
        {/if}
      </DocLayout>
    {/if}
  </MobileDocLayout>
  <MdxHotReload />
  <HotReloadIndicator />
  <DevModeBadge />
{/if}
