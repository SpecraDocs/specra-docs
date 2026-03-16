import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db.js';

export const load: PageServerLoad = async () => {
	const plans = await prisma.plan.findMany({
		where: { active: true },
		select: {
			slug: true,
			name: true,
			priceUsd: true,
			priceUsdAnnual: true,
			priceKes: true,
			priceKesAnnual: true,
		},
		orderBy: { priceUsd: 'asc' },
	});

	// Convert to a lookup map keyed by slug
	const planPrices: Record<string, {
		usd: number;
		usdAnnual: number;
		kes: number;
		kesAnnual: number;
		name: string;
	}> = {};

	for (const p of plans) {
		planPrices[p.slug] = {
			usd: p.priceUsd,
			usdAnnual: p.priceUsdAnnual ?? p.priceUsd,
			kes: p.priceKes,
			kesAnnual: p.priceKesAnnual ?? p.priceKes,
			name: p.name,
		};
	}

	return { planPrices };
};
