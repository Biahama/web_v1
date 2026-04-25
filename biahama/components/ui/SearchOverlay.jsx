'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SearchOverlay({ open, onClose }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSubmit(e) {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/shop?q=${encodeURIComponent(query.trim())}`)
      onClose()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(240,237,232,0.97)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <button
        onClick={onClose}
        className="absolute top-5 right-6 text-xs tracking-widest uppercase hover:opacity-50 transition-opacity"
        style={{ fontFamily: 'Jost, sans-serif', color: 'var(--black)' }}
      >
        Close
      </button>

      <form onSubmit={handleSubmit} className="w-full max-w-xl px-8">
        <p className="text-xs tracking-widest uppercase mb-6 text-center" style={{ color: 'var(--gray)', fontFamily: 'Jost, sans-serif' }}>
          Search
        </p>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Ivory linen kurta…"
          className="w-full bg-transparent text-2xl text-center outline-none pb-3"
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontWeight: 300,
            fontStyle: 'italic',
            color: 'var(--black)',
            borderBottom: '1px solid var(--border)',
          }}
        />
      </form>
    </div>
  )
}
