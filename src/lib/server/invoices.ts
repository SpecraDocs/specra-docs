import { prisma } from "./db.js"
import { sendInvoiceEmail } from "./email.js"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

const COMPANY_NAME = process.env.COMPANY_NAME || "Specra"
const COMPANY_ADDRESS = process.env.COMPANY_ADDRESS || ""
const COMPANY_EMAIL = process.env.COMPANY_EMAIL || "billing@specra-docs.com"

export async function generateInvoiceNumber(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`

  const lastInvoice = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: `INV-${yearMonth}` } },
    orderBy: { invoiceNumber: "desc" },
  })

  let sequence = 1
  if (lastInvoice) {
    const lastSeq = parseInt(lastInvoice.invoiceNumber.split("-")[2], 10)
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1
    }
  }

  return `INV-${yearMonth}-${String(sequence).padStart(4, "0")}`
}

function formatAmount(amount: number, currency: string): string {
  if (currency === "KES") {
    return amount.toLocaleString()
  }
  if (currency === "CRYPTO") {
    return (amount / 100).toFixed(2)
  }
  return (amount / 100).toFixed(2)
}

export interface InvoiceData {
  invoiceNumber: string
  date: string
  companyName: string
  companyAddress: string
  companyEmail: string
  customerName: string
  customerEmail: string
  billingAddress?: {
    address: string
    city: string
    state?: string
    country: string
    postalCode?: string
    taxPin?: string
  }
  planName: string
  interval: string
  currency: string
  subtotal: number
  discount: number
  couponCode?: string
  taxRate: number
  taxName: string
  taxAmount: number
  total: number
}

export async function createAndSendInvoice(paymentId: string): Promise<void> {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: true,
        subscription: { include: { plan: true } },
      },
    })

    if (!payment || payment.status !== "COMPLETED") return

    // Don't create duplicate invoices
    const existingInvoice = await prisma.invoice.findUnique({
      where: { paymentId },
    })
    if (existingInvoice) return

    const billingAddress = await prisma.billingAddress.findUnique({
      where: { userId: payment.userId },
    })

    const planName = payment.subscription?.plan?.name || "Subscription"
    const interval = payment.subscription?.interval || "MONTHLY"
    const invoiceNumber = await generateInvoiceNumber()

    const subtotal = payment.amount
    const taxAmount = payment.taxAmount || 0
    const discount = payment.couponCode
      ? subtotal - (payment.amount - taxAmount)
      : 0
    // Reconstruct: total = amount, subtotal = amount - taxAmount + discount
    const reconstructedSubtotal = payment.amount - taxAmount + Math.abs(discount)
    const total = payment.amount

    const billingSnapshot = billingAddress
      ? {
          address: billingAddress.address,
          city: billingAddress.city,
          state: billingAddress.state ?? undefined,
          country: billingAddress.country,
          postalCode: billingAddress.postalCode ?? undefined,
          taxPin: billingAddress.taxPin ?? undefined,
        }
      : undefined

    const invoiceCreateData: Record<string, unknown> = {
      invoiceNumber,
      userId: payment.userId,
      paymentId: payment.id,
      subtotal: reconstructedSubtotal,
      discount: Math.abs(discount),
      taxAmount,
      taxRate: taxAmount > 0 && reconstructedSubtotal - Math.abs(discount) > 0
        ? taxAmount / (reconstructedSubtotal - Math.abs(discount))
        : 0,
      total,
      currency: payment.currency,
      couponCode: payment.couponCode,
      taxPin: billingAddress?.taxPin ?? null,
    }

    if (billingSnapshot) {
      invoiceCreateData.billingAddress = billingSnapshot
    }

    const invoice = await prisma.invoice.create({
      data: invoiceCreateData as Parameters<typeof prisma.invoice.create>[0]["data"],
    })

    // Generate PDF
    // NOTE: PDF generation (generateInvoicePDF) requires a React-based renderer
    // and should be handled separately. For now, we prepare the data and skip PDF generation.
    const pdfData: InvoiceData = {
      invoiceNumber,
      date: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      companyName: COMPANY_NAME,
      companyAddress: COMPANY_ADDRESS,
      companyEmail: COMPANY_EMAIL,
      customerName: payment.user.name || payment.user.email,
      customerEmail: payment.user.email,
      billingAddress: billingSnapshot,
      planName,
      interval: interval === "ANNUAL" ? "Annual" : "Monthly",
      currency: payment.currency,
      subtotal: reconstructedSubtotal,
      discount: Math.abs(discount),
      couponCode: payment.couponCode || undefined,
      taxRate: invoice.taxRate,
      taxName: "Tax",
      taxAmount,
      total,
    }

    // TODO: Integrate PDF generation (invoice-pdf) once migrated
    // const pdfBuffer = await generateInvoicePDF(pdfData)
    const pdfBuffer = Buffer.from("") // placeholder

    // Save PDF to static directory
    const invoicesDir = join(process.cwd(), "static", "invoices")
    await mkdir(invoicesDir, { recursive: true })
    const pdfPath = join(invoicesDir, `${invoiceNumber}.pdf`)
    await writeFile(pdfPath, pdfBuffer)

    const pdfUrl = `/invoices/${invoiceNumber}.pdf`

    // Send email
    try {
      await sendInvoiceEmail({
        to: payment.user.email,
        invoiceNumber,
        pdfBuffer,
        userName: payment.user.name || payment.user.email,
        planName,
        amount: formatAmount(total, payment.currency),
        currency: payment.currency,
      })

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { pdfUrl, sentAt: new Date() },
      })
    } catch (emailErr) {
      console.error("Failed to send invoice email:", emailErr)
      // Still save the PDF URL even if email fails
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { pdfUrl },
      })
    }
  } catch (error) {
    console.error("Failed to create invoice:", error)
  }
}
