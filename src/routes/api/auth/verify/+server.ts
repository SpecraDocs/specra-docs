import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import crypto from 'crypto';
import { authenticateApiRequest } from '$lib/server/api-auth.js';
import { prisma } from '$lib/server/db.js';
import { sendVerificationEmail } from '$lib/server/email.js';

export const GET: RequestHandler = async ({ request }) => {
  const user = await authenticateApiRequest(request.headers.get('authorization'));

  if (!user) {
    return json({ error: 'Invalid token' }, { status: 401 });
  }

  return json({
    id: user.id,
    email: user.email,
    name: user.name,
  });
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return json({ error: 'Email and code are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return json({ error: 'Invalid code' }, { status: 400 });
    }

    if (user.status === 'BLOCKED') {
      return json({ error: 'Account is locked', blocked: true }, { status: 403 });
    }

    // Find a matching token
    const token = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        token: code,
      },
    });

    if (!token) {
      return json({ error: 'Invalid code' }, { status: 400 });
    }

    // Check if token is expired
    if (token.expires < new Date()) {
      await prisma.verificationToken.delete({
        where: {
          identifier_token: { identifier: email, token: code },
        },
      });

      if (user.verificationAttempts >= 6) {
        await prisma.user.update({
          where: { id: user.id },
          data: { status: 'BLOCKED' },
        });
        return json({ error: 'Account is locked due to too many attempts', blocked: true }, { status: 403 });
      }

      // Auto-resend a new code
      const newCode = crypto.randomInt(100000, 999999).toString();
      const expires = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.verificationToken.create({
        data: { identifier: email, token: newCode, expires },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { verificationAttempts: { increment: 1 } },
      });

      await sendVerificationEmail({
        to: email,
        userName: user.name || 'there',
        code: newCode,
      });

      return json(
        { error: 'Code expired. A new code has been sent.', resent: true },
        { status: 400 }
      );
    }

    // Valid token — verify the user
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date(), verificationAttempts: 0 },
    });

    await prisma.verificationToken.delete({
      where: {
        identifier_token: { identifier: email, token: code },
      },
    });

    return json({ success: true });
  } catch (error) {
    console.error('Verification error:', error);
    return json({ error: 'Something went wrong' }, { status: 500 });
  }
};
