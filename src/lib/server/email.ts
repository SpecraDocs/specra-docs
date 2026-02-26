/**
 * Email sending via Mailgun HTTP API.
 * No SDK needed — uses fetch + FormData directly.
 */

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY || ""
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || "specra-docs.com"
const MAILGUN_API_URL = `https://api.eu.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`

const BILLING_EMAIL = process.env.COMPANY_EMAIL || "billing@specra-docs.com"
const NOREPLY_EMAIL = `noreply@${MAILGUN_DOMAIN}`
const COMPANY_NAME = process.env.COMPANY_NAME || "Specra"
const APP_URL = process.env.PUBLIC_APP_URL || "https://specra-docs.com"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@specra-docs.com"

async function sendMail({
  from,
  to,
  subject,
  html,
  attachment,
}: {
  from: string
  to: string
  subject: string
  html: string
  attachment?: { filename: string; data: Buffer }
}) {
  const form = new FormData()
  form.append("from", from)
  form.append("to", to)
  form.append("subject", subject)
  form.append("html", html)

  if (attachment) {
    form.append(
      "attachment",
      new Blob([attachment.data]),
      attachment.filename
    )
  }

  const res = await fetch(MAILGUN_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString("base64")}`,
    },
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Mailgun error (${res.status}): ${text}`)
  }

  return res.json()
}

// ── Shared email wrapper ───────────────────────────────────────────────

function wrap(body: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      ${body}
      <p style="color: #999; font-size: 12px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">${COMPANY_NAME} &middot; <a href="${APP_URL}" style="color: #999;">${APP_URL}</a></p>
    </div>
  `
}

// ── Auth emails ────────────────────────────────────────────────────────

export async function sendVerificationEmail({
  to,
  userName,
  code,
}: {
  to: string
  userName: string
  code: string
}) {
  await sendMail({
    from: `${COMPANY_NAME} <${NOREPLY_EMAIL}>`,
    to,
    subject: `${code} — Verify your email`,
    html: wrap(`
      <h2>Verify your email</h2>
      <p>Hi ${userName},</p>
      <p>Enter the following code to verify your email address:</p>
      <div style="margin: 24px 0; text-align: center;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; background: #f4f4f5; padding: 16px 24px; border-radius: 8px; display: inline-block;">${code}</span>
      </div>
      <p style="color: #666; font-size: 14px;">This code expires in 15 minutes. If you didn't create an account, you can safely ignore this email.</p>
    `),
  })
}

export async function sendWelcomeEmail({
  to,
  userName,
}: {
  to: string
  userName: string
}) {
  await sendMail({
    from: `${COMPANY_NAME} <${NOREPLY_EMAIL}>`,
    to,
    subject: `Welcome to ${COMPANY_NAME}!`,
    html: wrap(`
      <h2>Welcome to ${COMPANY_NAME}!</h2>
      <p>Hi ${userName},</p>
      <p>Thanks for signing up. Your account is ready to go.</p>
      <p>Here's what you can do next:</p>
      <ul style="color: #444; line-height: 1.8;">
        <li>Create your first documentation project</li>
        <li>Connect your GitHub repository for auto-deployments</li>
        <li>Explore our docs to learn about all the features</li>
      </ul>
      <p style="margin: 24px 0;">
        <a href="${APP_URL}/dashboard" style="background-color: #0070f3; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Go to Dashboard</a>
      </p>
      <p style="color: #666; font-size: 14px;">If you have any questions, just reply to this email or reach out at ${BILLING_EMAIL}.</p>
    `),
  })
}

export async function sendSecurityCodeEmail({
  to,
  userName,
  code,
}: {
  to: string
  userName: string
  code: string
}) {
  await sendMail({
    from: `${COMPANY_NAME} Security <${NOREPLY_EMAIL}>`,
    to,
    subject: `${code} - Security verification required`,
    html: wrap(`
      <h2>Security Verification Required</h2>
      <p>Hi ${userName},</p>
      <p>We detected that the password you used may have been exposed in a data breach on another service. To protect your account, please enter this code to continue signing in:</p>
      <div style="margin: 24px 0; text-align: center;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; background: #fef2f2; padding: 16px 24px; border-radius: 8px; display: inline-block; color: #b91c1c;">${code}</span>
      </div>
      <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
      <p style="color: #666; font-size: 14px;"><strong>We strongly recommend changing your password</strong> after signing in. Go to your dashboard settings to update it.</p>
      <p style="color: #666; font-size: 14px;">If this wasn't you, someone may have your password. Consider changing it immediately.</p>
    `),
  })
}

// ── Billing emails ─────────────────────────────────────────────────────

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
  await sendMail({
    from: `${COMPANY_NAME} Billing <${BILLING_EMAIL}>`,
    to,
    subject: `Invoice ${invoiceNumber} - ${COMPANY_NAME}`,
    html: wrap(`
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
      <p style="color: #666; font-size: 14px;">If you have any questions about this invoice, please contact us at ${BILLING_EMAIL}.</p>
    `),
    attachment: pdfBuffer.length > 0
      ? { filename: `${invoiceNumber}.pdf`, data: pdfBuffer }
      : undefined,
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
  await sendMail({
    from: `${COMPANY_NAME} Billing <${BILLING_EMAIL}>`,
    to,
    subject: `Your ${COMPANY_NAME} subscription renews soon`,
    html: wrap(`
      <h2>Subscription Renewal Reminder</h2>
      <p>Hi ${userName},</p>
      <p>Your <strong>${planName}</strong> subscription will automatically renew on <strong>${renewalDate}</strong> for <strong>${currency} ${amount}</strong>.</p>
      <p>No action is needed if you'd like to continue your subscription. If you'd like to make changes, you can manage your subscription from your dashboard.</p>
      <p style="margin: 24px 0;">
        <a href="${APP_URL}/dashboard" style="background-color: #0070f3; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Manage Subscription</a>
      </p>
      <p style="color: #666; font-size: 14px;">If you have any questions, please contact us at ${BILLING_EMAIL}.</p>
    `),
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
  await sendMail({
    from: `${COMPANY_NAME} Billing <${BILLING_EMAIL}>`,
    to,
    subject: `Payment failed for your ${COMPANY_NAME} subscription`,
    html: wrap(`
      <h2>Payment Failed</h2>
      <p>Hi ${userName},</p>
      <p>We were unable to process your payment of <strong>${currency} ${amount}</strong> for your <strong>${planName}</strong> subscription.</p>
      <p>Your subscription is now at risk. Please update your payment method to avoid any interruption to your service.</p>
      <p style="margin: 24px 0;">
        <a href="${APP_URL}/dashboard" style="background-color: #e53e3e; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Update Payment Method</a>
      </p>
      <p style="color: #666; font-size: 14px;">If you believe this is an error, please contact us at ${BILLING_EMAIL}.</p>
    `),
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
  await sendMail({
    from: `${COMPANY_NAME} Billing <${BILLING_EMAIL}>`,
    to,
    subject: `Your ${COMPANY_NAME} subscription is expiring soon`,
    html: wrap(`
      <h2>Subscription Expiring Soon</h2>
      <p>Hi ${userName},</p>
      <p>Your <strong>${planName}</strong> subscription will expire on <strong>${expiryDate}</strong>.</p>
      <p>To continue enjoying your subscription benefits, please renew before the expiry date.</p>
      <p style="margin: 24px 0;">
        <a href="${APP_URL}/pricing" style="background-color: #0070f3; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Renew Subscription</a>
      </p>
      <p style="color: #666; font-size: 14px;">If you have any questions, please contact us at ${BILLING_EMAIL}.</p>
    `),
  })
}

// ── Organization emails ────────────────────────────────────────────────

export async function sendOrgInvitationEmail({
  to,
  inviterName,
  orgName,
  role,
  inviteUrl,
}: {
  to: string
  inviterName: string
  orgName: string
  role: string
  inviteUrl: string
}) {
  await sendMail({
    from: `${COMPANY_NAME} <${NOREPLY_EMAIL}>`,
    to,
    subject: `You've been invited to join ${orgName} on ${COMPANY_NAME}`,
    html: wrap(`
      <h2>You're invited!</h2>
      <p><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> as a <strong>${role.toLowerCase()}</strong>.</p>
      <p style="margin: 24px 0;">
        <a href="${inviteUrl}" style="background-color: #0070f3; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Accept Invitation</a>
      </p>
      <p style="color: #666; font-size: 14px;">This invitation expires in 7 days. If you don't have a ${COMPANY_NAME} account, you'll be able to create one when you accept.</p>
    `),
  })
}

// ── Contact / Admin notifications ──────────────────────────────────────

export async function sendContactNotificationEmail({
  senderName,
  senderEmail,
  message,
}: {
  senderName: string
  senderEmail: string
  message: string
}) {
  const { prisma } = await import("$lib/server/db.js")

  // Collect all recipient emails: primary admin + active notification recipients
  const additionalRecipients = await prisma.notificationRecipient.findMany({
    where: { active: true },
    select: { email: true },
  })

  const allEmails = [ADMIN_EMAIL, ...additionalRecipients.map((r) => r.email)]
  const uniqueEmails = [...new Set(allEmails)]

  const html = wrap(`
    <h2>New Contact Form Submission</h2>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 100px;">Name</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${senderName}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="mailto:${senderEmail}">${senderEmail}</a></td>
      </tr>
    </table>
    <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p style="margin: 0; white-space: pre-wrap;">${message}</p>
    </div>
    <p style="margin: 24px 0;">
      <a href="${APP_URL}/admin/feedback" style="background-color: #0070f3; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">View in Admin Panel</a>
    </p>
  `)

  await Promise.allSettled(
    uniqueEmails.map((to) =>
      sendMail({
        from: `${COMPANY_NAME} <${NOREPLY_EMAIL}>`,
        to,
        subject: `New contact form submission from ${senderName}`,
        html,
      })
    )
  )
}
