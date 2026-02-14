import { Resend } from "resend"

export const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.COMPANY_EMAIL || "billing@specra-docs.com"
const COMPANY_NAME = process.env.COMPANY_NAME || "Specra"
const APP_URL = process.env.PUBLIC_APP_URL || "https://specra-docs.com"

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

export async function sendRenewalReminderEmail({
  to,
  userName,
  planName,
  renewalDate,
  amount,
  currency,
}: {
  to: string
  userName: string
  planName: string
  renewalDate: string
  amount: string
  currency: string
}) {
  await resend.emails.send({
    from: `${COMPANY_NAME} Billing <${FROM_EMAIL}>`,
    to,
    subject: `Your ${COMPANY_NAME} subscription renews soon`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Subscription Renewal Reminder</h2>
        <p>Hi ${userName},</p>
        <p>Your <strong>${planName}</strong> subscription will automatically renew on <strong>${renewalDate}</strong> for <strong>${currency} ${amount}</strong>.</p>
        <p>No action is needed if you'd like to continue your subscription. If you'd like to make changes, you can manage your subscription from your dashboard.</p>
        <p style="margin: 24px 0;">
          <a href="${APP_URL}/dashboard" style="background-color: #0070f3; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Manage Subscription</a>
        </p>
        <p style="color: #666; font-size: 14px;">
          If you have any questions, please contact us at ${FROM_EMAIL}.
        </p>
        <p style="color: #999; font-size: 12px;">${COMPANY_NAME}</p>
      </div>
    `,
  })
}

export async function sendPaymentFailedEmail({
  to,
  userName,
  planName,
  amount,
  currency,
}: {
  to: string
  userName: string
  planName: string
  amount: string
  currency: string
}) {
  await resend.emails.send({
    from: `${COMPANY_NAME} Billing <${FROM_EMAIL}>`,
    to,
    subject: `Payment failed for your ${COMPANY_NAME} subscription`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payment Failed</h2>
        <p>Hi ${userName},</p>
        <p>We were unable to process your payment of <strong>${currency} ${amount}</strong> for your <strong>${planName}</strong> subscription.</p>
        <p>Your subscription is now at risk. Please update your payment method to avoid any interruption to your service.</p>
        <p style="margin: 24px 0;">
          <a href="${APP_URL}/dashboard" style="background-color: #e53e3e; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Update Payment Method</a>
        </p>
        <p style="color: #666; font-size: 14px;">
          If you believe this is an error, please contact us at ${FROM_EMAIL}.
        </p>
        <p style="color: #999; font-size: 12px;">${COMPANY_NAME}</p>
      </div>
    `,
  })
}

export async function sendSubscriptionExpiringEmail({
  to,
  userName,
  planName,
  expiryDate,
}: {
  to: string
  userName: string
  planName: string
  expiryDate: string
}) {
  await resend.emails.send({
    from: `${COMPANY_NAME} Billing <${FROM_EMAIL}>`,
    to,
    subject: `Your ${COMPANY_NAME} subscription is expiring soon`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Subscription Expiring Soon</h2>
        <p>Hi ${userName},</p>
        <p>Your <strong>${planName}</strong> subscription will expire on <strong>${expiryDate}</strong>.</p>
        <p>To continue enjoying your subscription benefits, please renew before the expiry date.</p>
        <p style="margin: 24px 0;">
          <a href="${APP_URL}/pricing" style="background-color: #0070f3; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Renew Subscription</a>
        </p>
        <p style="color: #666; font-size: 14px;">
          If you have any questions, please contact us at ${FROM_EMAIL}.
        </p>
        <p style="color: #999; font-size: 12px;">${COMPANY_NAME}</p>
      </div>
    `,
  })
}
