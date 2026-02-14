<script lang="ts">
  import {
    TableOfContents,
    Header,
    DocLayoutWrapper,
    HotReloadIndicator,
    DevModeBadge,
    MdxHotReload,
    NotFoundContent,
    SearchHighlight,
  } from 'specra/components';
  import { CategoryIndex, DocLayout } from 'specra/layouts';
  import { mdxComponents } from 'specra/mdx-components';
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
  <DocLayoutWrapper
    header={Header}
    headerProps={{ currentVersion: data.version, versions: data.versions, config: data.config }}
    docs={data.allDocs}
    version={data.version}
    config={data.config}
    currentPageTabGroup={data.categoryTabGroup}
  >
    <CategoryIndex
      categoryPath={data.slug}
      version={data.version}
      allDocs={data.allDocs}
      title={data.categoryTitle}
      description={data.categoryDescription}
      config={data.config}
      {mdxComponents}
    />
  </DocLayoutWrapper>
  <MdxHotReload />
  <HotReloadIndicator />
  <DevModeBadge />
{:else if data.isNotFound}
  <!-- Not found -->
  <DocLayoutWrapper
    header={Header}
    headerProps={{ currentVersion: data.version, versions: data.versions, config: data.config }}
    docs={data.allDocs}
    version={data.version}
    config={data.config}
    currentPageTabGroup={undefined}
  >
    <NotFoundContent version={data.version} />
  </DocLayoutWrapper>
  <MdxHotReload />
  <HotReloadIndicator />
  <DevModeBadge />
{:else if data.doc}
  <!-- Normal doc or category with doc content -->
  <DocLayoutWrapper
    header={Header}
    headerProps={{ currentVersion: data.version, versions: data.versions, config: data.config }}
    docs={data.allDocs}
    version={data.version}
    config={data.config}
    currentPageTabGroup={data.categoryTabGroup}
  >
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
        content={data.doc.content}
        previousDoc={data.previous}
        nextDoc={data.next}
        version={data.version}
        slug={data.slug}
        config={data.config}
        {mdxComponents}
      />
    {/if}
  </DocLayoutWrapper>
  <MdxHotReload />
  <HotReloadIndicator />
  <DevModeBadge />
{/if}
