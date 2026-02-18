import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTransactionStatus } from '$lib/server/pesapal.js';
import { prisma } from '$lib/server/db.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const session = await locals.auth();
		if (!session?.user?.id) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { orderTrackingId } = await request.json();
		if (!orderTrackingId) {
			return json({ error: 'Missing orderTrackingId' }, { status: 400 });
		}

		// Check DB first
		const payment = await prisma.payment.findFirst({
			where: {
				providerTxId: orderTrackingId,
				provider: 'PESAPAL',
				userId: session.user.id,
			},
		});

		if (payment && payment.status !== 'PENDING') {
			return json({ status: payment.status });
		}

		// Fall back to querying Pesapal directly
		const txStatus = await getTransactionStatus(orderTrackingId);

		let status: string;
		switch (txStatus.status_code) {
			case 1:
				status = 'COMPLETED';
				break;
			case 2:
			case 3:
				status = 'FAILED';
				break;
			default:
				status = 'PENDING';
		}

		return json({ status, paymentMethod: txStatus.payment_method });
	} catch (error) {
		console.error('Pesapal status check error:', error);
		return json({ error: 'Failed to check payment status' }, { status: 500 });
	}
};
