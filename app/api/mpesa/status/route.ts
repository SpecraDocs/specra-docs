import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { queryTransactionStatus } from "@/lib/mpesa"
import { prisma } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { checkoutRequestId } = await req.json()

    if (!checkoutRequestId) {
      return NextResponse.json(
        { error: "checkoutRequestId is required" },
        { status: 400 }
      )
    }

    // Check our DB first
    const payment = await prisma.payment.findFirst({
      where: {
        providerTxId: checkoutRequestId,
        userId: session.user.id,
      },
    })

    if (payment && payment.status !== "PENDING") {
      return NextResponse.json({
        status: payment.status.toLowerCase(),
        message:
          payment.status === "COMPLETED"
            ? "Payment completed successfully"
            : "Payment failed",
      })
    }

    // Query M-Pesa for status
    const result = await queryTransactionStatus(checkoutRequestId)

    if (result.ResultCode === "0") {
      return NextResponse.json({
        status: "completed",
        message: "Payment completed successfully",
      })
    } else if (result.ResultCode === "1032") {
      return NextResponse.json({
        status: "cancelled",
        message: "Payment was cancelled by user",
      })
    } else {
      return NextResponse.json({
        status: "pending",
        message: result.ResultDesc || "Payment is being processed",
      })
    }
  } catch (error) {
    console.error("M-Pesa status query error:", error)
    return NextResponse.json(
      { error: "Failed to query payment status" },
      { status: 500 }
    )
  }
}
