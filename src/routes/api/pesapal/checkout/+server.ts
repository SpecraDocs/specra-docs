import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { submitOrder } from '$lib/server/pesapal.js';
import { prisma } from '$lib/server/db.js';
import { validateCoupon, applyCoupon } from '$lib/server/coupons.js';
import { calculateOrderTotal } from '$lib/server/tax.js';

const PESAPAL_IPN_ID = process.env.PESAPAL_IPN_ID || '';
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

		// Determine currency based on billing country
		const country = billingAddress?.country || 'US';
		const isKes = country === 'KE';
		const currency = isKes ? 'KES' : 'USD';

		const baseAmount = isKes
			? interval === 'annual'
				? (plan.priceKesAnnual ?? plan.priceKes)
				: plan.priceKes
			: interval === 'annual'
				? (plan.priceUsdAnnual ?? plan.priceUsd)
				: plan.priceUsd;

		// Validate coupon
		let discount = 0;
		let couponId: string | undefined;
		if (couponCode) {
			const result = await validateCoupon(couponCode, plan.slug, baseAmount, currency);
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
							currency: currency as 'USD' | 'KES',
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
		const totals = await calculateOrderTotal({
			planPrice: baseAmount,
			discount,
			country,
		});

		const finalAmount = totals.total;

		// For USD amounts stored in cents, Pesapal expects dollar amounts
		const pesapalAmount = isKes ? finalAmount : finalAmount / 100;

		const merchantReference = `SPECRA-${plan.slug.toUpperCase()}-${Date.now()}`;

		const result = await submitOrder({
			merchantReference,
			amount: pesapalAmount,
			currency: currency as 'USD' | 'KES',
			description: `Specra ${plan.name} ${interval} subscription`,
			callbackUrl: `${PUBLIC_APP_URL}/dashboard?checkout=pesapal-pending`,
			ipnId: PESAPAL_IPN_ID,
			customerEmail: session.user.email!,
			customerFirstName: session.user.name?.split(' ')[0],
			customerLastName: session.user.name?.split(' ').slice(1).join(' '),
		});

		// Increment coupon usage
		if (couponId) {
			await applyCoupon(couponId);
		}

		// Create pending payment record
		await prisma.payment.create({
			data: {
				userId: session.user.id,
				amount: finalAmount,
				currency: currency as 'USD' | 'KES',
				provider: 'PESAPAL',
				providerTxId: result.order_tracking_id,
				status: 'PENDING',
				couponCode: couponCode?.toUpperCase() || null,
				taxAmount: totals.taxAmount || null,
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
				paymentProvider: 'PESAPAL',
				interval: interval === 'annual' ? 'ANNUAL' : 'MONTHLY',
				currentPeriodStart: now,
				currentPeriodEnd: periodEnd,
				pesapalOrderTrackingId: result.order_tracking_id,
			},
		});

		return json({ url: result.redirect_url });
	} catch (error) {
		console.error('Pesapal checkout error:', error);
		return json({ error: 'Failed to create Pesapal checkout' }, { status: 500 });
	}
};
