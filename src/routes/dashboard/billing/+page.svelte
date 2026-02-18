<script lang="ts">
  import ManageSubscriptionButton from '$lib/components/ManageSubscriptionButton.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<div class="space-y-8">
  <div>
    <h1 class="text-2xl font-bold text-foreground">Billing</h1>
    <p class="text-muted-foreground mt-1">
      Manage your subscription and payment history
    </p>
  </div>

  <!-- Current subscription -->
  <div class="rounded-lg border border-border bg-card p-6 space-y-4">
    <h2 class="text-lg font-semibold text-foreground">
      Current Subscription
    </h2>

    {#if data.subscription}
      <div class="space-y-4">
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-muted-foreground">Plan</p>
            <p class="font-medium text-foreground">
              {data.subscription.plan.name}
            </p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Billing</p>
            <p class="font-medium text-foreground">
              {data.subscription.interval === 'ANNUAL' ? 'Annual' : 'Monthly'}
            </p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Status</p>
            <div class="flex items-center gap-2">
              <div
                class="h-2 w-2 rounded-full {data.subscription.status === 'ACTIVE'
                  ? 'bg-green-500'
                  : data.subscription.status === 'PAST_DUE'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'}"
              ></div>
              <span class="font-medium text-foreground capitalize">
                {data.subscription.status.toLowerCase().replace('_', ' ')}
              </span>
            </div>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Current Period</p>
            <p class="font-medium text-foreground">
              {new Date(data.subscription.currentPeriodStart).toLocaleDateString()} - {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          </div>
        </div>

        {#if data.subscription.paymentProvider === 'STRIPE'}
          <ManageSubscriptionButton />
        {:else if data.subscription.paymentProvider === 'PESAPAL' || data.subscription.paymentProvider === 'NOWPAYMENTS' || data.subscription.paymentProvider === 'MPESA'}
          <a
            href="/pricing"
            class="inline-block rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            Renew Subscription
          </a>
        {/if}
      </div>
    {:else}
      <div class="space-y-3">
        <p class="text-muted-foreground">
          You are on the <strong>Free</strong> plan.
        </p>
        <a
          href="/pricing"
          class="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Upgrade Plan
        </a>
      </div>
    {/if}
  </div>

  <!-- Payment history -->
  <div class="rounded-lg border border-border bg-card p-6 space-y-4">
    <h2 class="text-lg font-semibold text-foreground">
      Payment History
    </h2>

    {#if data.payments.length > 0}
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left py-3 pr-4 font-medium text-muted-foreground">
                Date
              </th>
              <th class="text-left py-3 px-4 font-medium text-muted-foreground">
                Amount
              </th>
              <th class="text-left py-3 px-4 font-medium text-muted-foreground">
                Provider
              </th>
              <th class="text-left py-3 px-4 font-medium text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {#each data.payments as payment (payment.id)}
              <tr class="border-b border-border/50">
                <td class="py-3 pr-4 text-foreground">
                  {new Date(payment.createdAt).toLocaleDateString()}
                </td>
                <td class="py-3 px-4 text-foreground">
                  {payment.currency === 'KES'
                    ? `KES ${payment.amount.toLocaleString()}`
                    : payment.currency === 'CRYPTO'
                      ? `$${(payment.amount / 100).toFixed(2)} (crypto)`
                      : `$${(payment.amount / 100).toFixed(2)}`}
                </td>
                <td class="py-3 px-4 text-foreground">
                  {payment.provider === 'MPESA'
                    ? 'M-Pesa'
                    : payment.provider === 'PESAPAL'
                      ? 'Pesapal'
                      : payment.provider === 'NOWPAYMENTS'
                        ? 'Crypto'
                        : payment.provider === 'ADMIN'
                          ? 'Admin'
                          : 'Stripe'}
                </td>
                <td class="py-3 px-4">
                  <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {payment.status === 'COMPLETED'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : payment.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : payment.status === 'FAILED'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'}"
                  >
                    {payment.status.toLowerCase()}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <p class="text-muted-foreground">No payments yet.</p>
    {/if}
  </div>
</div>
