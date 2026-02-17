import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { getUserSubscription } from '$lib/server/auth-utils.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    select: { chatEnabled: true, userId: true },
  });

  if (!project || !project.chatEnabled) {
    return json({ enabled: false }, { headers: corsHeaders });
  }

  // Verify owner has Pro+ plan
  const subscription = await getUserSubscription(project.userId);
  if (!subscription) {
    return json({ enabled: false }, { headers: corsHeaders });
  }
  const slug = subscription.plan.slug;
  if (slug !== 'pro' && slug !== 'enterprise') {
    return json({ enabled: false }, { headers: corsHeaders });
  }

  return json({ enabled: true }, { headers: corsHeaders });
};

export const POST: RequestHandler = async ({ request }) => {
  const { projectId, visitorId, visitorName, visitorEmail } = await request.json();

  if (!projectId || !visitorId) {
    return json({ error: 'projectId and visitorId are required' }, { status: 400, headers: corsHeaders });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { chatEnabled: true, userId: true },
  });

  if (!project || !project.chatEnabled) {
    return json({ error: 'Chat is not enabled for this project' }, { status: 403, headers: corsHeaders });
  }

  // Verify owner has Pro+ plan
  const subscription = await getUserSubscription(project.userId);
  if (!subscription) {
    return json({ error: 'Chat is not available' }, { status: 403, headers: corsHeaders });
  }
  const slug = subscription.plan.slug;
  if (slug !== 'pro' && slug !== 'enterprise') {
    return json({ error: 'Chat is not available' }, { status: 403, headers: corsHeaders });
  }

  const conversation = await prisma.chatConversation.create({
    data: {
      projectId,
      visitorId,
      visitorName: visitorName || null,
      visitorEmail: visitorEmail || null,
    },
  });

  return json({ conversation }, { headers: corsHeaders });
};
