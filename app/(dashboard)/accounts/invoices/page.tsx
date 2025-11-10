// Server component wrapper to export route segment config
export const dynamic = 'force-dynamic'

import InvoicesPageClient from './InvoicesPageClient'

export default function InvoicesPage() {
  return <InvoicesPageClient />
}
