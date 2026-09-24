// ============================================================
// TRANSACTIONAL EMAILS — sent via Brevo (free: 300/day).
// ============================================================
// Setup needed once:
//  1. BREVO_API_KEY in .env.local / Vercel (already present)
//  2. BREVO_SENDER_EMAIL in .env.local / Vercel — this address
//     must be verified in Brevo: app.brevo.com -> Senders -> Add,
//     then click the link Brevo emails you.
//
// RULE: an email failure must NEVER break an order. Every send
// is wrapped — failures go to the ErrorLog and life goes on.
// ============================================================

import { prisma } from './prisma'
import { logError } from './logger'

function formatPrice(paise) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

/** Low-level send via Brevo's HTTP API. */
async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.BREVO_API_KEY
  const sender = process.env.BREVO_SENDER_EMAIL
  if (!apiKey || !sender) {
    throw new Error('BREVO_API_KEY or BREVO_SENDER_EMAIL is not configured')
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Biahama', email: sender },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  })
  if (!res.ok) {
    throw new Error(`Brevo replied ${res.status}: ${await res.text()}`)
  }
}

// ---- Shared, simple, elegant email shell ----
function emailShell(title, bodyHtml) {
  return `
  <div style="background:#f7f6f4;padding:32px 16px;font-family:Georgia,serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e5e5;">
      <div style="text-align:center;padding:28px 0;border-bottom:1px solid #e5e5e5;">
        <span style="font-size:22px;letter-spacing:6px;color:#1A202C;">BIAHAMA</span>
      </div>
      <div style="padding:32px 36px;color:#262626;">
        <h1 style="font-size:20px;font-weight:normal;font-style:italic;margin:0 0 20px 0;">${title}</h1>
        ${bodyHtml}
      </div>
      <div style="text-align:center;padding:20px;border-top:1px solid #e5e5e5;color:#6f6f6f;font-size:11px;">
        Biahama · Luxury linen, made in India
      </div>
    </div>
  </div>`
}

function orderItemsTable(items) {
  const rows = items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;">
          ${i.productName}<br/>
          <span style="color:#6f6f6f;font-size:11px;">SKU ${i.variantDetails?.sku ?? '-'} · Size ${i.variantDetails?.size ?? '-'} · Qty ${i.quantity}</span>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;vertical-align:top;">
          ${formatPrice(i.total)}
        </td>
      </tr>`
    )
    .join('')
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0;">${rows}</table>`
}

/**
 * Order confirmation — sent right after an order is created.
 * Never throws: failures are logged to ErrorLog instead.
 */
export async function sendOrderConfirmationEmail(orderId) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: { select: { email: true, name: true } } },
    })
    if (!order?.user?.email) return

    const addr = order.shippingAddress || {}
    const cod = order.paymentMethod === 'cod'
    const html = emailShell(
      'Thank you for your order',
      `
      <p style="font-size:13px;line-height:1.7;">Hello ${order.user.name || addr.fullName || ''},<br/>
      We've received your order and are preparing it with care.</p>
      ${orderItemsTable(order.items)}
      <p style="font-size:13px;margin:4px 0;">Shipping: <strong>${order.shippingAmount === 0 ? 'Free' : formatPrice(order.shippingAmount)}</strong></p>
      ${order.discountAmount > 0 ? `<p style="font-size:13px;margin:4px 0;">Discount: <strong>−${formatPrice(order.discountAmount)}</strong></p>` : ''}
      <p style="font-size:15px;margin:12px 0;">Total: <strong>${formatPrice(order.totalAmount)}</strong>
      ${cod ? '<span style="color:#6f6f6f;font-size:12px;"> (to pay on delivery)</span>' : ''}</p>
      <p style="font-size:13px;line-height:1.7;color:#6f6f6f;">Delivering to:<br/>
      ${addr.fullName ?? ''}, ${addr.line1 ?? ''}${addr.line2 ? ', ' + addr.line2 : ''},<br/>
      ${addr.city ?? ''}, ${addr.state ?? ''} — ${addr.pincode ?? ''}</p>
      <p style="font-size:13px;line-height:1.7;">We'll email you again the moment it ships.</p>`
    )
    await sendEmail({ to: order.user.email, subject: 'Your Biahama order is confirmed', html })
  } catch (error) {
    await logError('email — order confirmation', error, { orderId })
  }
}

/**
 * Shipped email — sent when the order gets a tracking number.
 * Never throws.
 */
export async function sendOrderShippedEmail(orderId) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: { select: { email: true, name: true } } },
    })
    if (!order?.user?.email) return

    const html = emailShell(
      'Your order is on its way',
      `
      <p style="font-size:13px;line-height:1.7;">Hello ${order.user.name || ''},<br/>
      Your Biahama order has been dispatched.</p>
      ${order.awbNumber ? `<p style="font-size:14px;">Tracking number: <strong>${order.awbNumber}</strong>${order.shippingPartner ? ` (${order.shippingPartner})` : ''}</p>` : ''}
      ${orderItemsTable(order.items)}
      <p style="font-size:13px;line-height:1.7;color:#6f6f6f;">You can also check the status any time from “My Account” on our site.</p>`
    )
    await sendEmail({ to: order.user.email, subject: 'Your Biahama order has shipped', html })
  } catch (error) {
    await logError('email — order shipped', error, { orderId })
  }
}
