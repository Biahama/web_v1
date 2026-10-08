export const rupees = amount => '₹' + (Number(amount || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })
export const indiaDate = date => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
export const PAID_ORDER_WHERE = { paymentStatus: 'paid', status: { not: 'cancelled' } }

export function reportPeriod(value, now = new Date()) {
  const days = [7, 30, 90].includes(Number(value)) ? Number(value) : 30
  // Midnight IST today, including today plus the preceding calendar days.
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const istNow = new Date(now.getTime() + 330 * 60000)
  today.setUTCFullYear(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate())
  const start = new Date(today.getTime() - 330 * 60000 - (days - 1) * 86400000)
  const previous = new Date(start.getTime() - days * 86400000)
  return { days, start, previous, end: now }
}

export function csvCell(value) {
  // Spreadsheet formula injection must be prevented in customer-controlled values.
  const raw = String(value ?? '')
  const safe = /^[\s]*[=+\-@]/.test(raw) ? "'" + raw : raw
  return '"' + safe.replaceAll('"', '""') + '"'
}
