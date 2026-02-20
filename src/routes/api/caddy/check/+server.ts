import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';

const BASE_DOMAIN = process.env.DOCS_BASE_DOMAIN || 'docs.specra-docs.com';
const APP_DOMAIN = 'specra-docs.com';

/**
 * Caddy on-demand TLS permission endpoint.
 * Caddy calls this with ?domain=<hostname> before provisioning a certificate.
 * Return 200 to allow, non-200 to deny.
 */
export const GET: RequestHandler = async ({ url }) => {
	const domain = url.searchParams.get('domain');
	if (!domain) {
		return new Response('Missing domain', { status: 400 });
	}

	// Always allow the main app domain
	if (domain === APP_DOMAIN || domain === `www.${APP_DOMAIN}`) {
		return new Response('OK', { status: 200 });
	}

	// Check if it's a known subdomain (e.g., myproject.docs.specra-docs.com)
	if (domain.endsWith(`.${BASE_DOMAIN}`)) {
		const subdomain = domain.replace(`.${BASE_DOMAIN}`, '');
		const project = await prisma.project.findUnique({
			where: { subdomain },
			select: { id: true },
		});
		if (project) {
			return new Response('OK', { status: 200 });
		}
	}

	// Check if it's a known custom domain
	const projectWithCustomDomain = await prisma.project.findUnique({
		where: { customDomain: domain },
		select: { id: true },
	});
	if (projectWithCustomDomain) {
		return new Response('OK', { status: 200 });
	}

	return new Response('Domain not recognized', { status: 403 });
};
