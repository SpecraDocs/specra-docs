import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#333",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  companyName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111",
  },
  companyDetails: {
    fontSize: 9,
    color: "#666",
    textAlign: "right",
  },
  invoiceTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#111",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  infoBlock: {
    width: "45%",
  },
  label: {
    fontSize: 8,
    color: "#999",
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 10,
    color: "#333",
    marginBottom: 2,
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  colDescription: { width: "50%" },
  colQty: { width: "15%", textAlign: "center" },
  colRate: { width: "17.5%", textAlign: "right" },
  colAmount: { width: "17.5%", textAlign: "right" },
  headerText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summarySection: {
    alignItems: "flex-end",
    marginTop: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 200,
    paddingVertical: 4,
  },
  summaryLabel: {
    width: 100,
    textAlign: "right",
    paddingRight: 10,
    color: "#666",
  },
  summaryValue: {
    width: 100,
    textAlign: "right",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 200,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#333",
    marginTop: 4,
  },
  totalLabel: {
    width: 100,
    textAlign: "right",
    paddingRight: 10,
    fontWeight: "bold",
    fontSize: 12,
    color: "#111",
  },
  totalValue: {
    width: 100,
    textAlign: "right",
    fontWeight: "bold",
    fontSize: 12,
    color: "#111",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
    fontSize: 8,
    color: "#999",
    textAlign: "center",
  },
})

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

function formatCurrency(amount: number, currency: string): string {
  if (currency === "KES") {
    return `KES ${amount.toLocaleString()}`
  }
  return `$${(amount / 100).toFixed(2)}`
}

function InvoicePDF({ data }: { data: InvoiceData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{data.companyName}</Text>
          </View>
          <View style={styles.companyDetails}>
            <Text>{data.companyAddress}</Text>
            <Text>{data.companyEmail}</Text>
          </View>
        </View>

        <Text style={styles.invoiceTitle}>Invoice {data.invoiceNumber}</Text>

        <View style={styles.infoRow}>
          <View style={styles.infoBlock}>
            <Text style={styles.label}>Bill To</Text>
            <Text style={styles.value}>{data.customerName}</Text>
            <Text style={styles.value}>{data.customerEmail}</Text>
            {data.billingAddress && (
              <>
                <Text style={styles.value}>{data.billingAddress.address}</Text>
                <Text style={styles.value}>
                  {data.billingAddress.city}
                  {data.billingAddress.state ? `, ${data.billingAddress.state}` : ""}
                  {data.billingAddress.postalCode ? ` ${data.billingAddress.postalCode}` : ""}
                </Text>
                <Text style={styles.value}>{data.billingAddress.country}</Text>
                {data.billingAddress.taxPin && (
                  <Text style={styles.value}>Tax PIN: {data.billingAddress.taxPin}</Text>
                )}
              </>
            )}
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.label}>Invoice Details</Text>
            <Text style={styles.value}>Invoice #: {data.invoiceNumber}</Text>
            <Text style={styles.value}>Date: {data.date}</Text>
            <Text style={styles.value}>Currency: {data.currency}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colDescription]}>Description</Text>
            <Text style={[styles.headerText, styles.colQty]}>Qty</Text>
            <Text style={[styles.headerText, styles.colRate]}>Rate</Text>
            <Text style={[styles.headerText, styles.colAmount]}>Amount</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.colDescription}>
              {data.planName} Plan ({data.interval})
            </Text>
            <Text style={[styles.colQty, { textAlign: "center" }]}>1</Text>
            <Text style={styles.colRate}>
              {formatCurrency(data.subtotal, data.currency)}
            </Text>
            <Text style={styles.colAmount}>
              {formatCurrency(data.subtotal, data.currency)}
            </Text>
          </View>
        </View>

        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(data.subtotal, data.currency)}
            </Text>
          </View>
          {data.discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Discount{data.couponCode ? ` (${data.couponCode})` : ""}
              </Text>
              <Text style={styles.summaryValue}>
                -{formatCurrency(data.discount, data.currency)}
              </Text>
            </View>
          )}
          {data.taxAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {data.taxName} ({(data.taxRate * 100).toFixed(0)}%)
              </Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(data.taxAmount, data.currency)}
              </Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(data.total, data.currency)}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Thank you for your business!</Text>
          <Text>{data.companyName} - {data.companyEmail}</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  const buffer = await renderToBuffer(<InvoicePDF data={data} />)
  return Buffer.from(buffer)
}
