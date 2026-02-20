import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '$lib/server/db.js';
import { sendVerificationEmail, sendWelcomeEmail } from '$lib/server/email.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { name, email, password } = await request.json();

    if (!email || !password) {
      return json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        verificationAttempts: 1,
      },
    });

    // Generate 6-digit verification code
    const code = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: code,
        expires,
      },
    });

    await sendVerificationEmail({
      to: email,
      userName: name || 'there',
      code,
    });

    // Send welcome email (non-blocking — don't fail registration if it errors)
    sendWelcomeEmail({ to: email, userName: name || 'there' }).catch((err) =>
      console.error('Welcome email failed:', err)
    );

    return json(
      {
        user: { id: user.id, name: user.name, email: user.email },
        requiresVerification: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
};
