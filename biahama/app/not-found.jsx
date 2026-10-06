import Link from 'next/link'
export default function NotFound() {
  return <main className="password-page"><div className="password-card"><h1>We couldn’t find that page.</h1><p>The page may have moved or the piece may no longer be available.</p><Link href="/shop">Explore the collection</Link></div></main>
}
