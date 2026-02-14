<script lang="ts">
  import { Eye, Users, Clock, ArrowDownUp } from 'lucide-svelte';
  import type { ComponentType } from 'svelte';

  let {
    totalViews,
    uniqueVisitors,
    avgDuration,
    bounceRate,
  }: {
    totalViews: number;
    uniqueVisitors: number;
    avgDuration: number;
    bounceRate: number;
  } = $props();

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  interface Card {
    label: string;
    value: string;
    icon: ComponentType;
  }

  const cards: Card[] = $derived([
    {
      label: 'Page Views',
      value: totalViews.toLocaleString(),
      icon: Eye,
    },
    {
      label: 'Unique Visitors',
      value: uniqueVisitors.toLocaleString(),
      icon: Users,
    },
    {
      label: 'Avg. Duration',
      value: formatDuration(avgDuration),
      icon: Clock,
    },
    {
      label: 'Bounce Rate',
      value: `${bounceRate}%`,
      icon: ArrowDownUp,
    },
  ]);
</script>

<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
  {#each cards as card}
    <div class="rounded-lg border border-border bg-card p-4">
      <div class="flex items-center gap-2 text-muted-foreground mb-2">
        <svelte:component this={card.icon} class="h-4 w-4" />
        <span class="text-xs font-medium">{card.label}</span>
      </div>
      <p class="text-2xl font-bold text-foreground">{card.value}</p>
    </div>
  {/each}
</div>
