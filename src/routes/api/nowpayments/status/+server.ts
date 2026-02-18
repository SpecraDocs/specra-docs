import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const session = await locals.auth();
		if (!session?.user?.id) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { invoiceId } = await request.json();
		if (!invoiceId) {
			return json({ error: 'Missing invoiceId' }, { status: 400 });
		}

		// Check DB for the payment status
		const payment = await prisma.payment.findFirst({
			where: {
				provider: 'NOWPAYMENTS',
				userId: session.user.id,
				providerTxId: String(invoiceId),
			},
		});

		if (!payment) {
			return json({ error: 'Payment not found' }, { status: 404 });
		}

		return json({
			status: payment.status,
			providerMetadata: payment.providerMetadata,
		});
	} catch (error) {
		console.error('NOWPayments status check error:', error);
		return json({ error: 'Failed to check payment status' }, { status: 500 });
	}
};
