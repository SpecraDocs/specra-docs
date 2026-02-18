import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createInvoice } from '$lib/server/nowpayments.js';
import { prisma } from '$lib/server/db.js';
import { validateCoupon, applyCoupon } from '$lib/server/coupons.js';
import { calculateOrderTotal } from '$lib/server/tax.js';

const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || '';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const session = await locals.auth();
		if (!session?.user?.id) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { planId, interval, couponCode, billingAddress } = await request.json();

		// Check for existing active subscription
		const activeSub = await prisma.subscription.findFirst({
			where: {
				userId: session.user.id,
				status: { in: ['ACTIVE', 'TRIALING'] },
			},
		});
		if (activeSub) {
			return json(
				{
					error:
						'You already have an active subscription. Please cancel it first or manage it from your dashboard.',
				},
				{ status: 409 }
			);
		}

		let plan = await prisma.plan.findUnique({ where: { id: planId } });
		if (!plan) {
			plan = await prisma.plan.findUnique({ where: { slug: planId } });
		}
		if (!plan) {
			return json({ error: 'Plan not found' }, { status: 404 });
		}

		// Save/update billing address if provided
		if (billingAddress && billingAddress.address && billingAddress.city && billingAddress.country) {
			await prisma.billingAddress.upsert({
				where: { userId: session.user.id },
				update: {
					address: billingAddress.address,
					city: billingAddress.city,
					state: billingAddress.state || null,
					country: billingAddress.country,
					postalCode: billingAddress.postalCode || null,
					taxPin: billingAddress.taxPin || null,
				},
				create: {
					userId: session.user.id,
					address: billingAddress.address,
					city: billingAddress.city,
					state: billingAddress.state || null,
					country: billingAddress.country,
					postalCode: billingAddress.postalCode || null,
					taxPin: billingAddress.taxPin || null,
				},
			});
		}

		// Always price in USD for crypto payments
		const baseAmount =
			interval === 'annual' ? (plan.priceUsdAnnual ?? plan.priceUsd) : plan.priceUsd;

		// Validate coupon
		let discount = 0;
		let couponId: string | undefined;
		if (couponCode) {
			const result = await validateCoupon(couponCode, plan.slug, baseAmount, 'USD');
			if (result.valid) {
				discount = result.discount;
				couponId = result.coupon.id;

				// Handle 100% discount
				if (result.finalAmount === 0) {
					const now = new Date();
					const periodEnd = new Date(now);
					if (interval === 'annual') {
						periodEnd.setFullYear(periodEnd.getFullYear() + 1);
					} else {
						periodEnd.setMonth(periodEnd.getMonth() + 1);
					}

					const subscription = await prisma.subscription.create({
						data: {
							userId: session.user.id,
							planId: plan.id,
							status: 'ACTIVE',
							paymentProvider: 'ADMIN',
							interval: interval === 'annual' ? 'ANNUAL' : 'MONTHLY',
							currentPeriodStart: now,
							currentPeriodEnd: periodEnd,
							grantReason: `100% coupon: ${couponCode.toUpperCase()}`,
						},
					});

					await applyCoupon(result.coupon.id);

					await prisma.payment.create({
						data: {
							userId: session.user.id,
							subscriptionId: subscription.id,
							amount: 0,
							currency: 'USD',
							status: 'COMPLETED',
							provider: 'ADMIN',
							couponCode: couponCode.toUpperCase(),
						},
					});

					return json({
						url: `${PUBLIC_APP_URL}/dashboard?checkout=success`,
					});
				}
			}
		}

		// Calculate tax
		const country = billingAddress?.country || 'US';
		const totals = await calculateOrderTotal({
			planPrice: baseAmount,
			discount,
			country,
		});

		// NOWPayments expects USD amount (not cents)
		const priceAmountUsd = totals.total / 100;

		const orderId = `SPECRA-${plan.slug.toUpperCase()}-${Date.now()}`;

		const result = await createInvoice({
			priceAmount: priceAmountUsd,
			priceCurrency: 'usd',
			orderId,
			orderDescription: `Specra ${plan.name} ${interval} subscription`,
			ipnCallbackUrl: `${PUBLIC_APP_URL}/api/nowpayments/ipn`,
			successUrl: `${PUBLIC_APP_URL}/dashboard?checkout=crypto-success`,
			cancelUrl: `${PUBLIC_APP_URL}/pricing?checkout=cancelled`,
		});

		// Increment coupon usage
		if (couponId) {
			await applyCoupon(couponId);
		}

		// Create pending payment record (store USD cents amount)
		await prisma.payment.create({
			data: {
				userId: session.user.id,
				amount: totals.total,
				currency: 'USD',
				provider: 'NOWPAYMENTS',
				providerTxId: String(result.id),
				status: 'PENDING',
				couponCode: couponCode?.toUpperCase() || null,
				taxAmount: totals.taxAmount || null,
				providerMetadata: {
					nowpaymentsInvoiceId: result.id,
					orderId,
					priceAmountUsd,
				},
			},
		});

		// Create INCOMPLETE subscription
		const now = new Date();
		const periodEnd = new Date(now);
		if (interval === 'annual') {
			periodEnd.setFullYear(periodEnd.getFullYear() + 1);
		} else {
			periodEnd.setMonth(periodEnd.getMonth() + 1);
		}

		await prisma.subscription.create({
			data: {
				userId: session.user.id,
				planId: plan.id,
				status: 'INCOMPLETE',
				paymentProvider: 'NOWPAYMENTS',
				interval: interval === 'annual' ? 'ANNUAL' : 'MONTHLY',
				currentPeriodStart: now,
				currentPeriodEnd: periodEnd,
				nowpaymentsInvoiceId: String(result.id),
			},
		});

		return json({ url: result.invoice_url });
	} catch (error) {
		console.error('NOWPayments checkout error:', error);
		return json({ error: 'Failed to create crypto checkout' }, { status: 500 });
	}
};
