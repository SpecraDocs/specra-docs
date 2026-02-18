import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTransactionStatus } from '$lib/server/pesapal.js';
import { prisma } from '$lib/server/db.js';
import { createAndSendInvoice } from '$lib/server/invoices.js';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { OrderTrackingId, OrderNotificationType } = body;

		if (!OrderTrackingId) {
			return json({ status: 200 });
		}

		// Query Pesapal for the actual transaction status
		const txStatus = await getTransactionStatus(OrderTrackingId);

		// Find the pending payment by providerTxId
		const payment = await prisma.payment.findFirst({
			where: { providerTxId: OrderTrackingId, provider: 'PESAPAL' },
		});

		if (!payment) {
			console.error('Pesapal IPN: Payment not found for', OrderTrackingId);
			return json({ status: 200 });
		}

		// Pesapal status codes: 0 = Invalid, 1 = Completed, 2 = Failed, 3 = Reversed
		if (txStatus.status_code === 1) {
			// Payment successful
			await prisma.payment.update({
				where: { id: payment.id },
				data: {
					status: 'COMPLETED',
					providerTxId: txStatus.confirmation_code || OrderTrackingId,
					providerMetadata: {
						pesapalOrderTrackingId: OrderTrackingId,
						paymentMethod: txStatus.payment_method,
						paymentAccount: txStatus.payment_account,
						confirmationCode: txStatus.confirmation_code,
						notificationType: OrderNotificationType,
					},
				},
			});

			// Find and activate the INCOMPLETE subscription
			const pendingSub = await prisma.subscription.findFirst({
				where: {
					userId: payment.userId,
					paymentProvider: 'PESAPAL',
					status: 'INCOMPLETE',
					pesapalOrderTrackingId: OrderTrackingId,
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
		} else if (txStatus.status_code === 2 || txStatus.status_code === 3) {
			// Payment failed or reversed
			await prisma.payment.update({
				where: { id: payment.id },
				data: { status: 'FAILED' },
			});
		}

		// Pesapal expects a 200 response to acknowledge the IPN
		return json({ status: 200 });
	} catch (error) {
		console.error('Pesapal IPN error:', error);
		return json({ status: 200 });
	}
};
