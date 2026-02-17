import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { unlink } from 'fs/promises';
import path from 'path';

const PROJECTS_DIR = process.env.PROJECTS_DATA_DIR || '/data/specra/projects';
const HARD_CAP_DAYS = 90;

export const GET: RequestHandler = async ({ request }) => {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - HARD_CAP_DAYS);

  const results = {
    cleaned: 0,
    errors: [] as string[],
  };

  try {
    const staleDeployments = await prisma.deployment.findMany({
      where: {
        archivePath: { not: null },
        status: { in: ['STOPPED', 'FAILED'] },
        createdAt: { lt: cutoff },
      },
      select: { id: true, projectId: true, archivePath: true },
    });

    for (const dep of staleDeployments) {
      try {
        const filePath = path.join(PROJECTS_DIR, dep.projectId, dep.archivePath!);
        await unlink(filePath);
      } catch {
        // File may already be gone, that's fine
      }

      try {
        await prisma.deployment.update({
          where: { id: dep.id },
          data: { archivePath: null },
        });
        results.cleaned++;
      } catch (err) {
        results.errors.push(`Failed to update deployment ${dep.id}: ${err}`);
      }
    }

    return json({
      success: true,
      cleaned: results.cleaned,
      errors: results.errors,
    });
  } catch (error) {
    console.error('Cron cleanup-archives error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
