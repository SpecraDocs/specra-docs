import { prisma } from "./db.js"

const DEFAULT_TAX_RATE = parseFloat(process.env.DEFAULT_TAX_RATE || "0")

export async function getTaxRate(country: string): Promise<{ rate: number; name: string }> {
  const config = await prisma.taxConfig.findUnique({
    where: { country: country.toUpperCase() },
  })

  if (config && config.active) {
    return { rate: config.rate, name: config.name }
  }

  return { rate: DEFAULT_TAX_RATE, name: "Tax" }
}

export function calculateTax(amount: number, taxRate: number): number {
  return Math.round(amount * taxRate)
}

export async function calculateOrderTotal({
  planPrice,
  discount,
  country,
}: {
  planPrice: number
  discount: number
  country: string
}): Promise<{
  subtotal: number
  discount: number
  taxRate: number
  taxName: string
  taxAmount: number
  total: number
}> {
  const subtotal = planPrice
  const afterDiscount = Math.max(0, subtotal - discount)
  const { rate: taxRate, name: taxName } = await getTaxRate(country)
  const taxAmount = calculateTax(afterDiscount, taxRate)
  const total = afterDiscount + taxAmount

  return { subtotal, discount, taxRate, taxName, taxAmount, total }
}
