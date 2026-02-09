import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/db"
import { readFile } from "fs/promises"
import { join } from "path"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { invoiceId } = await params

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Check access: owner or admin
    const admin = await isAdmin(session.user.id)
    if (invoice.userId !== session.user.id && !admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!invoice.pdfUrl) {
      return NextResponse.json({ error: "PDF not available" }, { status: 404 })
    }

    const pdfPath = join(process.cwd(), "public", invoice.pdfUrl)
    const pdfBuffer = await readFile(pdfPath)

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Invoice download error:", error)
    return NextResponse.json({ error: "Failed to download invoice" }, { status: 500 })
  }
}
