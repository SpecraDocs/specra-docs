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

	return { plans };
};
