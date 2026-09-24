// ============================================================
// LOGIN & REGISTER — explainer page (no settings yet)
// ============================================================
// There is nothing to edit for the login flow from the admin
// panel, so this page simply explains how it all works and
// where the real switches live. Server-rendered, no JS.
// ============================================================

export const dynamic = 'force-dynamic'

const helpStyle = { fontSize: 12, color: '#6f6f6f', marginTop: 4 }
const cardStyle = {
  border: '1px solid #e5e5e5',
  borderRadius: 6,
  padding: '20px 24px',
  maxWidth: 640,
}
const cardTitleStyle = {
  fontSize: 15,
  fontWeight: 600,
  color: '#1A202C',
  margin: '0 0 8px',
}
const bodyStyle = {
  fontSize: 14,
  color: '#4a5568',
  lineHeight: 1.6,
  margin: 0,
}

export default function LoginAdminPage() {
  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontFamily: 'var(--font-display), serif', fontSize: 32, fontWeight: 500, color: '#1A202C', margin: 0 }}>
        Login &amp; Register
      </h1>
      {/* Which storefront page this screen controls */}
      <p style={{ ...helpStyle, marginBottom: 32 }}>
        About the sign-in experience customers get. There are no settings to change here yet.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>What customers see</h2>
          <p style={bodyStyle}>
            Customers sign in from a small drawer that slides out when they tap the
            account icon, or from the full register page. They can use their email
            and a password, or the &ldquo;Continue with Google&rdquo; button — no separate
            account needed.
          </p>
        </div>

        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Changing the Google sign-in settings</h2>
          <p style={bodyStyle}>
            Google login is managed in the Supabase dashboard (the service that stores
            customer accounts): supabase.com &rarr; your project &rarr; Authentication &rarr;
            Providers &rarr; Google. Changes there apply to the live site right away.
          </p>
        </div>

        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Who can open this admin panel</h2>
          <p style={bodyStyle}>
            Admin access comes from the ADMIN_EMAILS environment variable — a
            comma-separated list of email addresses set where the site is hosted
            (Vercel &rarr; Project &rarr; Settings &rarr; Environment Variables). Anyone who signs
            in with one of those emails can use this panel; everyone else is quietly
            sent back to the shop.
          </p>
        </div>
      </div>
    </div>
  )
}
