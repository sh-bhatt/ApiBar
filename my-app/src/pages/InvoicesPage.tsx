import { useEffect, useState } from 'react'
import {
  useCreatePaymentOrder,
  useGenerateInvoice,
  useInvoices,
  useVerifyPayment,
  useCurrentBill,
  usePaymentHistory,
} from '../hooks/useMeterflowApi'
import { getQueryErrorMessage } from '../lib/queryError'
import { FileText, CreditCard, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react'

declare global {
  interface Window {
    Razorpay?: new (options: {
      key: string
      amount: number
      currency: string
      name: string
      description: string
      order_id: string
      handler: (response: {
        razorpay_order_id: string
        razorpay_payment_id: string
        razorpay_signature: string
      }) => void
      modal?: {
        ondismiss?: () => void
      }
      theme?: {
        color?: string
      }
    }) => { open: () => void }
  }
}

function formatInr(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

function useRazorpayScript() {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (window.Razorpay) {
      setLoaded(true)
      return
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-meterflow-razorpay="true"]',
    )
    if (existing) {
      const onLoad = () => setLoaded(true)
      const onError = () => setFailed(true)
      existing.addEventListener('load', onLoad)
      existing.addEventListener('error', onError)
      return () => {
        existing.removeEventListener('load', onLoad)
        existing.removeEventListener('error', onError)
      }
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.dataset.meterflowRazorpay = 'true'
    script.onload = () => setLoaded(true)
    script.onerror = () => setFailed(true)
    document.body.appendChild(script)

    return () => {
      script.onload = null
      script.onerror = null
    }
  }, [])

  return { loaded, failed }
}

export function InvoicesPage() {
  const invoices = useInvoices()
  const currentBill = useCurrentBill()
  const paymentHistory = usePaymentHistory()
  const generateInvoice = useGenerateInvoice()
  const createOrder = useCreatePaymentOrder()
  const verifyPayment = useVerifyPayment()
  const { loaded: razorpayLoaded, failed: razorpayFailed } = useRazorpayScript()
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null)

  async function onPayNow(invoiceId: string, month: string) {
    if (!window.Razorpay) {
      return
    }

    const order = await createOrder.mutateAsync({ billingId: invoiceId })

    const razorpay = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: 'MeterFlow',
      description: `Invoice payment for ${month}`,
      order_id: order.orderId,
      handler: async (response) => {
        await verifyPayment.mutateAsync({
          billingId: invoiceId,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        })
      },
      theme: {
        color: '#6C63FF',
      },
    })

    razorpay.open()
  }

  if (invoices.isLoading || currentBill.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading invoices...</div>
      </div>
    )
  }

  if (invoices.error || currentBill.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Failed to load invoice data</div>
      </div>
    )
  }

  // Calculate summary statistics
  const totalPaid = invoices.data?.filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amountINR, 0) || 0
  const outstandingBalance = invoices.data?.filter(inv => inv.status === 'unpaid')
    .reduce((sum, inv) => sum + inv.amountINR, 0) || 0
  const currentMonthEstimate = currentBill.data?.amountINR || 0

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Billing & Invoices</h1>
            <p className="mt-2 text-gray-600">
              Manage your invoices, payments, and billing history
            </p>
          </div>
          <button
            type="button"
            disabled={generateInvoice.isPending}
            onClick={() => generateInvoice.mutate()}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>{generateInvoice.isPending ? 'Generating...' : 'Generate Invoice'}</span>
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Month Estimate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatInr(currentMonthEstimate)}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {currentBill.data?.month || 'Current month'}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Paid to Date</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatInr(totalPaid)}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {invoices.data?.filter(inv => inv.status === 'paid').length || 0} invoices
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Outstanding Balance</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatInr(outstandingBalance)}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {invoices.data?.filter(inv => inv.status === 'unpaid').length || 0} unpaid
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Error Messages */}
        {generateInvoice.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {getQueryErrorMessage(generateInvoice.error)}
          </div>
        )}
        {createOrder.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {getQueryErrorMessage(createOrder.error)}
          </div>
        )}
        {verifyPayment.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {getQueryErrorMessage(verifyPayment.error)}
          </div>
        )}
        {razorpayFailed && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Razorpay checkout could not be loaded. Refresh and try again.
          </div>
        )}

        {/* Invoices Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice History</h2>
            
            {invoices.data!.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices yet</h3>
                <p className="text-gray-500 mb-6">
                  Generate your first invoice to snapshot this month's usage.
                </p>
                <button
                  type="button"
                  disabled={generateInvoice.isPending}
                  onClick={() => generateInvoice.mutate()}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Generate First Invoice
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Month</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Total Requests</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Free Requests</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Billable</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Amount</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.data!.map((invoice) => (
                      <>
                        <tr
                          key={invoice.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => setExpandedInvoice(expandedInvoice === invoice.id ? null : invoice.id)}
                        >
                          <td className="py-3 px-4 font-medium text-gray-900">{invoice.month}</td>
                          <td className="py-3 px-4 text-right text-gray-900">
                            {invoice.totalRequests.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-600">
                            {invoice.freeRequests.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-600">
                            {invoice.billableRequests.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-gray-900">
                            {formatInr(invoice.amountINR)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                invoice.status === 'paid'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {invoice.status === 'paid' ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Paid
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 mr-1" />
                                  Unpaid
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {invoice.status === 'unpaid' && invoice.amountINR >= 1 ? (
                              <button
                                type="button"
                                disabled={
                                  !razorpayLoaded || createOrder.isPending || verifyPayment.isPending
                                }
                                onClick={(e) => {
                                  e.stopPropagation()
                                  void onPayNow(invoice.id, invoice.month)
                                }}
                                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center space-x-1 ml-auto"
                              >
                                <CreditCard className="w-4 h-4" />
                                <span>{createOrder.isPending || verifyPayment.isPending ? 'Processing...' : 'Pay Now'}</span>
                              </button>
                            ) : invoice.status === 'unpaid' && invoice.amountINR > 0 && invoice.amountINR < 1 ? (
                              <span className="text-sm text-amber-600">Amount too small</span>
                            ) : invoice.status === 'unpaid' ? (
                              <span className="text-sm text-gray-500">No payment due</span>
                            ) : (
                              <span className="text-sm text-green-600">Paid</span>
                            )}
                          </td>
                        </tr>
                        {expandedInvoice === invoice.id && invoice.breakdown && (
                          <tr className="bg-gray-50">
                            <td colSpan={7} className="py-4 px-4">
                              <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Per-API Breakdown</h4>
                                <div className="grid grid-cols-1 gap-2">
                                  {invoice.breakdown.map((item, idx) => (
                                    <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-gray-900">{item.apiName}</span>
                                        <span className="text-sm font-semibold text-gray-900">{formatInr(item.amountINR)}</span>
                                      </div>
                                      <div className="grid grid-cols-4 gap-4 text-xs text-gray-600">
                                        <div>
                                          <span className="block text-gray-500">Total</span>
                                          <span className="font-medium">{item.totalRequests.toLocaleString()}</span>
                                        </div>
                                        <div>
                                          <span className="block text-gray-500">Free</span>
                                          <span className="font-medium">{item.freeRequests.toLocaleString()}</span>
                                        </div>
                                        <div>
                                          <span className="block text-gray-500">Billable</span>
                                          <span className="font-medium">{item.billableRequests.toLocaleString()}</span>
                                        </div>
                                        <div>
                                          <span className="block text-gray-500">Type</span>
                                          <span className="font-medium">{item.pricingType}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Payment History Section */}
        {paymentHistory.data && paymentHistory.data.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">API/Description</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Amount</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.data.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            item.type === 'prepaid_topup'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {item.type === 'prepaid_topup' ? 'Prepaid Topup' : 'Postpaid Payment'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-900">{item.apiName}</td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        {formatInr(item.amount)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        {item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Paid
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
