import Sidebar from '@/components/sidebar'
import Topbar from '@/components/topbar'

interface InstallerLayoutProps {
  children: React.ReactNode
}

export default function InstallerLayout({ children }: InstallerLayoutProps) {
  // For now, render installer layout without auth check
  const userRole = 'installer'
  const userName = 'Installer'
  const userEmail = 'installer@zoravo.com'

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8fafc' }}>
      <Sidebar userRole={userRole} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar 
          userRole={userRole}
          userName={userName}
          userEmail={userEmail}
        />
        <main style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
