"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, X, ArrowLeft } from "lucide-react"

const tiers = [
  {
    name: "Free",
    slug: "free",
    priceUsd: 0,
    priceUsdAnnual: 0,
    priceKes: 0,
    priceKesAnnual: 0,
    description: "For hobbyists and open-source projects",
    features: {
      projects: "1 project",
      seats: "1 editor seat",
      customDomain: false,
      removeBranding: false,
      search: "Basic search",
      aiSearch: false,
      apiDocs: false,
      analytics: false,
      versionHistory: "7 days",
      passwordPages: false,
      customCssJs: false,
      gitSync: false,
      sso: false,
      rbac: false,
      auditLogs: false,
      sla: false,
      support: "Community",
    },
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Starter",
    slug: "starter",
    priceUsd: 19,
    priceUsdAnnual: 15,
    priceKes: 2450,
    priceKesAnnual: 2450,
    description: "For indie devs and small startups",
    features: {
      projects: "3 projects",
      seats: "3 seats (+$5/seat)",
      customDomain: true,
      removeBranding: true,
      search: "Basic search",
      aiSearch: false,
      apiDocs: false,
      analytics: "Basic",
      versionHistory: "30 days",
      passwordPages: true,
      customCssJs: false,
      gitSync: false,
      sso: false,
      rbac: false,
      auditLogs: false,
      sla: false,
      support: "Email",
    },
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Pro",
    slug: "pro",
    priceUsd: 49,
    priceUsdAnnual: 39,
    priceKes: 6300,
    priceKesAnnual: 6300,
    description: "For growing teams and API docs",
    features: {
      projects: "10 projects",
      seats: "10 seats (+$8/seat)",
      customDomain: true,
      removeBranding: true,
      search: "Basic search",
      aiSearch: true,
      apiDocs: true,
      analytics: "Advanced",
      versionHistory: "Unlimited",
      passwordPages: true,
      customCssJs: true,
      gitSync: true,
      sso: false,
      rbac: false,
      auditLogs: false,
      sla: false,
      support: "Priority",
    },
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    priceUsd: 149,
    priceUsdAnnual: 129,
    priceKes: 19200,
    priceKesAnnual: 19200,
    description: "For orgs needing SSO and RBAC",
    features: {
      projects: "Unlimited",
      seats: "Unlimited",
      customDomain: true,
      removeBranding: true,
      search: "Basic search",
      aiSearch: true,
      apiDocs: true,
      analytics: "Advanced",
      versionHistory: "Unlimited",
      passwordPages: true,
      customCssJs: true,
      gitSync: true,
      sso: true,
      rbac: true,
      auditLogs: true,
      sla: "99.9%",
      support: "Dedicated",
    },
    cta: "Contact Sales",
    popular: false,
  },
]

const featureLabels: Record<string, string> = {
  projects: "Projects",
  seats: "Editor seats",
  customDomain: "Custom domain",
  removeBranding: "Remove Specra branding",
  search: "Search",
  aiSearch: "AI-powered search",
  apiDocs: "API docs (OpenAPI)",
  analytics: "Analytics",
  versionHistory: "Version history",
  passwordPages: "Password-protected pages",
  customCssJs: "Custom CSS/JS",
  gitSync: "Git sync (GitHub/GitLab)",
  sso: "SSO (SAML/OIDC)",
  rbac: "RBAC",
  auditLogs: "Audit logs",
  sla: "SLA guarantee",
  support: "Support",
}

export default function PricingPage() {
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly")
  const [currency, setCurrency] = useState<"usd" | "kes">("usd")

  function getPrice(tier: (typeof tiers)[number]) {
    if (tier.priceUsd === 0) return "Free"
    if (currency === "kes") {
      const price = interval === "annual" ? tier.priceKesAnnual : tier.priceKes
      return `KES ${price.toLocaleString()}`
    }
    const price = interval === "annual" ? tier.priceUsdAnnual : tier.priceUsd
    return `$${price}`
  }

  function handleSelectPlan(slug: string) {
    if (slug === "free") return
    if (slug === "enterprise") return
    // Redirect to auth, plan selection will happen after
    window.location.href = `/auth/register?plan=${slug}&interval=${interval}&currency=${currency}`
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between px-6 mx-auto">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="font-semibold text-lg text-foreground">Specra</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="container px-6 mx-auto py-16">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your documentation needs. All plans include our core documentation features.
          </p>
        </div>

        {/* Billing controls */}
        <div className="flex items-center justify-center gap-6 mb-12">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1">
            <button
              onClick={() => setInterval("monthly")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                interval === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval("annual")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                interval === "annual"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
              <span className="ml-1.5 text-xs opacity-75">Save 20%</span>
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1">
            <button
              onClick={() => setCurrency("usd")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                currency === "usd"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              USD
            </button>
            <button
              onClick={() => setCurrency("kes")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                currency === "kes"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              KES
            </button>
          </div>
        </div>

        {/* Tier cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-20">
          {tiers.map((tier) => (
            <div
              key={tier.slug}
              className={`relative rounded-xl border p-6 flex flex-col ${
                tier.popular
                  ? "border-primary shadow-lg shadow-primary/10"
                  : "border-border"
              } bg-card`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground">{tier.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{tier.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">
                  {getPrice(tier)}
                </span>
                {tier.priceUsd > 0 && (
                  <span className="text-muted-foreground">/mo</span>
                )}
                {interval === "annual" && tier.priceUsd > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    billed annually
                  </p>
                )}
              </div>

              <button
                onClick={() => handleSelectPlan(tier.slug)}
                className={`w-full rounded-md px-4 py-2.5 text-sm font-medium transition-colors mb-6 ${
                  tier.popular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : tier.slug === "free"
                    ? "border border-border bg-background text-foreground hover:bg-accent"
                    : "border border-border bg-background text-foreground hover:bg-accent"
                }`}
              >
                {tier.cta}
              </button>

              <ul className="space-y-3 flex-1">
                {Object.entries(tier.features).map(([key, value]) => (
                  <li key={key} className="flex items-start gap-2 text-sm">
                    {value === false ? (
                      <X className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                    ) : (
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    )}
                    <span
                      className={
                        value === false
                          ? "text-muted-foreground/40"
                          : "text-foreground"
                      }
                    >
                      {typeof value === "string"
                        ? value
                        : featureLabels[key] || key}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Feature comparison table */}
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">
            Compare all features
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 pr-4 font-medium text-muted-foreground">Feature</th>
                  {tiers.map((tier) => (
                    <th key={tier.slug} className="text-center py-3 px-4 font-medium text-foreground">
                      {tier.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(featureLabels).map(([key, label]) => (
                  <tr key={key} className="border-b border-border/50">
                    <td className="py-3 pr-4 text-foreground">{label}</td>
                    {tiers.map((tier) => {
                      const value = tier.features[key as keyof typeof tier.features]
                      return (
                        <td key={tier.slug} className="text-center py-3 px-4">
                          {value === false ? (
                            <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                          ) : value === true ? (
                            <Check className="h-4 w-4 text-primary mx-auto" />
                          ) : (
                            <span className="text-foreground">{value}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
