'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function AdminNav({ groups }) {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  return <><button className="admin-menu-toggle" aria-expanded={open} aria-controls="admin-navigation" onClick={() => setOpen(value => !value)}>Store menu <span aria-hidden="true">{open ? '−' : '+'}</span></button><nav id="admin-navigation" className={open ? 'is-open' : ''} aria-label="Store administration">{groups.map(group => <div className="admin-nav-group" key={group.section}><p>{group.section}</p>{group.links.map(link => <div key={link.href}><Link href={link.href} onClick={() => setOpen(false)} aria-current={path === link.href || (link.href !== '/admin' && path.startsWith(link.href + '/')) ? 'page' : undefined}>{link.label}</Link>{link.children?.map(child => <Link className="admin-nav-child" href={child.href} key={child.href} onClick={() => setOpen(false)}>{child.label}</Link>)}</div>)}</div>)}<Link href="/" className="admin-shop-link">View storefront ↗</Link></nav></>
}
