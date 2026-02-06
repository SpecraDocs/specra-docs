import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user?.id) return null
  return session.user
}

export async function getUserSubscription(userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ["ACTIVE", "TRIALING"] },
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  })
  return subscription
}

export async function getUserWithSubscription(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        where: { status: { in: ["ACTIVE", "TRIALING"] } },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })
  return user
}

export function getPlanFeatures(plan: { features: unknown }) {
  return (plan.features as Record<string, unknown>) ?? {}
}
