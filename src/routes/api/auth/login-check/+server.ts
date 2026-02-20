import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '$lib/server/db.js';
import { isPasswordCompromised } from '$lib/server/password-check.js';
import { sendSecurityCodeEmail } from '$lib/server/email.js';

/**
 * Pre-login check: validates credentials and checks if the password
 * has been found in a data breach. If compromised, sends a security
 * code that must be provided to complete sign-in.
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { email, password } = await request.json();

		if (!email || !password) {
			return json({ error: 'Email and password are required' }, { status: 400 });
		}

		const user = await prisma.user.findUnique({ where: { email } });

		if (!user || !user.password) {
			// Don't reveal whether the user exists
			return json({ error: 'Invalid email or password' }, { status: 401 });
		}

		if (user.status === 'BLOCKED') {
			return json({ error: 'Account is locked' }, { status: 403 });
		}

		const isValid = await bcrypt.compare(password, user.password);
		if (!isValid) {
			return json({ error: 'Invalid email or password' }, { status: 401 });
		}

		if (!user.emailVerified) {
			return json({ requiresVerification: true }, { status: 200 });
		}

		// Check if password is compromised
		const compromised = await isPasswordCompromised(password);

		if (!compromised) {
			return json({ safe: true }, { status: 200 });
		}

		// Password is compromised — generate security code
		const code = crypto.randomInt(100000, 999999).toString();
		const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

		// Clean up old security codes for this user
		await prisma.verificationToken.deleteMany({
			where: {
				identifier: `security:${email}`,
			},
		});

		await prisma.verificationToken.create({
			data: {
				identifier: `security:${email}`,
				token: code,
				expires,
			},
		});

		await sendSecurityCodeEmail({
			to: email,
			userName: user.name || 'there',
			code,
		});

		return json({ requiresSecurityCode: true }, { status: 200 });
	} catch (error) {
		console.error('Login check error:', error);
		return json({ error: 'Something went wrong' }, { status: 500 });
	}
};
