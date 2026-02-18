const PESAPAL_ENV = process.env.PESAPAL_ENV || 'sandbox';
const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY || '';
const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET || '';

const BASE_URL =
	PESAPAL_ENV === 'production'
		? 'https://pay.pesapal.com/v3'
		: 'https://cybqa.pesapal.com/pesapalv3';

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getPesapalToken(): Promise<string> {
	if (cachedToken && Date.now() < cachedToken.expiresAt) {
		return cachedToken.token;
	}

	const res = await fetch(`${BASE_URL}/api/Auth/RequestToken`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		body: JSON.stringify({
			consumer_key: PESAPAL_CONSUMER_KEY,
			consumer_secret: PESAPAL_CONSUMER_SECRET,
		}),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Pesapal auth failed (${res.status}): ${text}`);
	}

	const data = await res.json();
	// Token typically valid for ~5 minutes; cache with 1-minute buffer
	cachedToken = {
		token: data.token,
		expiresAt: Date.now() + 4 * 60 * 1000,
	};
	return data.token;
}

export async function registerIPNUrl(url: string): Promise<string> {
	const token = await getPesapalToken();

	const res = await fetch(`${BASE_URL}/api/URLSetup/RegisterIPN`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({
			url,
			ipn_notification_type: 'POST',
		}),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Pesapal IPN registration failed (${res.status}): ${text}`);
	}

	const data = await res.json();
	return data.ipn_id;
}

interface SubmitOrderParams {
	merchantReference: string;
	amount: number;
	currency: 'USD' | 'KES';
	description: string;
	callbackUrl: string;
	ipnId: string;
	customerEmail: string;
	customerFirstName?: string;
	customerLastName?: string;
}

interface SubmitOrderResult {
	order_tracking_id: string;
	merchant_reference: string;
	redirect_url: string;
}

export async function submitOrder(params: SubmitOrderParams): Promise<SubmitOrderResult> {
	const token = await getPesapalToken();

	const res = await fetch(`${BASE_URL}/api/Transactions/SubmitOrderRequest`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({
			id: params.merchantReference,
			currency: params.currency,
			amount: params.amount,
			description: params.description,
			callback_url: params.callbackUrl,
			notification_id: params.ipnId,
			billing_address: {
				email_address: params.customerEmail,
				first_name: params.customerFirstName || '',
				last_name: params.customerLastName || '',
			},
		}),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Pesapal submit order failed (${res.status}): ${text}`);
	}

	return res.json();
}

interface TransactionStatus {
	payment_method: string;
	amount: number;
	created_date: string;
	confirmation_code: string;
	payment_status_description: string;
	description: string;
	message: string;
	payment_account: string;
	call_back_url: string;
	status_code: number;
	merchant_reference: string;
	currency: string;
	error: { error_type: string | null; code: string | null; message: string | null };
}

export async function getTransactionStatus(orderTrackingId: string): Promise<TransactionStatus> {
	const token = await getPesapalToken();

	const res = await fetch(
		`${BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
		{
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Authorization: `Bearer ${token}`,
			},
		}
	);

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Pesapal status query failed (${res.status}): ${text}`);
	}

	return res.json();
}
