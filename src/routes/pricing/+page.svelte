<script lang="ts">
  import { Check, X, ArrowLeft, ArrowRight } from 'lucide-svelte';

  const tiers = [
    {
      name: 'Free',
      slug: 'free',
      priceUsd: 0,
      priceUsdAnnual: 0,
      priceKes: 0,
      priceKesAnnual: 0,
      description: 'For hobbyists and open-source projects',
      features: {
        projects: '1 project',
        seats: '1 editor seat',
        customDomain: false,
        removeBranding: false,
        search: 'Basic search',
        aiSearch: false,
        apiDocs: false,
        analytics: false,
        versionHistory: 'Version history of 7 days',
        passwordPages: false,
        customCssJs: false,
        gitSync: false,
        contactForm: false,
        liveChatWidget: false,
        sso: false,
        rbac: false,
        auditLogs: false,
        sla: false,
        support: 'Community',
      },
      cta: 'Get Started',
      popular: false,
    },
    {
      name: 'Starter',
      slug: 'starter',
      priceUsd: 19,
      priceUsdAnnual: 15,
      priceKes: 2450,
      priceKesAnnual: 2450,
      description: 'For indie devs and small startups',
      features: {
        projects: '3 projects',
        seats: '3 seats (+$5/seat)',
        customDomain: true,
        removeBranding: true,
        search: 'Basic search',
        aiSearch: false,
        apiDocs: false,
        analytics: 'Basic',
        versionHistory: 'Version history of 30 days',
        passwordPages: true,
        customCssJs: false,
        gitSync: false,
        contactForm: true,
        liveChatWidget: false,
        sso: false,
        rbac: false,
        auditLogs: false,
        sla: false,
        support: 'Email',
      },
      cta: 'Start Free Trial',
      popular: false,
    },
    {
      name: 'Pro',
      slug: 'pro',
      priceUsd: 49,
      priceUsdAnnual: 39,
      priceKes: 6300,
      priceKesAnnual: 6300,
      description: 'For growing teams and API docs',
      features: {
        projects: '10 projects',
        seats: '10 seats (+$8/seat)',
        customDomain: true,
        removeBranding: true,
        search: 'Basic search',
        aiSearch: true,
        apiDocs: true,
        analytics: 'Advanced',
        versionHistory: 'Version history for Unlimited periods',
        passwordPages: true,
        customCssJs: true,
        gitSync: true,
        contactForm: true,
        liveChatWidget: true,
        sso: false,
        rbac: false,
        auditLogs: false,
        sla: false,
        support: 'Priority',
      },
      cta: 'Start Free Trial',
      popular: true,
    },
    {
      name: 'Enterprise',
      slug: 'enterprise',
      priceUsd: 149,
      priceUsdAnnual: 129,
      priceKes: 19200,
      priceKesAnnual: 19200,
      description: 'For orgs needing SSO and RBAC',
      features: {
        projects: 'Unlimited',
        seats: 'Unlimited',
        customDomain: true,
        removeBranding: true,
        search: 'Basic search',
        aiSearch: true,
        apiDocs: true,
        analytics: 'Advanced',
        versionHistory: 'Version history for Unlimited periods',
        passwordPages: true,
        customCssJs: true,
        gitSync: true,
        contactForm: true,
        liveChatWidget: true,
        sso: true,
        rbac: true,
        auditLogs: true,
        sla: '99.9%',
        support: 'Dedicated',
      },
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  const featureLabels: Record<string, string> = {
    projects: 'Projects',
    seats: 'Editor seats',
    customDomain: 'Custom domain',
    removeBranding: 'Remove Specra branding',
    search: 'Search',
    aiSearch: 'AI-powered search',
    apiDocs: 'API docs (OpenAPI)',
    analytics: 'Analytics',
    versionHistory: 'Version history',
    passwordPages: 'Password-protected pages',
    customCssJs: 'Custom CSS/JS',
    gitSync: 'Git sync (GitHub/GitLab)',
    contactForm: 'Contact form (Web3Forms)',
    liveChatWidget: 'Live chat widget',
    sso: 'SSO (SAML/OIDC)',
    rbac: 'RBAC',
    auditLogs: 'Audit logs',
    sla: 'SLA guarantee',
    support: 'Support',
  };

  let interval = $state<'monthly' | 'annual'>('monthly');
  let currency = $state<'usd' | 'kes'>('usd');

  function getPrice(tier: (typeof tiers)[number]) {
    if (tier.priceUsd === 0) return 'Free';
    if (currency === 'kes') {
      const price = interval === 'annual' ? tier.priceKesAnnual : tier.priceKes;
      return `KES ${price.toLocaleString()}`;
    }
    const price = interval === 'annual' ? tier.priceUsdAnnual : tier.priceUsd;
    return `$${price}`;
  }

  function handleSelectPlan(slug: string) {
    if (slug === 'free') return;
    if (slug === 'enterprise') return;
    const tier = tiers.find((t) => t.slug === slug);
    const isTrial = tier?.cta === 'Start Free Trial';
    window.location.href = `/checkout?plan=${slug}&interval=${interval}&currency=${currency}${isTrial ? '&trial=true' : ''}`;
  }
</script>

<svelte:head>
  <title>Pricing | Specra</title>
  <meta name="description" content="Simple, transparent pricing for Specra documentation platform." />
</svelte:head>

<div class="min-h-screen bg-background">
  <header class="border-b border-border">
    <div class="container flex h-16 items-center justify-between px-6 mx-auto">
      <a href="/" class="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft class="h-4 w-4" />
        <span class="font-semibold text-lg text-foreground">Specra</span>
      </a>
      <div class="flex items-center gap-4">
        <a href="/auth/login" class="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Sign in
        </a>
        <a
          href="/auth/register"
          class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Get Started
        </a>
      </div>
    </div>
  </header>

  <main class="container px-6 mx-auto py-16">
    <div class="text-center space-y-4 mb-12">
      <h1 class="text-4xl md:text-5xl font-bold text-foreground">
        Simple, transparent pricing
      </h1>
      <p class="text-lg text-muted-foreground max-w-2xl mx-auto">
        Choose the plan that fits your documentation needs. All plans include our core documentation features.
      </p>
    </div>

    <!-- Billing controls -->
    <div class="flex items-center justify-center gap-6 mb-12">
      <div class="flex items-center gap-2 rounded-lg border border-border bg-card p-1">
        <button
          onclick={() => (interval = 'monthly')}
          class="rounded-md px-4 py-2 text-sm font-medium transition-colors {interval === 'monthly'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'}"
        >
          Monthly
        </button>
        <button
          onclick={() => (interval = 'annual')}
          class="rounded-md px-4 py-2 text-sm font-medium transition-colors {interval === 'annual'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'}"
        >
          Annual
          <span class="ml-1.5 text-xs opacity-75">Save 20%</span>
        </button>
      </div>

      <div class="flex items-center gap-2 rounded-lg border border-border bg-card p-1">
        <button
          onclick={() => (currency = 'usd')}
          class="rounded-md px-3 py-2 text-sm font-medium transition-colors {currency === 'usd'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'}"
        >
          USD
        </button>
        <button
          onclick={() => (currency = 'kes')}
          class="rounded-md px-3 py-2 text-sm font-medium transition-colors {currency === 'kes'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'}"
        >
          KES
        </button>
      </div>
    </div>

    <!-- Simplified plan cards (Free, Starter, Pro only) -->
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-20">
      {#each tiers.filter(t => t.slug !== 'enterprise') as tier (tier.slug)}
        <div
          class="relative rounded-xl border p-6 flex flex-col {tier.popular
            ? 'border-primary shadow-lg shadow-primary/10'
            : 'border-border'} bg-card"
        >
          {#if tier.popular}
            <div class="absolute -top-3 left-1/2 -translate-x-1/2">
              <span class="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                Most Popular
              </span>
            </div>
          {/if}

          <div class="mb-6">
            <h3 class="text-lg font-semibold text-foreground">{tier.name}</h3>
            <p class="mt-1 text-sm text-muted-foreground">{tier.description}</p>
          </div>

          <div class="mb-6">
            <span class="text-4xl font-bold text-foreground">
              {getPrice(tier)}
            </span>
            {#if tier.priceUsd > 0}
              <span class="text-muted-foreground">/mo</span>
            {/if}
            {#if interval === 'annual' && tier.priceUsd > 0}
              <p class="mt-1 text-xs text-muted-foreground">
                billed annually
              </p>
            {/if}
          </div>

          <button
            onclick={() => handleSelectPlan(tier.slug)}
            class="w-full rounded-md px-4 py-2.5 text-sm font-medium transition-colors {tier.popular
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'border border-border bg-background text-foreground hover:bg-accent'}"
          >
            {tier.cta}
          </button>
        </div>
      {/each}
    </div>

    <!-- Feature comparison table -->
    <div class="max-w-5xl mx-auto mb-20">
      <h2 class="text-2xl font-bold text-foreground text-center mb-8">
        Compare all features
      </h2>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left py-3 pr-4 font-medium text-muted-foreground">Feature</th>
              {#each tiers as tier (tier.slug)}
                <th class="text-center py-3 px-4 font-medium text-foreground">
                  {tier.name}
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            <!-- Pricing row -->
            <tr class="border-b border-border bg-accent/30">
              <td class="py-3 pr-4 font-medium text-foreground">Price</td>
              {#each tiers as tier (tier.slug)}
                <td class="text-center py-3 px-4">
                  <span class="font-semibold text-foreground">{getPrice(tier)}</span>
                  {#if tier.priceUsd > 0}
                    <span class="text-muted-foreground text-xs">/mo</span>
                  {/if}
                </td>
              {/each}
            </tr>
            {#each Object.entries(featureLabels) as [key, label] (key)}
              <tr class="border-b border-border/50">
                <td class="py-3 pr-4 text-foreground">{label}</td>
                {#each tiers as tier (tier.slug)}
                  {@const value = tier.features[key as keyof typeof tier.features]}
                  <td class="text-center py-3 px-4">
                    {#if value === false}
                      <X class="h-4 w-4 text-muted-foreground/40 mx-auto" />
                    {:else if value === true}
                      <Check class="h-4 w-4 text-primary mx-auto" />
                    {:else}
                      <span class="text-foreground">{value}</span>
                    {/if}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Enterprise CTA -->
    <div class="max-w-3xl mx-auto">
      <div class="rounded-xl border border-border bg-card p-8 text-center space-y-4">
        <h2 class="text-2xl font-bold text-foreground">Enterprise</h2>
        <p class="text-muted-foreground max-w-lg mx-auto">
          For organizations needing SSO, RBAC, audit logs, and a dedicated SLA. Get a plan tailored to your needs.
        </p>
        <a
          href="mailto:sales@specra.dev"
          class="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Contact Sales
          <ArrowRight class="h-4 w-4" />
        </a>
      </div>
    </div>
  </main>
</div>
