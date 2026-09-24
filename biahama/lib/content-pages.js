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

  terms: {
    title: 'Terms & Conditions of Sale',
    body: `Welcome to Biahama. By placing an order on our website, you agree to these terms. Every order is an offer to purchase, which we accept when we confirm dispatch by email. All prices are listed in Indian Rupees and are inclusive of GST; the price shown at checkout is the final price you pay, apart from any shipping fee displayed before you confirm the order.

Payments are processed securely by Razorpay and can be made by UPI, credit or debit card, or net banking. Cash on Delivery is available on eligible orders; a COD order may be confirmed by phone or message before dispatch. We reserve the right to cancel any order in case of pricing errors, suspected fraud, or stock unavailability — if payment was already made, it will be refunded in full.

Orders are dispatched within 2–4 working days and usually delivered within 5–7 working days of dispatch, depending on your location. Delivery timelines are estimates, not guarantees; if a parcel is significantly delayed, write to us and we will chase it or make it right.

If a garment is not right, you may return it within the window described on our Returns page, provided it is unworn, unwashed, and in original condition with tags attached. Refunds are issued to the original payment method; Cash on Delivery orders are refunded by bank transfer.

These terms are governed by the laws of India, and any dispute is subject to the jurisdiction of the courts of India. If you have any question about these terms, email us at hello@biahama.com and a real person will reply.`,
  },

  privacy: {
    title: 'Privacy Policy',
    body: `We collect only what we need to serve you: your name and email address when you create an account, the delivery addresses you save, your order history, and anonymous usage analytics (which pages are viewed and what is added to carts, tied to a random browser id — never to your identity). We do not buy data about you, and we do not sell or rent your data to anyone.

Your information is used for one purpose: fulfilling your orders and helping you when you write to us. We use anonymous analytics to understand which products people like, so we can make better clothes — these numbers cannot identify you personally.

Payments are handled entirely by Razorpay, a licensed Indian payment provider. Your card, UPI, and banking details go directly to Razorpay over an encrypted connection and are never stored on our servers — we never see them.

Order confirmations and updates are emailed to you through Brevo, our email service. We only send transactional emails about your orders unless you have chosen to hear from us otherwise.

You can ask us at any time what data we hold about you, or ask us to delete your account and personal data. Write to hello@biahama.com and we will take care of it promptly.`,
  },

  contact: {
    title: 'Contact',
    body: `We are a small team and we read every message ourselves. For anything at all — sizing help, order questions, wholesale, or just to say hello — reach us at hello@biahama.com.

You can also message us on WhatsApp at +91 00000 00000. We reply between 10am and 6pm IST, Monday to Saturday, and usually within a few hours.

Biahama, Made in India.`,
  },

  faq: {
    title: 'FAQs',
    body: `How do I choose a size? Our pieces are cut with an easy, relaxed silhouette — take your usual size for that fit, or size up for a roomier drape. The Size Guide page has flat measurements for every size.

When will my order arrive? Orders are dispatched within 2–4 working days and usually arrive within 5–7 working days after that. You will receive a tracking link by email as soon as your parcel leaves us.

Can I return or exchange something? Yes — unworn, unwashed pieces can be returned within 14 days of delivery, and exchanges for a different size are always free.

How should I care for linen? Machine wash cold on a gentle cycle, dry in the shade, and press while slightly damp. Linen softens with every wash.

Still have a question? Write to hello@biahama.com or message us on WhatsApp — we reply between 10am and 6pm IST, Monday to Saturday.`,
  },
}

// The list of slugs the site recognises, e.g. /about, /shipping...
export const CONTENT_SLUGS = Object.keys(DEFAULT_PAGES)
