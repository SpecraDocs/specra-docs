import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { sendContactNotificationEmail } from '$lib/server/email.js';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { name, email, message } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return json({ error: 'Name is required' }, { status: 400 });
  }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return json({ error: 'Valid email is required' }, { status: 400 });
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return json({ error: 'Message is required' }, { status: 400 });
  }

  await prisma.feedbackItem.create({
    data: {
      projectId: null,
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      source: 'CONTACT_FORM',
    },
  });

  sendContactNotificationEmail({
    senderName: name.trim(),
    senderEmail: email.trim(),
    message: message.trim(),
  }).catch((err) => console.error('Contact notification email failed:', err));

  return json({ success: true });
};
