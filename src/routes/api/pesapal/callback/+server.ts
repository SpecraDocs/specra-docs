import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTransactionStatus } from '$lib/server/pesapal.js';
import { prisma } from '$lib/server/db.js';
import { createAndSendInvoice } from '$lib/server/invoices.js';

const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || '';

/**
 * PesaPal redirects the user's browser here after payment.
 * Query params: OrderTrackingId, OrderMerchantReference, OrderNotificationType
 */
export const GET: RequestHandler = async ({ url }) => {
	const orderTrackingId = url.searchParams.get('OrderTrackingId');
	const orderMerchantReference = url.searchParams.get('OrderMerchantReference');

	if (!orderTrackingId) {
		redirect(302, `${PUBLIC_APP_URL}/dashboard?checkout=error&reason=missing-tracking-id`);
	}

	try {
		const txStatus = await getTransactionStatus(orderTrackingId);

		// Find the pending payment
		const payment = await prisma.payment.findFirst({
			where: { providerTxId: orderTrackingId, provider: 'PESAPAL' },
		});

		if (!payment) {
			redirect(302, `${PUBLIC_APP_URL}/dashboard?checkout=error&reason=payment-not-found`);
		}

		if (txStatus.status_code === 1) {
			// Payment completed — activate subscription if IPN hasn't already
			if (payment.status === 'PENDING') {
				await prisma.payment.update({
					where: { id: payment.id },
					data: {
						status: 'COMPLETED',
						providerTxId: txStatus.confirmation_code || orderTrackingId,
						providerMetadata: {
							pesapalOrderTrackingId: orderTrackingId,
							paymentMethod: txStatus.payment_method,
							paymentAccount: txStatus.payment_account,
							confirmationCode: txStatus.confirmation_code,
							source: 'callback',
						},
					},
				});

				const pendingSub = await prisma.subscription.findFirst({
					where: {
						userId: payment.userId,
						paymentProvider: 'PESAPAL',
						status: 'INCOMPLETE',
						pesapalOrderTrackingId: orderTrackingId,
					},
					orderBy: { createdAt: 'desc' },
				});

				if (pendingSub) {
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

				createAndSendInvoice(payment.id).catch((err) =>
					console.error('Invoice generation failed:', err)
				);
			}

			redirect(302, `${PUBLIC_APP_URL}/dashboard?checkout=success`);
		} else if (txStatus.status_code === 2 || txStatus.status_code === 3) {
			// Failed or reversed
			if (payment.status === 'PENDING') {
				await prisma.payment.update({
					where: { id: payment.id },
					data: { status: 'FAILED' },
				});
			}
			redirect(302, `${PUBLIC_APP_URL}/dashboard?checkout=failed`);
		} else {
			// Still pending — redirect to dashboard where client can poll
			redirect(302, `${PUBLIC_APP_URL}/dashboard?checkout=pesapal-pending&trackingId=${orderTrackingId}`);
		}
	} catch (err) {
		// If it's a redirect, re-throw it
		if (err && typeof err === 'object' && 'status' in err && 'location' in err) {
			throw err;
		}
		console.error('Pesapal callback error:', err);
		redirect(302, `${PUBLIC_APP_URL}/dashboard?checkout=error`);
	}
};
