// Server component wrapper to export route segment config
export const dynamic = 'force-dynamic'

import DashboardPageClient from './DashboardPageClient'

export default function DashboardPage() {
  return <DashboardPageClient />
}
