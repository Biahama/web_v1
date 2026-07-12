// ============================================================
// CONTENT PAGES — the site's "words" pages (About, Shipping...)
// ============================================================
// HOW IT WORKS (and why it can't break the site):
// 1. Every page below ships with sensible DEFAULT text.
// 2. The admin panel (/admin/content) saves your edits to the
//    ContentPage table in the database.
// 3. The public page shows the database version if one exists,
//    otherwise the default below. "Restore original text" in the
//    admin panel simply deletes the database row.
//
// Body text is PLAIN TEXT. A blank line starts a new paragraph.
// ============================================================

export const DEFAULT_PAGES = {
  about: {
    title: 'Our Story',
    body: `Biahama began with a simple belief: that clothing should be made slowly, worn often, and kept for years. We work with hand-spun organic linen, woven by skilled artisans in India, and shape it into quiet, considered garments that move with you.

Every piece starts as flax grown without synthetic pesticides, spun and woven in small batches. We design with restraint — clean lines, natural tones, and details you notice only up close. Nothing here is made to chase a season.

We are a small, family-run brand, and we intend to stay that way. When you wear Biahama, you are wearing the work of real hands, made at a human pace.`,
  },

  sustainability: {
    title: 'Sustainability',
    body: `Linen is one of the gentlest fibres on the planet — flax needs little water, no irrigation in most climates, and the whole plant is used. We take that head start seriously and try not to waste it anywhere along the way.

Our linen is organically grown and processed without harsh chemical treatments. We dye in small batches using low-impact dyes, cut carefully to minimise offcuts, and turn what remains into pouches, ties, and packaging.

We would rather make fewer, better things than more of everything. Each garment is designed to soften with age and last for many years — the most sustainable garment is the one you keep wearing.`,
  },

  careers: {
    title: 'Careers',
    body: `Biahama is a small team with a long view. We look for people who care about craft, patience, and doing ordinary things unusually well — whether that is weaving, pattern-making, photography, or answering a customer's question kindly.

We do not always have open roles, but we are always happy to hear from thoughtful people. Tell us who you are, what you make, and why slow clothing matters to you.

Write to us at careers@biahama.com with a short note and anything you would like us to see.`,
  },

  press: {
    title: 'Press',
    body: `For press enquiries, interviews, lookbook images, or samples, please write to press@biahama.com. We aim to reply within two working days.

High-resolution campaign imagery and our brand story are available on request. If you are writing about hand-spun linen, Indian craft, or slow fashion, we would love to talk.`,
  },

  sizing: {
    title: 'Sizing Guide',
    body: `Biahama garments are cut with an easy, relaxed silhouette. If you prefer a closer fit, we suggest taking your usual size; for a roomier drape, size up.

Our sizes run from XS to XXL. As a general guide: XS fits chest 34", S fits 36", M fits 38", L fits 40", XL fits 42", and XXL fits 44". Kurtas and tunics are measured flat across the chest; trousers are measured at the waist with a drawstring allowance.

Linen relaxes slightly with wear and washing, so a garment that feels crisp on day one will soften and ease within a few wears. If you are between sizes or unsure, write to us — we are glad to help you choose.`,
  },

  shipping: {
    title: 'Shipping',
    body: `We ship across India. Orders are dispatched within 2–4 working days and typically arrive within 5–7 working days of dispatch, depending on your location. You will receive a tracking link by email as soon as your order leaves us.

Shipping is free on orders above ₹3,000. For orders below that, a flat shipping fee is added at checkout.

Every order is packed in reusable cloth and recycled paper — no plastic. If your parcel arrives damaged or is delayed beyond the expected window, write to us and we will make it right.`,
  },

  returns: {
    title: 'Returns',
    body: `We want you to keep only what you love. If a piece is not right, you may return it within 14 days of delivery, provided it is unworn, unwashed, and in its original condition with tags attached.

To start a return, write to us with your order number and we will arrange a pickup where available. Refunds are issued to your original payment method within 7–10 working days of the garment reaching us. Cash-on-delivery orders are refunded by bank transfer.

Exchanges for a different size are always free. Made-to-order and altered pieces cannot be returned, but we will always help with sizing before you buy.`,
  },

  contact: {
    title: 'Contact',
    body: `We are a small team and we read every message ourselves. For anything at all — sizing help, order questions, wholesale, or just to say hello — reach us at hello@biahama.com.

You can also message us on WhatsApp at +91 00000 00000. We reply between 10am and 6pm IST, Monday to Saturday, and usually within a few hours.

Biahama, Made in India.`,
  },
}

// The list of slugs the site recognises, e.g. /about, /shipping...
export const CONTENT_SLUGS = Object.keys(DEFAULT_PAGES)
