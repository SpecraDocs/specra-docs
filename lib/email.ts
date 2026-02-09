import { Resend } from "resend"

export const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.COMPANY_EMAIL || "billing@specra-docs.com"
const COMPANY_NAME = process.env.COMPANY_NAME || "Specra"

export async function sendInvoiceEmail({
  to,
  invoiceNumber,
  pdfBuffer,
  userName,
  planName,
  amount,
  currency,
}: {
  to: string
  invoiceNumber: string
  pdfBuffer: Buffer
  userName: string
  planName: string
  amount: string
  currency: string
}) {
  await resend.emails.send({
    from: `${COMPANY_NAME} Billing <${FROM_EMAIL}>`,
    to,
    subject: `Invoice ${invoiceNumber} - ${COMPANY_NAME}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Invoice ${invoiceNumber}</h2>
        <p>Hi ${userName},</p>
        <p>Thank you for your payment. Please find your invoice attached.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Plan</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${planName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Amount</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${currency} ${amount}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Invoice #</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${invoiceNumber}</td>
          </tr>
        </table>
        <p style="color: #666; font-size: 14px;">
          If you have any questions about this invoice, please contact us at ${FROM_EMAIL}.
        </p>
        <p style="color: #999; font-size: 12px;">${COMPANY_NAME}</p>
      </div>
    `,
    attachments: [
      {
        filename: `${invoiceNumber}.pdf`,
        content: pdfBuffer,
      },
    ],
  })
}
