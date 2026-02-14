<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { ArrowLeft, CreditCard, Phone, Check, Loader2, Sparkles } from 'lucide-svelte';

  interface OrderSummary {
    subtotal: number;
    discount: number;
    taxRate: number;
    taxName: string;
    taxAmount: number;
    total: number;
    currency: string;
    couponValid?: boolean;
    couponError?: string;
  }

  interface BillingAddress {
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    taxPin: string;
  }

  const TRIAL_DAYS = 14;

  const countries = [
    { code: 'US', name: 'United States' },
    { code: 'KE', name: 'Kenya' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'NG', name: 'Nigeria' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'IN', name: 'India' },
    { code: 'SG', name: 'Singapore' },
    { code: 'JP', name: 'Japan' },
  ];

  const planPrices: Record<string, { usd: number; usdAnnual: number; kes: number; kesAnnual: number; name: string }> = {
    starter: { usd: 1900, usdAnnual: 1500, kes: 2450, kesAnnual: 2450, name: 'Starter' },
    pro: { usd: 4900, usdAnnual: 3900, kes: 6300, kesAnnual: 6300, name: 'Pro' },
    enterprise: { usd: 14900, usdAnnual: 12900, kes: 19200, kesAnnual: 19200, name: 'Enterprise' },
  };

  const planSlug = $derived($page.url.searchParams.get('plan') || '');
  const intervalParam = $derived($page.url.searchParams.get('interval') || 'monthly');
  const currencyParam = $derived($page.url.searchParams.get('currency') || 'usd');
  const isTrial = $derived($page.url.searchParams.get('trial') === 'true');

  let interval = $state<'monthly' | 'annual'>('monthly');
  let billing = $state<BillingAddress>({
    address: '',
    city: '',
    state: '',
    country: 'US',
    postalCode: '',
    taxPin: '',
  });
  let couponCode = $state('');
  let appliedCoupon = $state('');
  let couponError = $state('');
  let orderSummary = $state<OrderSummary | null>(null);
  let phoneNumber = $state('');
  let loading = $state(true);
  let calculating = $state(false);
  let paying = $state(false);
  let trialError = $state('');

  const planInfo = $derived(planPrices[planSlug]);
  const planName = $derived(planInfo?.name || planSlug.charAt(0).toUpperCase() + planSlug.slice(1));

  // Initialize interval and country from URL params
  $effect(() => {
    interval = intervalParam as 'monthly' | 'annual';
    billing.country = currencyParam === 'kes' ? 'KE' : 'US';
  });

  function getLocalPrice() {
    if (!planInfo) return null;
    const isKes = currencyParam === 'kes';
    const cur = isKes ? 'KES' : 'USD';
    const price = isKes
      ? interval === 'annual' ? planInfo.kesAnnual : planInfo.kes
      : interval === 'annual' ? planInfo.usdAnnual : planInfo.usd;
    return { price, currency: cur };
  }

  // Fetch billing address on mount
  $effect(() => {
    fetch('/api/billing-address')
      .then((r) => r.json())
      .then((data) => {
        if (data.billingAddress) {
          billing = {
            address: data.billingAddress.address || '',
            city: data.billingAddress.city || '',
            state: data.billingAddress.state || '',
            country: data.billingAddress.country || (currencyParam === 'kes' ? 'KE' : 'US'),
            postalCode: data.billingAddress.postalCode || '',
            taxPin: data.billingAddress.taxPin || '',
          };
        }
      })
      .catch(() => {})
      .finally(() => (loading = false));
  });

  // Calculate order total via API
  async function recalculate() {
    if (isTrial) return;
    calculating = true;
    try {
      const res = await fetch('/api/tax/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: billing.country,
          planId: planSlug,
          interval,
          couponCode: appliedCoupon || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        orderSummary = data;
      }
    } catch {
      // ignore - use local fallback
    } finally {
      calculating = false;
    }
  }

  // Recalculate when dependencies change
  $effect(() => {
    if (!isTrial && planSlug) {
      // Access reactive deps to track them
      void billing.country;
      void interval;
      void appliedCoupon;
      recalculate();
    }
  });

  async function handleApplyCoupon() {
    if (!couponCode) return;
    couponError = '';

    const local = getLocalPrice();
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: couponCode,
        planSlug,
        amount: orderSummary?.subtotal || local?.price || 0,
        currency: orderSummary?.currency || local?.currency || 'USD',
      }),
    });

    const data = await res.json();
    if (data.valid) {
      appliedCoupon = couponCode.toUpperCase();
      couponError = '';
    } else {
      couponError = data.error || 'Invalid coupon';
      appliedCoupon = '';
    }
  }

  async function handleSaveBilling() {
    if (billing.address && billing.city && billing.country) {
      await fetch('/api/billing-address', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billing),
      });
    }
  }

  async function handleStartTrial() {
    paying = true;
    trialError = '';
    try {
      const res = await fetch('/api/subscriptions/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planSlug, interval }),
      });

      const data = await res.json();
      if (res.ok) {
        goto('/dashboard?checkout=trial-started');
      } else {
        trialError = data.error || 'Failed to start trial';
      }
    } finally {
      paying = false;
    }
  }

  async function handleStripeCheckout() {
    paying = true;
    try {
      await handleSaveBilling();

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: planSlug,
          interval,
          couponCode: appliedCoupon || undefined,
          billingAddress: billing,
          taxRate: orderSummary?.taxRate || 0,
          taxAmount: orderSummary?.taxAmount || 0,
        }),
      });

      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        alert(data.error);
      }
    } finally {
      paying = false;
    }
  }

  async function handleMpesaPayment() {
    if (!phoneNumber) return;
    paying = true;
    try {
      await handleSaveBilling();

      const res = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          planId: planSlug,
          interval,
          couponCode: appliedCoupon || undefined,
          billingAddress: billing,
        }),
      });

      const data = await res.json();
      if (data.checkoutRequestId) {
        alert(data.message || 'Check your phone for the M-Pesa prompt');
        window.location.href = '/dashboard?checkout=mpesa-pending';
      } else {
        alert(data.error || 'M-Pesa payment failed');
      }
    } finally {
      paying = false;
    }
  }

  function formatCurrency(amount: number, cur: string) {
    if (cur === 'KES') return `KES ${amount.toLocaleString()}`;
    return `$${(amount / 100).toFixed(2)}`;
  }

  const localPrice = $derived(getLocalPrice());
</script>

<svelte:head>
  <title>{isTrial ? 'Start Your Free Trial' : 'Checkout'} | Specra</title>
</svelte:head>

{#if loading}
  <div class="min-h-screen bg-background flex items-center justify-center">
    <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
{:else}
  <div class="min-h-screen bg-background">
    <header class="border-b border-border">
      <div class="container flex h-16 items-center px-6 mx-auto">
        <a href="/pricing" class="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft class="h-4 w-4" />
          <span class="font-semibold text-lg text-foreground">Specra</span>
        </a>
      </div>
    </header>

    <main class="container px-6 mx-auto py-12">
      <h1 class="text-3xl font-bold text-foreground mb-8">
        {isTrial ? 'Start Your Free Trial' : 'Checkout'}
      </h1>

      <div class="grid lg:grid-cols-2 gap-12">
        <!-- Left side -->
        <div class="space-y-6">
          {#if isTrial}
            <!-- Trial flow -->
            <div class="space-y-6">
              <div class="rounded-lg border border-primary/30 bg-primary/5 p-6">
                <div class="flex items-start gap-3">
                  <Sparkles class="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h2 class="text-lg font-semibold text-foreground">
                      {TRIAL_DAYS}-day free trial
                    </h2>
                    <p class="text-sm text-muted-foreground mt-1">
                      Get full access to all {planName} features for {TRIAL_DAYS} days.
                      No credit card required. No charges during the trial period.
                    </p>
                  </div>
                </div>
              </div>

              <div class="rounded-lg border border-border bg-card p-6">
                <h3 class="text-sm font-medium text-foreground mb-3">What happens next?</h3>
                <ul class="space-y-3">
                  <li class="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check class="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    Instant access to all {planName} plan features
                  </li>
                  <li class="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check class="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    No credit card or payment information needed
                  </li>
                  <li class="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check class="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    Trial ends automatically after {TRIAL_DAYS} days
                  </li>
                  <li class="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check class="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    Upgrade to a paid plan anytime to keep your features
                  </li>
                </ul>
              </div>

              {#if trialError}
                <p class="text-sm text-red-500 bg-red-500/10 rounded-md px-3 py-2">
                  {trialError}
                </p>
              {/if}

              <button
                onclick={handleStartTrial}
                disabled={paying}
                class="w-full flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {#if paying}
                  <Loader2 class="h-4 w-4 animate-spin" />
                {:else}
                  <Sparkles class="h-4 w-4" />
                {/if}
                {paying ? 'Starting trial...' : `Start ${TRIAL_DAYS}-Day Free Trial`}
              </button>

              <p class="text-center text-xs text-muted-foreground">
                Want to pay now instead?{' '}
                <a
                  href="/checkout?plan={planSlug}&interval={interval}&currency={currencyParam}"
                  class="text-primary hover:underline"
                >
                  Go to payment
                </a>
              </p>
            </div>
          {:else}
            <!-- Paid flow -->
            <div>
              <h2 class="text-lg font-semibold text-foreground mb-4">Billing Address</h2>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-foreground mb-1">Country</label>
                  <select
                    bind:value={billing.country}
                    class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    {#each countries as c (c.code)}
                      <option value={c.code}>{c.name}</option>
                    {/each}
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-foreground mb-1">Address</label>
                  <input
                    type="text"
                    bind:value={billing.address}
                    class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                    placeholder="Street address"
                  />
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-foreground mb-1">City</label>
                    <input
                      type="text"
                      bind:value={billing.city}
                      class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-foreground mb-1">State/Province</label>
                    <input
                      type="text"
                      bind:value={billing.state}
                      class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-foreground mb-1">Postal Code</label>
                    <input
                      type="text"
                      bind:value={billing.postalCode}
                      class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-foreground mb-1">Tax PIN (optional)</label>
                    <input
                      type="text"
                      bind:value={billing.taxPin}
                      class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                      placeholder="e.g., KRA PIN"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Coupon -->
            <div>
              <h2 class="text-lg font-semibold text-foreground mb-4">Coupon Code</h2>
              <div class="flex gap-2">
                <input
                  type="text"
                  bind:value={couponCode}
                  oninput={(e) => (couponCode = (e.target as HTMLInputElement).value.toUpperCase())}
                  placeholder="Enter coupon code"
                  class="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground font-mono"
                  disabled={!!appliedCoupon}
                />
                {#if appliedCoupon}
                  <button
                    onclick={() => {
                      appliedCoupon = '';
                      couponCode = '';
                      couponError = '';
                    }}
                    class="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Remove
                  </button>
                {:else}
                  <button
                    onclick={handleApplyCoupon}
                    class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Apply
                  </button>
                {/if}
              </div>
              {#if appliedCoupon}
                <p class="mt-2 text-sm text-green-600 flex items-center gap-1">
                  <Check class="h-3 w-3" /> Coupon {appliedCoupon} applied
                </p>
              {/if}
              {#if couponError}
                <p class="mt-2 text-sm text-red-500">{couponError}</p>
              {/if}
            </div>

            <!-- Payment Methods -->
            <div>
              <h2 class="text-lg font-semibold text-foreground mb-4">Payment Method</h2>
              <div class="space-y-3">
                <button
                  onclick={handleStripeCheckout}
                  disabled={paying}
                  class="w-full flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {#if paying}
                    <Loader2 class="h-4 w-4 animate-spin" />
                  {:else}
                    <CreditCard class="h-4 w-4" />
                  {/if}
                  Pay with Stripe
                </button>

                <div class="border-t border-border my-4"></div>

                <div>
                  <label class="block text-sm font-medium text-foreground mb-2">M-Pesa Phone Number</label>
                  <div class="flex gap-2">
                    <input
                      type="tel"
                      bind:value={phoneNumber}
                      placeholder="254712345678"
                      class="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                    />
                    <button
                      onclick={handleMpesaPayment}
                      disabled={paying || !phoneNumber}
                      class="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {#if paying}
                        <Loader2 class="h-4 w-4 animate-spin" />
                      {:else}
                        <Phone class="h-4 w-4" />
                      {/if}
                      Pay with M-Pesa
                    </button>
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>

        <!-- Right: Order Summary -->
        <div>
          <div class="rounded-lg border border-border bg-card p-6 sticky top-8">
            <h2 class="text-lg font-semibold text-foreground mb-4">
              {isTrial ? 'Trial Summary' : 'Order Summary'}
            </h2>

            <!-- Interval toggle -->
            {#if !isTrial}
              <div class="flex gap-1 rounded-md border border-border bg-background p-0.5 mb-6">
                {#each ['monthly', 'annual'] as int (int)}
                  <button
                    onclick={() => (interval = int as 'monthly' | 'annual')}
                    class="flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors {interval === int
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'}"
                  >
                    {int === 'monthly' ? 'Monthly' : 'Annual (Save 20%)'}
                  </button>
                {/each}
              </div>
            {/if}

            <div class="space-y-3">
              <div class="flex justify-between text-sm">
                <span class="text-foreground font-medium">
                  {planName} Plan
                </span>
              </div>

              {#if isTrial}
                <div class="flex justify-between text-sm">
                  <span class="text-muted-foreground">Trial period</span>
                  <span class="text-foreground">{TRIAL_DAYS} days</span>
                </div>
                {#if localPrice}
                  <div class="flex justify-between text-sm">
                    <span class="text-muted-foreground">
                      Price after trial ({interval})
                    </span>
                    <span class="text-muted-foreground">
                      {formatCurrency(localPrice.price, localPrice.currency)}/mo
                    </span>
                  </div>
                {/if}
                <div class="border-t border-border pt-3 mt-3">
                  <div class="flex justify-between">
                    <span class="font-semibold text-foreground">Due today</span>
                    <span class="font-semibold text-green-600 text-lg">
                      Free
                    </span>
                  </div>
                  <p class="text-xs text-muted-foreground mt-1">
                    No payment required. No credit card needed.
                  </p>
                </div>
              {:else}
                <!-- API-driven summary -->
                {#if orderSummary}
                  <div class="flex justify-between text-sm">
                    <span class="text-muted-foreground">Subtotal</span>
                    <span class="text-foreground">
                      {formatCurrency(orderSummary.subtotal, orderSummary.currency)}
                    </span>
                  </div>

                  {#if orderSummary.discount > 0}
                    <div class="flex justify-between text-sm">
                      <span class="text-green-600">
                        Discount {appliedCoupon ? `(${appliedCoupon})` : ''}
                      </span>
                      <span class="text-green-600">
                        -{formatCurrency(orderSummary.discount, orderSummary.currency)}
                      </span>
                    </div>
                  {/if}

                  {#if orderSummary.taxAmount > 0}
                    <div class="flex justify-between text-sm">
                      <span class="text-muted-foreground">
                        {orderSummary.taxName} ({(orderSummary.taxRate * 100).toFixed(0)}%)
                      </span>
                      <span class="text-foreground">
                        {formatCurrency(orderSummary.taxAmount, orderSummary.currency)}
                      </span>
                    </div>
                  {/if}

                  <div class="border-t border-border pt-3 mt-3">
                    <div class="flex justify-between">
                      <span class="font-semibold text-foreground">Total</span>
                      <span class="font-semibold text-foreground text-lg">
                        {#if calculating}
                          <Loader2 class="h-4 w-4 animate-spin inline" />
                        {:else}
                          {formatCurrency(orderSummary.total, orderSummary.currency)}
                        {/if}
                      </span>
                    </div>
                    <p class="text-xs text-muted-foreground mt-1">
                      per {interval === 'annual' ? 'year' : 'month'}
                    </p>
                  </div>
                {:else if localPrice}
                  <!-- Fallback: show local price while API loads -->
                  <div class="flex justify-between text-sm">
                    <span class="text-muted-foreground">Subtotal</span>
                    <span class="text-foreground">
                      {#if calculating}
                        <Loader2 class="h-3 w-3 animate-spin inline" />
                      {:else}
                        {formatCurrency(localPrice.price, localPrice.currency)}
                      {/if}
                    </span>
                  </div>
                  <div class="border-t border-border pt-3 mt-3">
                    <div class="flex justify-between">
                      <span class="font-semibold text-foreground">Total</span>
                      <span class="font-semibold text-foreground text-lg">
                        {formatCurrency(localPrice.price, localPrice.currency)}
                      </span>
                    </div>
                    <p class="text-xs text-muted-foreground mt-1">
                      per {interval === 'annual' ? 'year' : 'month'}
                    </p>
                  </div>
                {/if}
              {/if}
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
{/if}
