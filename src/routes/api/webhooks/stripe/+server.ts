import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe } from '$lib/server/stripe.js';
import { prisma } from '$lib/server/db.js';
import { createAndSendInvoice } from '$lib/server/invoices.js';
import { sendRenewalReminderEmail, sendPaymentFailedEmail } from '$lib/server/email.js';
import type Stripe from 'stripe';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }
      case 'invoice.upcoming': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceUpcoming(invoice);
        break;
      }
    }
  } catch (error) {
    console.error('Webhook handler error:', error);
    return json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }

  return json({ received: true });
};

function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  const firstItem = subscription.items?.data?.[0];
  if (firstItem) {
    return {
      start: new Date(firstItem.current_period_start * 1000),
      end: new Date(firstItem.current_period_end * 1000),
    };
  }
  // Fallback to creation date + 30 days
  const start = new Date(subscription.created * 1000);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;
  const interval = session.metadata?.interval as 'monthly' | 'annual';
  const couponCode = session.metadata?.couponCode || null;
  const taxRate = session.metadata?.taxRate ? parseFloat(session.metadata.taxRate) : 0;
  const taxAmount = session.metadata?.taxAmount ? parseInt(session.metadata.taxAmount) : 0;

  if (!userId || !planId) {
    console.error('Missing metadata in checkout session');
    return;
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );

  const period = getSubscriptionPeriod(stripeSubscription);

  // Cancel any existing active subscriptions
  await prisma.subscription.updateMany({
    where: { userId, status: 'ACTIVE' },
    data: { status: 'CANCELLED' },
  });

  await prisma.subscription.create({
    data: {
      userId,
      planId,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: session.customer as string,
      status: 'ACTIVE',
      paymentProvider: 'STRIPE',
      interval: interval === 'annual' ? 'ANNUAL' : 'MONTHLY',
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
    },
  });

  const payment = await prisma.payment.create({
    data: {
      userId,
      amount: session.amount_total ?? 0,
      currency: 'USD',
      provider: 'STRIPE',
      providerTxId: session.payment_intent as string,
      status: 'COMPLETED',
      couponCode: couponCode || null,
      taxAmount: taxAmount || null,
    },
  });

  // Trigger invoice generation (non-blocking)
  createAndSendInvoice(payment.id).catch((err) =>
    console.error('Invoice generation failed:', err)
  );
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const dbSub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!dbSub) return;

  const statusMap: Record<string, string> = {
    active: 'ACTIVE',
    canceled: 'CANCELLED',
    past_due: 'PAST_DUE',
    trialing: 'TRIALING',
    incomplete: 'INCOMPLETE',
  };

  const period = getSubscriptionPeriod(subscription);

  await prisma.subscription.update({
    where: { id: dbSub.id },
    data: {
      status: (statusMap[subscription.status] ?? 'ACTIVE') as
        | 'ACTIVE'
        | 'CANCELLED'
        | 'PAST_DUE'
        | 'TRIALING'
        | 'INCOMPLETE',
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: { status: 'CANCELLED' },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId =
    invoice.parent?.subscription_details?.subscription as string | null;
  if (!subscriptionId) return;

  const dbSub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
    include: { user: true, plan: true },
  });

  if (!dbSub) return;

  await prisma.subscription.update({
    where: { id: dbSub.id },
    data: { status: 'PAST_DUE' },
  });

  await prisma.payment.create({
    data: {
      userId: dbSub.userId,
      subscriptionId: dbSub.id,
      amount: invoice.amount_due ?? 0,
      currency: 'USD',
      provider: 'STRIPE',
      providerTxId:
        typeof invoice.payment_settings?.default_mandate === 'string'
          ? invoice.payment_settings.default_mandate
          : invoice.id,
      status: 'FAILED',
    },
  });

  // Send payment failure email
  sendPaymentFailedEmail({
    to: dbSub.user.email,
    userName: dbSub.user.name || dbSub.user.email,
    planName: dbSub.plan.name,
    amount: ((invoice.amount_due ?? 0) / 100).toFixed(2),
    currency: 'USD',
  }).catch((err) => console.error('Failed to send payment failure email:', err));
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Skip initial subscription creation -- already handled by checkout.session.completed
  if (invoice.billing_reason === 'subscription_create') return;

  const subscriptionId =
    invoice.parent?.subscription_details?.subscription as string | null;
  if (!subscriptionId) return;

  const dbSub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!dbSub) return;

  // Retrieve the Stripe subscription to get updated period dates
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  const period = getSubscriptionPeriod(stripeSubscription);

  await prisma.subscription.update({
    where: { id: dbSub.id },
    data: {
      status: 'ACTIVE',
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
    },
  });

  const payment = await prisma.payment.create({
    data: {
      userId: dbSub.userId,
      subscriptionId: dbSub.id,
      amount: invoice.amount_paid ?? 0,
      currency: 'USD',
      provider: 'STRIPE',
      providerTxId: invoice.id,
      status: 'COMPLETED',
    },
  });

  // Trigger invoice generation (non-blocking)
  createAndSendInvoice(payment.id).catch((err) =>
    console.error('Invoice generation failed for renewal:', err)
  );
}

async function handleInvoiceUpcoming(invoice: Stripe.Invoice) {
  const subscriptionId =
    invoice.parent?.subscription_details?.subscription as string | null;
  if (!subscriptionId) return;

  const dbSub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
    include: { user: true, plan: true },
  });

  if (!dbSub) return;

  const renewalDate = dbSub.currentPeriodEnd.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  sendRenewalReminderEmail({
    to: dbSub.user.email,
    userName: dbSub.user.name || dbSub.user.email,
    planName: dbSub.plan.name,
    renewalDate,
    amount: ((invoice.amount_due ?? 0) / 100).toFixed(2),
    currency: 'USD',
  }).catch((err) => console.error('Failed to send renewal reminder email:', err));
}
