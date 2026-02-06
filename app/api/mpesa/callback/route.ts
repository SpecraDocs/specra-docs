import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

interface MpesaCallbackItem {
  Name: string
  Value?: string | number
}

interface MpesaCallbackBody {
  Body: {
    stkCallback: {
      MerchantRequestID: string
      CheckoutRequestID: string
      ResultCode: number
      ResultDesc: string
      CallbackMetadata?: {
        Item: MpesaCallbackItem[]
      }
    }
  }
}

export async function POST(req: Request) {
  try {
    const body: MpesaCallbackBody = await req.json()
    const callback = body.Body.stkCallback

    const { CheckoutRequestID, ResultCode, ResultDesc } = callback

    // Find the pending payment
    const payment = await prisma.payment.findFirst({
      where: { providerTxId: CheckoutRequestID, provider: "MPESA" },
    })

    if (!payment) {
      console.error("M-Pesa callback: Payment not found for", CheckoutRequestID)
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" })
    }

    if (ResultCode === 0) {
      // Payment successful
      const metadata = callback.CallbackMetadata?.Item ?? []
      const mpesaReceiptNumber = metadata.find(
        (item) => item.Name === "MpesaReceiptNumber"
      )?.Value as string | undefined

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "COMPLETED",
          providerTxId: mpesaReceiptNumber ?? CheckoutRequestID,
        },
      })

      // Find the plan from the pending payment context
      // The plan info should be stored when initiating STK push
      // For now, activate subscription based on the payment
      const existingPendingSub = await prisma.subscription.findFirst({
        where: {
          userId: payment.userId,
          paymentProvider: "MPESA",
          status: "INCOMPLETE",
        },
        orderBy: { createdAt: "desc" },
      })

      if (existingPendingSub) {
        // Cancel any other active subscriptions
        await prisma.subscription.updateMany({
          where: {
            userId: payment.userId,
            status: "ACTIVE",
            id: { not: existingPendingSub.id },
          },
          data: { status: "CANCELLED" },
        })

        const now = new Date()
        const periodEnd = new Date(now)
        periodEnd.setMonth(periodEnd.getMonth() + 1)

        await prisma.subscription.update({
          where: { id: existingPendingSub.id },
          data: {
            status: "ACTIVE",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        })

        await prisma.payment.update({
          where: { id: payment.id },
          data: { subscriptionId: existingPendingSub.id },
        })
      }
    } else {
      // Payment failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      })

      console.error("M-Pesa payment failed:", ResultDesc)
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" })
  } catch (error) {
    console.error("M-Pesa callback error:", error)
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" })
  }
}
