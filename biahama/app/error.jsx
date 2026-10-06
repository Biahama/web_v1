'use client'
import Link from 'next/link'
export default function ErrorPage({ reset }) {
  return <main className="password-page"><div className="password-card"><h1>Something went wrong.</h1><p>Please try again. If it keeps happening, contact hello@biahama.com.</p><button onClick={reset}>Try again</button><Link href="/shop">Back to the collection</Link></div></main>
}
