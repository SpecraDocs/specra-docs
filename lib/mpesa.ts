const MPESA_BASE_URL =
  process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke"

interface MpesaTokenResponse {
  access_token: string
  expires_in: string
}

interface StkPushResponse {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}

interface StkQueryResponse {
  ResponseCode: string
  ResponseDescription: string
  MerchantRequestID: string
  CheckoutRequestID: string
  ResultCode: string
  ResultDesc: string
}

export async function getMpesaToken(): Promise<string> {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString("base64")

  const res = await fetch(
    `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: "GET",
      headers: { Authorization: `Basic ${auth}` },
    }
  )

  if (!res.ok) {
    throw new Error(`M-Pesa OAuth failed: ${res.statusText}`)
  }

  const data: MpesaTokenResponse = await res.json()
  return data.access_token
}

export async function stkPush(
  phoneNumber: string,
  amount: number,
  accountReference: string,
  transactionDesc: string
): Promise<StkPushResponse> {
  const token = await getMpesaToken()
  const timestamp = new Date()
    .toISOString()
    .replace(/[-T:.Z]/g, "")
    .slice(0, 14)

  const shortcode = process.env.MPESA_SHORTCODE!
  const passkey = process.env.MPESA_PASSKEY!
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString(
    "base64"
  )

  // Normalize phone number to 254 format
  const normalizedPhone = normalizePhoneNumber(phoneNumber)

  const res = await fetch(
    `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.ceil(amount),
        PartyA: normalizedPhone,
        PartyB: shortcode,
        PhoneNumber: normalizedPhone,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc,
      }),
    }
  )

  if (!res.ok) {
    throw new Error(`M-Pesa STK Push failed: ${res.statusText}`)
  }

  return res.json()
}

export async function queryTransactionStatus(
  checkoutRequestId: string
): Promise<StkQueryResponse> {
  const token = await getMpesaToken()
  const timestamp = new Date()
    .toISOString()
    .replace(/[-T:.Z]/g, "")
    .slice(0, 14)

  const shortcode = process.env.MPESA_SHORTCODE!
  const passkey = process.env.MPESA_PASSKEY!
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString(
    "base64"
  )

  const res = await fetch(
    `${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      }),
    }
  )

  if (!res.ok) {
    throw new Error(`M-Pesa query failed: ${res.statusText}`)
  }

  return res.json()
}

function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "")

  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1)
  }

  if (cleaned.startsWith("0")) {
    cleaned = "254" + cleaned.slice(1)
  }

  if (!cleaned.startsWith("254")) {
    cleaned = "254" + cleaned
  }

  return cleaned
}
