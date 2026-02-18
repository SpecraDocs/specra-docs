import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyIPNSignature } from '$lib/server/nowpayments.js';
import { prisma } from '$lib/server/db.js';
import { createAndSendInvoice } from '$lib/server/invoices.js';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const signature = request.headers.get('x-nowpayments-sig') || '';
		const body = await request.json();

		// Verify IPN signature
		if (!verifyIPNSignature(body, signature)) {
			console.error('NOWPayments IPN: Invalid signature');
			return json({ status: 'ok' });
		}

		const {
			payment_id,
			payment_status,
			order_id,
			price_amount,
			price_currency,
			pay_amount,
			pay_currency,
			actually_paid,
			outcome_amount,
			outcome_currency,
		} = body;

		// Find the pending payment — try by order_id in metadata first, then by invoice_id
		let payment = await prisma.payment.findFirst({
			where: {
				provider: 'NOWPAYMENTS',
				status: 'PENDING',
				providerMetadata: {
					path: ['orderId'],
					equals: order_id,
				},
			},
		});

		// Fallback: look up by the invoice_id stored as providerTxId
		if (!payment && body.invoice_id) {
			payment = await prisma.payment.findFirst({
				where: {
					provider: 'NOWPAYMENTS',
					status: 'PENDING',
					providerTxId: String(body.invoice_id),
				},
			});
		}

		if (!payment) {
			console.error('NOWPayments IPN: Payment not found for order', order_id);
			return json({ status: 'ok' });
		}

		if (payment_status === 'finished' || payment_status === 'confirmed') {
			// Payment successful
			await prisma.payment.update({
				where: { id: payment.id },
				data: {
					status: 'COMPLETED',
					providerMetadata: {
						...(payment.providerMetadata as Record<string, unknown>),
						nowpaymentsPaymentId: payment_id,
						paymentStatus: payment_status,
						payCurrency: pay_currency,
						payAmount: pay_amount,
						actuallyPaid: actually_paid,
						outcomeAmount: outcome_amount,
						outcomeCurrency: outcome_currency,
						priceAmount: price_amount,
						priceCurrency: price_currency,
					},
				},
			});

			// Find and activate the INCOMPLETE subscription
			const pendingSub = await prisma.subscription.findFirst({
				where: {
					userId: payment.userId,
					paymentProvider: 'NOWPAYMENTS',
					status: 'INCOMPLETE',
				},
				orderBy: { createdAt: 'desc' },
			});

			if (pendingSub) {
				// Cancel any other active subscriptions
				await prisma.subscription.updateMany({
					where: {
						userId: payment.userId,
						status: 'ACTIVE',
						id: { not: pendingSub.id },
					},
					data: { status: 'CANCELLED' },
				});

				const now = new Date();
				const periodEnd = new Date(now);
				if (pendingSub.interval === 'ANNUAL') {
					periodEnd.setFullYear(periodEnd.getFullYear() + 1);
				} else {
					periodEnd.setMonth(periodEnd.getMonth() + 1);
				}

				await prisma.subscription.update({
					where: { id: pendingSub.id },
					data: {
						status: 'ACTIVE',
						currentPeriodStart: now,
						currentPeriodEnd: periodEnd,
					},
				});

				await prisma.payment.update({
					where: { id: payment.id },
					data: { subscriptionId: pendingSub.id },
				});
			}

			// Trigger invoice generation (non-blocking)
			createAndSendInvoice(payment.id).catch((err) =>
				console.error('Invoice generation failed:', err)
			);
		} else if (
			payment_status === 'failed' ||
			payment_status === 'expired' ||
			payment_status === 'refunded'
		) {
			await prisma.payment.update({
				where: { id: payment.id },
				data: {
					status: 'FAILED',
					providerMetadata: {
						...(payment.providerMetadata as Record<string, unknown>),
						nowpaymentsPaymentId: payment_id,
						paymentStatus: payment_status,
					},
				},
			});
		}

		return json({ status: 'ok' });
	} catch (error) {
		console.error('NOWPayments IPN error:', error);
		return json({ status: 'ok' });
	}
};
