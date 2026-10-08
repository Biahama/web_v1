import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/prisma'
import { getPointsBalance } from '@/lib/loyalty'
import { logError } from '@/lib/logger'
import SignOutButton from '@/components/auth/SignOutButton'
import AddressBook from '@/components/account/AddressBook'
import ProfileForm from '@/components/account/ProfileForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'My Account' }
const price = amount => '₹' + (amount / 100).toLocaleString('en-IN')

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?login=true&next=/account')
  const results = await Promise.allSettled([
    prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 50, include: { items: true } }),
    prisma.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] }),
    prisma.user.findUnique({ where: { id: user.id }, select: { name: true, phone: true } }),
    getPointsBalance(user.id),
  ])
  for (const result of results) if (result.status === 'rejected') await logError('account — load', result.reason, { userId: user.id })
  const orders = results[0].status === 'fulfilled' ? results[0].value : []
  const addresses = results[1].status === 'fulfilled' ? results[1].value : []
  const profile = results[2].status === 'fulfilled' ? results[2].value : null
  const points = results[3].status === 'fulfilled' ? results[3].value : null
  const meta = user.user_metadata ?? {}
  const name = profile?.name ?? ([meta.first_name, meta.last_name].filter(Boolean).join(' ') || meta.full_name || meta.name || '')
  return <div className="account-page">
    <header className="account-header"><div><p className="eyebrow">Your Biahama</p><h1>Welcome{name ? ', ' + name : ' back'}.</h1><p className="muted">A place for your pieces, your details, and everything in between.</p></div><SignOutButton /></header>
    <nav className="account-tabs" aria-label="Account sections"><a href="#orders">My orders</a><Link href="/account/wardrobe">My wardrobe</Link><a href="#addresses">Addresses</a><a href="#details">My profile</a></nav>
    <div className="account-summary"><span>{results[0].status === 'fulfilled' ? orders.length + (orders.length === 50 ? '+' : '') + ' orders' : 'Orders unavailable'}</span><span>{points === null ? 'Points unavailable' : points.toLocaleString('en-IN') + ' loyalty points'}</span><Link href="/contact">A little assistance →</Link></div>
    <section id="orders" className="account-section"><div className="section-header"><div><p className="eyebrow">The pieces you chose</p><h2>My orders</h2></div><Link className="text-action" href="/shop">Explore the collection →</Link></div>
      {results[0].status === 'rejected' ? <p className="form-error" role="alert">We couldn’t load your orders. Please refresh in a moment.</p> : orders.length === 0 ? <div className="quiet-empty">Your story with us starts here.<p>Your orders and delivery updates will appear in this space.</p></div> : <div>{orders.map(order => <Link key={order.id} href={'/orders/' + order.id} className="account-order"><div><p className="order-number">Order #{order.id.slice(-8).toUpperCase()}</p><p className="muted">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })} · {order.items.reduce((sum, item) => sum + item.quantity, 0)} pieces</p></div><div className="order-summary"><span className="subtle-badge">{order.status}</span><span>{price(order.totalAmount)}</span><span aria-hidden="true">→</span></div></Link>)}</div>}
      <p className="muted section-description">Track a delivery or request a return or size exchange from your order details.</p>
    </section>
    <AddressBook addresses={addresses} unavailable={results[1].status === 'rejected'} />
    <ProfileForm name={name} phone={profile?.phone || ''} email={user.email} unavailable={results[2].status === 'rejected'} />
    <div className="account-care"><div><p className="eyebrow">Here to help</p><h2>A personal touch.</h2><p>From finding your fit to caring for linen, we’re just a message away.</p></div><Link className="text-action" href="/contact">Contact customer care →</Link></div>
  </div>
}
