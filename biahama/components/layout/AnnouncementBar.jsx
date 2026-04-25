export default function AnnouncementBar() {
  return (
    <div
      className="w-full text-center"
      style={{
        background: '#1a1814',
        color: '#ffffff',
        fontFamily: 'Jost, sans-serif',
        fontWeight: 300,
        fontSize: 10,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        padding: '8px 48px',
      }}
    >
      Free shipping on orders above ₹3,000&nbsp;&nbsp;·&nbsp;&nbsp;New collection arriving this season
    </div>
  )
}
