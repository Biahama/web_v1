// ============================================================
// SHIPROCKET — our shipping partner's API
// ============================================================
// Shiprocket picks up parcels from you and delivers them via
// couriers (Delhivery, Bluedart, etc.). This file talks to
// their API so the admin panel can, with one click:
//   1. send an order to Shiprocket        (createShiprocketOrder)
//   2. book a courier + get a tracking no (assignAwb)
//   3. check where the parcel is          (trackByShipmentId)
//
// Setup needed once:
//   * SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD in .env.local /
//     Vercel — the login you use at app.shiprocket.in
//   * A pickup address saved in your Shiprocket dashboard
//     (Settings -> Pickup Addresses). Its nickname should be
//     "Primary" (Shiprocket's default), or set
//     SHIPROCKET_PICKUP_LOCATION to the nickname you chose.
//
// If Shiprocket refuses a request, the error message here
// includes Shiprocket's own reply, so you can see exactly why.
// ============================================================

import { prisma } from './prisma'

const BASE = 'https://apiv2.shiprocket.in/v1/external'

// ------------------------------------------------------------
// LOGIN TOKEN
// ------------------------------------------------------------
// Shiprocket gives us a token that is valid for 24 hours.
// We remember it for 23 hours so we don't log in on every click.
// (This memory lives only while the server is running — after a
// restart we simply log in again. That's fine.)
// ------------------------------------------------------------
let cachedToken = null
let tokenFetchedAt = 0
const TOKEN_LIFETIME_MS = 23 * 60 * 60 * 1000 // 23 hours

export async function getToken() {
  // Still have a fresh token? Reuse it.
  if (cachedToken && Date.now() - tokenFetchedAt < TOKEN_LIFETIME_MS) {
    return cachedToken
  }

  const email = process.env.SHIPROCKET_EMAIL
  const password = process.env.SHIPROCKET_PASSWORD
  if (!email || !password) {
    const err = new Error(
      'Shiprocket is not set up: SHIPROCKET_EMAIL and/or SHIPROCKET_PASSWORD is missing from the environment variables. Add them in .env.local (and on Vercel) and try again.'
    )
    err.statusCode = 502 // so the admin panel shows this message
    throw err
  }

  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const err = new Error(
      `Shiprocket login failed (${res.status}). Check SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD. Shiprocket said: ${text}`
    )
    err.statusCode = 502
    throw err
  }

  const data = await res.json()
  if (!data?.token) {
    const err = new Error('Shiprocket login succeeded but no token came back — this is unexpected. Try again in a minute.')
    err.statusCode = 502
    throw err
  }

  cachedToken = data.token
  tokenFetchedAt = Date.now()
  return cachedToken
}

// ------------------------------------------------------------
// One helper for every Shiprocket call: adds the token, and if
// Shiprocket says no, throws an error containing THEIR message
// so the admin panel can show the real reason.
// ------------------------------------------------------------
export async function srRequest(method, path, body) {
  const token = await getToken()

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const err = new Error(`Shiprocket replied ${res.status} for ${method} ${path}: ${text}`)
    err.statusCode = 502 // "the outside service failed", not our site
    throw err
  }

  return res.json()
}

// ------------------------------------------------------------
// 1) SEND AN ORDER TO SHIPROCKET
// ------------------------------------------------------------
// Takes one of OUR orders (with its items and shipping address)
// and creates the matching order inside Shiprocket.
// Returns Shiprocket's ids: { order_id, shipment_id }.
// ------------------------------------------------------------
export async function createShiprocketOrder(order) {
  const addr = order.shippingAddress || {}

  // Shiprocket wants first and last name separately;
  // we store one "fullName", so split on the first space.
  const nameParts = (addr.fullName || 'Customer').trim().split(/\s+/)
  const firstName = nameParts[0]
  const lastName = nameParts.slice(1).join(' ') // may be '' — that's allowed

  // Shiprocket wants the customer's email. Look it up from the
  // user account; if we can't find one, send '' (allowed).
  let customerEmail = ''
  try {
    const user = await prisma.user.findUnique({
      where: { id: order.userId },
      select: { email: true },
    })
    customerEmail = user?.email || ''
  } catch {
    customerEmail = '' // email is nice-to-have, never block shipping over it
  }

  // Date in the format Shiprocket expects: "2026-07-12 14:30"
  const d = new Date(order.createdAt)
  const pad = (n) => String(n).padStart(2, '0')
  const orderDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`

  const payload = {
    order_id: order.id, // our order id, so the two systems match up
    order_date: orderDate,
    // Which of your saved pickup addresses to collect from.
    // "Primary" is Shiprocket's default nickname.
    pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',

    billing_customer_name: firstName,
    billing_last_name: lastName,
    billing_address: [addr.line1, addr.line2].filter(Boolean).join(', '),
    billing_city: addr.city || '',
    billing_pincode: addr.pincode || '',
    billing_state: addr.state || '',
    billing_country: 'India',
    billing_email: customerEmail,
    billing_phone: addr.phone || '',
    shipping_is_billing: true, // we ship to the billing address

    order_items: (order.items || []).map((item) => ({
      name: item.productName,
      sku: item.variantDetails?.sku || item.variantId,
      units: item.quantity,
      // Our database stores paise; Shiprocket wants rupees.
      selling_price: item.priceAtPurchase / 100,
    })),

    payment_method: order.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
    sub_total: order.totalAmount / 100, // rupees

    // Package size defaults for a folded linen garment in a
    // courier bag (cm and kg). If your parcels are bigger or
    // heavier, tune these numbers — couriers charge by size/weight.
    length: 30,
    breadth: 25,
    height: 5,
    weight: 0.4,
  }

  const data = await srRequest('POST', '/orders/create/adhoc', payload)

  // Shiprocket answers with its own ids. Both must exist.
  if (!data?.order_id || !data?.shipment_id) {
    const err = new Error(
      `Shiprocket accepted the request but did not return the expected ids. Its reply: ${JSON.stringify(data)}`
    )
    err.statusCode = 502
    throw err
  }

  return { order_id: data.order_id, shipment_id: data.shipment_id }
}

// ------------------------------------------------------------
// 2) BOOK A COURIER (get an AWB / tracking number)
// ------------------------------------------------------------
// Shiprocket picks the best courier and gives back an "AWB"
// (the tracking number printed on the parcel).
// Shiprocket's reply has changed shape over time, so we look for
// the awb in every place it has been known to live.
// Returns { awbCode, courierName, raw }.
// ------------------------------------------------------------
export async function assignAwb(shipmentId) {
  const data = await srRequest('POST', '/courier/assign/awb', {
    shipment_id: shipmentId,
  })

  // Shape A: { awb_assign_status: 1, response: { data: { awb_code, courier_name } } }
  // Shape B: { response: { awb_code, courier_name } }
  // Shape C: { awb_code, courier_name } directly
  const spot =
    data?.response?.data ??
    data?.response ??
    data ??
    {}

  const awbCode = spot.awb_code || null
  const courierName = spot.courier_name || null

  if (!awbCode) {
    // No AWB means Shiprocket refused (e.g. no courier serves that
    // pincode, or your Shiprocket wallet has no balance).
    const err = new Error(
      `Shiprocket did not assign a tracking number. Its reply: ${JSON.stringify(data)}`
    )
    err.statusCode = 502
    throw err
  }

  return { awbCode, courierName, raw: data }
}

// ------------------------------------------------------------
// 3) TRACK A SHIPMENT
// ------------------------------------------------------------
// Asks Shiprocket where the parcel currently is.
// Returns { currentStatus, raw } — currentStatus is a plain
// text like "In Transit" or "Delivered" ('' if unknown).
// ------------------------------------------------------------
export async function trackByShipmentId(shipmentId) {
  const data = await srRequest('GET', `/courier/track/shipment/${shipmentId}`)

  // The tracking info sometimes sits under the shipment id,
  // sometimes at the top level — check both.
  const trackingData =
    data?.[shipmentId]?.tracking_data ??
    data?.tracking_data ??
    null

  // The latest status can be in a few places too.
  const currentStatus =
    trackingData?.shipment_track?.[0]?.current_status ||
    trackingData?.current_status ||
    trackingData?.shipment_status_label ||
    ''

  return { currentStatus, raw: data }
}
