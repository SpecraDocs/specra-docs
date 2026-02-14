import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
  typescript: true,
})

export const PLANS = {
  starter: {
    name: "Starter",
    priceUsd: 1900, // $19 in cents
    priceUsdAnnual: 1500, // $15/mo in cents
    priceKes: 2450,
    priceKesAnnual: 2450,
  },
  pro: {
    name: "Pro",
    priceUsd: 4900,
    priceUsdAnnual: 3900,
    priceKes: 6300,
    priceKesAnnual: 6300,
  },
  enterprise: {
    name: "Enterprise",
    priceUsd: 14900,
    priceUsdAnnual: 12900,
    priceKes: 19200,
    priceKesAnnual: 19200,
  },
} as const
