"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CreditCard, Phone, Check, Loader2, Sparkles } from "lucide-react"

interface OrderSummary {
  subtotal: number
  discount: number
  taxRate: number
  taxName: string
  taxAmount: number
  total: number
  currency: string
  couponValid?: boolean
  couponError?: string
}

interface BillingAddress {
  address: string
  city: string
  state: string
  country: string
  postalCode: string
  taxPin: string
}

const TRIAL_DAYS = 14

const countries = [
  { code: "US", name: "United States" },
  { code: "KE", name: "Kenya" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "NG", name: "Nigeria" },
  { code: "ZA", name: "South Africa" },
  { code: "IN", name: "India" },
  { code: "SG", name: "Singapore" },
  { code: "JP", name: "Japan" },
]

const planPrices: Record<string, { usd: number; usdAnnual: number; kes: number; kesAnnual: number; name: string }> = {
  starter: { usd: 1900, usdAnnual: 1500, kes: 2450, kesAnnual: 2450, name: "Starter" },
  pro: { usd: 4900, usdAnnual: 3900, kes: 6300, kesAnnual: 6300, name: "Pro" },
  enterprise: { usd: 14900, usdAnnual: 12900, kes: 19200, kesAnnual: 19200, name: "Enterprise" },
}

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const planSlug = searchParams.get("plan") || ""
  const intervalParam = searchParams.get("interval") || "monthly"
  const currencyParam = searchParams.get("currency") || "usd"
  const isTrial = searchParams.get("trial") === "true"

  const [interval, setInterval] = useState<"monthly" | "annual">(
    intervalParam as "monthly" | "annual"
  )
  const [billing, setBilling] = useState<BillingAddress>({
    address: "",
    city: "",
    state: "",
    country: currencyParam === "kes" ? "KE" : "US",
    postalCode: "",
    taxPin: "",
  })
  const [couponCode, setCouponCode] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState("")
  const [couponError, setCouponError] = useState("")
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [paying, setPaying] = useState(false)
  const [trialError, setTrialError] = useState("")

  const planInfo = planPrices[planSlug]
  const planName = planInfo?.name || planSlug.charAt(0).toUpperCase() + planSlug.slice(1)

  // Get local price for display (fallback if API isn't available yet)
  function getLocalPrice() {
    if (!planInfo) return null
    const isKes = currencyParam === "kes"
    const currency = isKes ? "KES" : "USD"
    const price = isKes
      ? (interval === "annual" ? planInfo.kesAnnual : planInfo.kes)
      : (interval === "annual" ? planInfo.usdAnnual : planInfo.usd)
    return { price, currency }
  }

  // Fetch billing address on mount
  useEffect(() => {
    fetch("/api/billing-address")
      .then((r) => r.json())
      .then((data) => {
        if (data.billingAddress) {
          setBilling({
            address: data.billingAddress.address || "",
            city: data.billingAddress.city || "",
            state: data.billingAddress.state || "",
            country: data.billingAddress.country || (currencyParam === "kes" ? "KE" : "US"),
            postalCode: data.billingAddress.postalCode || "",
            taxPin: data.billingAddress.taxPin || "",
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [currencyParam])

  // Calculate order total via API
  const recalculate = useCallback(async () => {
    if (isTrial) return
    setCalculating(true)
    try {
      const res = await fetch("/api/tax/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: billing.country,
          planId: planSlug,
          interval,
          couponCode: appliedCoupon || undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setOrderSummary(data)
      }
    } catch {
      // ignore - use local fallback
    } finally {
      setCalculating(false)
    }
  }, [billing.country, interval, appliedCoupon, planSlug, isTrial])

  useEffect(() => {
    if (!isTrial && planSlug) {
      recalculate()
    }
  }, [billing.country, interval, appliedCoupon, recalculate, planSlug, isTrial])

  async function handleApplyCoupon() {
    if (!couponCode) return
    setCouponError("")

    const local = getLocalPrice()
    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: couponCode,
        planSlug,
        amount: orderSummary?.subtotal || local?.price || 0,
        currency: orderSummary?.currency || local?.currency || "USD",
      }),
    })

    const data = await res.json()
    if (data.valid) {
      setAppliedCoupon(couponCode.toUpperCase())
      setCouponError("")
    } else {
      setCouponError(data.error || "Invalid coupon")
      setAppliedCoupon("")
    }
  }

  async function handleSaveBilling() {
    if (billing.address && billing.city && billing.country) {
      await fetch("/api/billing-address", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(billing),
      })
    }
  }

  async function handleStartTrial() {
    setPaying(true)
    setTrialError("")
    try {
      const res = await fetch("/api/subscriptions/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planSlug, interval }),
      })

      const data = await res.json()
      if (res.ok) {
        router.push("/dashboard?checkout=trial-started")
      } else {
        setTrialError(data.error || "Failed to start trial")
      }
    } finally {
      setPaying(false)
    }
  }

  async function handleStripeCheckout() {
    setPaying(true)
    try {
      await handleSaveBilling()

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: planSlug,
          interval,
          couponCode: appliedCoupon || undefined,
          billingAddress: billing,
          taxRate: orderSummary?.taxRate || 0,
          taxAmount: orderSummary?.taxAmount || 0,
        }),
      })

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } finally {
      setPaying(false)
    }
  }

  async function handleMpesaPayment() {
    if (!phoneNumber) return
    setPaying(true)
    try {
      await handleSaveBilling()

      const res = await fetch("/api/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          planId: planSlug,
          interval,
          couponCode: appliedCoupon || undefined,
          billingAddress: billing,
        }),
      })

      const data = await res.json()
      if (data.checkoutRequestId) {
        alert(data.message || "Check your phone for the M-Pesa prompt")
        window.location.href = "/dashboard?checkout=mpesa-pending"
      } else {
        alert(data.error || "M-Pesa payment failed")
      }
    } finally {
      setPaying(false)
    }
  }

  function formatCurrency(amount: number, currency: string) {
    if (currency === "KES") return `KES ${amount.toLocaleString()}`
    return `$${(amount / 100).toFixed(2)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const localPrice = getLocalPrice()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container flex h-16 items-center px-6 mx-auto">
          <Link href="/pricing" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="font-semibold text-lg text-foreground">Specra</span>
          </Link>
        </div>
      </header>

      <main className="container px-6 mx-auto py-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          {isTrial ? "Start Your Free Trial" : "Checkout"}
        </h1>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left side */}
          <div className="space-y-6">
            {isTrial ? (
              /* Trial flow - no payment, no billing required */
              <div className="space-y-6">
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-6">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        {TRIAL_DAYS}-day free trial
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Get full access to all {planName} features for {TRIAL_DAYS} days.
                        No credit card required. No charges during the trial period.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-6">
                  <h3 className="text-sm font-medium text-foreground mb-3">What happens next?</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      Instant access to all {planName} plan features
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      No credit card or payment information needed
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      Trial ends automatically after {TRIAL_DAYS} days
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      Upgrade to a paid plan anytime to keep your features
                    </li>
                  </ul>
                </div>

                {trialError && (
                  <p className="text-sm text-red-500 bg-red-500/10 rounded-md px-3 py-2">
                    {trialError}
                  </p>
                )}

                <button
                  onClick={handleStartTrial}
                  disabled={paying}
                  className="w-full flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {paying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {paying ? "Starting trial..." : `Start ${TRIAL_DAYS}-Day Free Trial`}
                </button>

                <p className="text-center text-xs text-muted-foreground">
                  Want to pay now instead?{" "}
                  <Link
                    href={`/checkout?plan=${planSlug}&interval=${interval}&currency=${currencyParam}`}
                    className="text-primary hover:underline"
                  >
                    Go to payment
                  </Link>
                </p>
              </div>
            ) : (
              /* Paid flow */
              <>
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-4">Billing Address</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Country</label>
                      <select
                        value={billing.country}
                        onChange={(e) => setBilling({ ...billing, country: e.target.value })}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                      >
                        {countries.map((c) => (
                          <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Address</label>
                      <input
                        type="text"
                        value={billing.address}
                        onChange={(e) => setBilling({ ...billing, address: e.target.value })}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                        placeholder="Street address"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">City</label>
                        <input
                          type="text"
                          value={billing.city}
                          onChange={(e) => setBilling({ ...billing, city: e.target.value })}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">State/Province</label>
                        <input
                          type="text"
                          value={billing.state}
                          onChange={(e) => setBilling({ ...billing, state: e.target.value })}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Postal Code</label>
                        <input
                          type="text"
                          value={billing.postalCode}
                          onChange={(e) => setBilling({ ...billing, postalCode: e.target.value })}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Tax PIN (optional)</label>
                        <input
                          type="text"
                          value={billing.taxPin}
                          onChange={(e) => setBilling({ ...billing, taxPin: e.target.value })}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                          placeholder="e.g., KRA PIN"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Coupon */}
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-4">Coupon Code</h2>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground font-mono"
                      disabled={!!appliedCoupon}
                    />
                    {appliedCoupon ? (
                      <button
                        onClick={() => {
                          setAppliedCoupon("")
                          setCouponCode("")
                          setCouponError("")
                        }}
                        className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        onClick={handleApplyCoupon}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                  {appliedCoupon && (
                    <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Coupon {appliedCoupon} applied
                    </p>
                  )}
                  {couponError && (
                    <p className="mt-2 text-sm text-red-500">{couponError}</p>
                  )}
                </div>

                {/* Payment Methods */}
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-4">Payment Method</h2>
                  <div className="space-y-3">
                    <button
                      onClick={handleStripeCheckout}
                      disabled={paying}
                      className="w-full flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {paying ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                      Pay with Stripe
                    </button>

                    <div className="border-t border-border my-4" />

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">M-Pesa Phone Number</label>
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="254712345678"
                          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                        />
                        <button
                          onClick={handleMpesaPayment}
                          disabled={paying || !phoneNumber}
                          className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {paying ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Phone className="h-4 w-4" />
                          )}
                          Pay with M-Pesa
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right: Order Summary */}
          <div>
            <div className="rounded-lg border border-border bg-card p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                {isTrial ? "Trial Summary" : "Order Summary"}
              </h2>

              {/* Interval toggle */}
              {!isTrial && (
                <div className="flex gap-1 rounded-md border border-border bg-background p-0.5 mb-6">
                  {(["monthly", "annual"] as const).map((int) => (
                    <button
                      key={int}
                      onClick={() => setInterval(int)}
                      className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                        interval === int
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {int === "monthly" ? "Monthly" : "Annual (Save 20%)"}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground font-medium">
                    {planName} Plan
                  </span>
                </div>

                {isTrial ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Trial period</span>
                      <span className="text-foreground">{TRIAL_DAYS} days</span>
                    </div>
                    {localPrice && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Price after trial ({interval})
                        </span>
                        <span className="text-muted-foreground">
                          {formatCurrency(localPrice.price, localPrice.currency)}/mo
                        </span>
                      </div>
                    )}
                    <div className="border-t border-border pt-3 mt-3">
                      <div className="flex justify-between">
                        <span className="font-semibold text-foreground">Due today</span>
                        <span className="font-semibold text-green-600 text-lg">
                          Free
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        No payment required. No credit card needed.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* API-driven summary */}
                    {orderSummary ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="text-foreground">
                            {formatCurrency(orderSummary.subtotal, orderSummary.currency)}
                          </span>
                        </div>

                        {orderSummary.discount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-green-600">
                              Discount {appliedCoupon ? `(${appliedCoupon})` : ""}
                            </span>
                            <span className="text-green-600">
                              -{formatCurrency(orderSummary.discount, orderSummary.currency)}
                            </span>
                          </div>
                        )}

                        {orderSummary.taxAmount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {orderSummary.taxName} ({(orderSummary.taxRate * 100).toFixed(0)}%)
                            </span>
                            <span className="text-foreground">
                              {formatCurrency(orderSummary.taxAmount, orderSummary.currency)}
                            </span>
                          </div>
                        )}

                        <div className="border-t border-border pt-3 mt-3">
                          <div className="flex justify-between">
                            <span className="font-semibold text-foreground">Total</span>
                            <span className="font-semibold text-foreground text-lg">
                              {calculating ? (
                                <Loader2 className="h-4 w-4 animate-spin inline" />
                              ) : (
                                formatCurrency(orderSummary.total, orderSummary.currency)
                              )}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            per {interval === "annual" ? "year" : "month"}
                          </p>
                        </div>
                      </>
                    ) : localPrice ? (
                      /* Fallback: show local price while API loads */
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="text-foreground">
                            {calculating ? (
                              <Loader2 className="h-3 w-3 animate-spin inline" />
                            ) : (
                              formatCurrency(localPrice.price, localPrice.currency)
                            )}
                          </span>
                        </div>
                        <div className="border-t border-border pt-3 mt-3">
                          <div className="flex justify-between">
                            <span className="font-semibold text-foreground">Total</span>
                            <span className="font-semibold text-foreground text-lg">
                              {formatCurrency(localPrice.price, localPrice.currency)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            per {interval === "annual" ? "year" : "month"}
                          </p>
                        </div>
                      </>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
