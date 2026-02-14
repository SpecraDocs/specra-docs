import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db.js';
import { canAccessProject } from '$lib/server/auth-utils.js';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) redirect(302, '/auth/login');

  const { projectId } = params;

  if (!(await canAccessProject(session.user.id, projectId))) {
    error(404, 'Not found');
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      deployments: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      organization: { select: { name: true, slug: true } },
    },
  });

  if (!project) error(404, 'Not found');

  const baseDomain = env.DOCS_BASE_DOMAIN || 'docs.specra.dev';
  const latestDeploy = project.deployments[0];
  const isRunning = latestDeploy?.status === 'RUNNING';
  const siteUrl = `https://${project.subdomain}.${baseDomain}`;

  return {
    project: {
      id: project.id,
      name: project.name,
      subdomain: project.subdomain,
      customDomain: project.customDomain,
      githubRepo: project.githubRepo,
      githubBranch: project.githubBranch,
      organization: project.organization,
      deployments: project.deployments.map((d) => ({
        id: d.id,
        status: d.status,
        trigger: d.trigger,
        commitSha: d.commitSha,
        createdAt: d.createdAt.toISOString(),
      })),
    },
    baseDomain,
    siteUrl,
    isRunning,
  };
};
