'use client'

// ============================================================
// ANALYTICS CLIENT — a tiny "beacon" the storefront uses to
// count things (page views, add-to-carts, wardrobe saves...).
//
// Privacy-friendly by design: we store only a random session
// id in the shopper's browser — no name, no email, no cookies.
//
// Golden rule: analytics must NEVER slow down or break the
// shop. Every call here is fire-and-forget and swallows all
// errors silently.
// ============================================================

const SESSION_KEY = 'biahama_session'

// A random anonymous id for this browser, e.g. "k3j9x2...".
// Created once and remembered in localStorage, so we can count
// "sessions" (unique visitors) without knowing who anyone is.
export function getSessionKey() {
  try {
    let key = localStorage.getItem(SESSION_KEY)
    if (!key) {
      key = Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem(SESSION_KEY, key)
    }
    return key
  } catch {
    // Private browsing can block localStorage — that's fine,
    // the event is still counted, just without a session id.
    return undefined
  }
}

// Record one event. Example: trackEvent('add_to_cart', { productId: '...' })
// Fire-and-forget: we never wait for the answer and never throw.
export function trackEvent(type, extra = {}) {
  try {
    const body = JSON.stringify({ type, sessionKey: getSessionKey(), ...extra })

    // sendBeacon is the browser's built-in "deliver this even if
    // I'm leaving the page" mailbox — perfect for page views.
    if (type === 'page_view' && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }))
      return
    }

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true, // finish sending even if the shopper navigates away
    }).catch(() => {}) // analytics failing is never the shopper's problem
  } catch {
    // Swallow everything — see golden rule above.
  }
}
