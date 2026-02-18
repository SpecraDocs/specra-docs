import { createHmac } from 'crypto';

const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || '';
const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || '';
const BASE_URL = 'https://api.nowpayments.io/v1';

interface CreateInvoiceParams {
	priceAmount: number;
	priceCurrency: string;
	orderId: string;
	orderDescription: string;
	ipnCallbackUrl: string;
	successUrl: string;
	cancelUrl: string;
}

interface CreateInvoiceResult {
	id: string;
	invoice_url: string;
	order_id: string;
}

export async function createInvoice(params: CreateInvoiceParams): Promise<CreateInvoiceResult> {
	const res = await fetch(`${BASE_URL}/invoice`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': NOWPAYMENTS_API_KEY,
		},
		body: JSON.stringify({
			price_amount: params.priceAmount,
			price_currency: params.priceCurrency,
			order_id: params.orderId,
			order_description: params.orderDescription,
			ipn_callback_url: params.ipnCallbackUrl,
			success_url: params.successUrl,
			cancel_url: params.cancelUrl,
		}),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`NOWPayments create invoice failed (${res.status}): ${text}`);
	}

	return res.json();
}

interface PaymentStatus {
	payment_id: number;
	payment_status: string;
	pay_address: string;
	price_amount: number;
	price_currency: string;
	pay_amount: number;
	pay_currency: string;
	order_id: string;
	order_description: string;
	actually_paid: number;
	outcome_amount: number;
	outcome_currency: string;
}

export async function getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
	const res = await fetch(`${BASE_URL}/payment/${paymentId}`, {
		method: 'GET',
		headers: {
			'x-api-key': NOWPAYMENTS_API_KEY,
		},
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`NOWPayments status query failed (${res.status}): ${text}`);
	}

	return res.json();
}

export function verifyIPNSignature(body: Record<string, unknown>, signature: string): boolean {
	if (!NOWPAYMENTS_IPN_SECRET) return false;

	// Sort body keys alphabetically and create the signature string
	const sorted = Object.keys(body)
		.sort()
		.reduce(
			(acc, key) => {
				acc[key] = body[key];
				return acc;
			},
			{} as Record<string, unknown>
		);

	const hmac = createHmac('sha512', NOWPAYMENTS_IPN_SECRET);
	hmac.update(JSON.stringify(sorted));
	const calculatedSignature = hmac.digest('hex');

	return calculatedSignature === signature;
}
