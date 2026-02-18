import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import crypto from 'crypto';
import { prisma } from '$lib/server/db.js';
import { sendVerificationEmail } from '$lib/server/email.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email } = await request.json();

    if (!email) {
      return json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal whether the email exists
      return json({ success: true });
    }

    if (user.emailVerified) {
      return json({ error: 'Email is already verified' }, { status: 400 });
    }

    if (user.status === 'BLOCKED') {
      return json({ error: 'Account is locked', blocked: true }, { status: 403 });
    }

    // Check attempt limit
    if (user.verificationAttempts >= 6) {
      await prisma.user.update({
        where: { id: user.id },
        data: { status: 'BLOCKED' },
      });
      return json({ error: 'Account is locked due to too many attempts', blocked: true }, { status: 403 });
    }

    // Rate limit: check if a token was created less than 60 seconds ago
    // (token expires in 15min, so if expires > 14min from now, it was created < 60s ago)
    const rateLimitThreshold = new Date(Date.now() + 14 * 60 * 1000);
    const recentToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        expires: { gt: rateLimitThreshold },
      },
    });

    if (recentToken) {
      return json({ error: 'Please wait before requesting a new code' }, { status: 429 });
    }

    // Delete old tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // Create new token
    const code = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.verificationToken.create({
      data: { identifier: email, token: code, expires },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationAttempts: { increment: 1 } },
    });

    await sendVerificationEmail({
      to: email,
      userName: user.name || 'there',
      code,
    });

    return json({ success: true });
  } catch (error) {
    console.error('Resend verification error:', error);
    return json({ error: 'Something went wrong' }, { status: 500 });
  }
};
