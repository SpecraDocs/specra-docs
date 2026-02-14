import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAdmin } from '$lib/server/permissions.js';
import { prisma } from '$lib/server/db.js';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const GET: RequestHandler = async ({ locals, params }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoiceId } = params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check access: owner or admin
    const admin = await isAdmin(session.user.id);
    if (invoice.userId !== session.user.id && !admin) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!invoice.pdfUrl) {
      return json({ error: 'PDF not available' }, { status: 404 });
    }

    const pdfPath = join(process.cwd(), 'public', invoice.pdfUrl);
    const pdfBuffer = await readFile(pdfPath);

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Invoice download error:', error);
    return json({ error: 'Failed to download invoice' }, { status: 500 });
  }
};
