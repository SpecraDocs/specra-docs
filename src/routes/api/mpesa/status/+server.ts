import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { queryTransactionStatus } from '$lib/server/mpesa.js';
import { prisma } from '$lib/server/db.js';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { checkoutRequestId } = await request.json();

    if (!checkoutRequestId) {
      return json(
        { error: 'checkoutRequestId is required' },
        { status: 400 }
      );
    }

    // Check our DB first
    const payment = await prisma.payment.findFirst({
      where: {
        providerTxId: checkoutRequestId,
        userId: session.user.id,
      },
    });

    if (payment && payment.status !== 'PENDING') {
      return json({
        status: payment.status.toLowerCase(),
        message:
          payment.status === 'COMPLETED'
            ? 'Payment completed successfully'
            : 'Payment failed',
      });
    }

    // Query M-Pesa for status
    const result = await queryTransactionStatus(checkoutRequestId);

    if (result.ResultCode === '0') {
      return json({
        status: 'completed',
        message: 'Payment completed successfully',
      });
    } else if (result.ResultCode === '1032') {
      return json({
        status: 'cancelled',
        message: 'Payment was cancelled by user',
      });
    } else {
      return json({
        status: 'pending',
        message: result.ResultDesc || 'Payment is being processed',
      });
    }
  } catch (error) {
    console.error('M-Pesa status query error:', error);
    return json(
      { error: 'Failed to query payment status' },
      { status: 500 }
    );
  }
};
