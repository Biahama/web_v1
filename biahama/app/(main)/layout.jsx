import AnnouncementBar from '@/components/layout/AnnouncementBar'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export default function MainLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1 pt-14" style={{ paddingTop: 'calc(56px + 32px)' }}>
        {children}
      </main>
      <Footer />
    </div>
  )
}
