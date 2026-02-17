import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { getUserSubscription } from '$lib/server/auth-utils.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

export const GET: RequestHandler = async ({ url }) => {
  const projectId = url.searchParams.get('projectId');

  if (!projectId) {
    return json({ enabled: false }, { headers: corsHeaders });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { web3formsKey: true, userId: true },
  });

  if (!project || !project.web3formsKey) {
    return json({ enabled: false }, { headers: corsHeaders });
  }

  // Verify owner has Starter+ plan
  const subscription = await getUserSubscription(project.userId);
  if (!subscription) {
    return json({ enabled: false }, { headers: corsHeaders });
  }
  const slug = subscription.plan.slug;
  if (slug !== 'starter' && slug !== 'pro' && slug !== 'enterprise') {
    return json({ enabled: false }, { headers: corsHeaders });
  }

  return json(
    { enabled: true, accessKey: project.web3formsKey },
    { headers: corsHeaders }
  );
};
