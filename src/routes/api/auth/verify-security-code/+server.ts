import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';

/**
 * Validates a security code sent for breached-password login.
 * Returns success if the code is valid and not expired.
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { email, code } = await request.json();

		if (!email || !code) {
			return json({ error: 'Email and code are required' }, { status: 400 });
		}

		const token = await prisma.verificationToken.findFirst({
			where: {
				identifier: `security:${email}`,
				token: code,
			},
		});

		if (!token) {
			return json({ error: 'Invalid code' }, { status: 400 });
		}

		if (token.expires < new Date()) {
			await prisma.verificationToken.delete({
				where: {
					identifier_token: {
						identifier: `security:${email}`,
						token: code,
					},
				},
			});
			return json({ error: 'Code expired. Please try logging in again.' }, { status: 400 });
		}

		// Code is valid — delete it (single use)
		await prisma.verificationToken.delete({
			where: {
				identifier_token: {
					identifier: `security:${email}`,
					token: code,
				},
			},
		});

		return json({ verified: true });
	} catch (error) {
		console.error('Security code verification error:', error);
		return json({ error: 'Something went wrong' }, { status: 500 });
	}
};
