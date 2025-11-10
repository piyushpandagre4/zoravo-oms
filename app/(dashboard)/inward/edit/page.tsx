// Server component wrapper to export route segment config
export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import EditVehicleInwardPageClient from './EditVehicleInwardPageClient'

export default function EditVehicleInwardPage() {
  return (
    <Suspense fallback={null}>
      <EditVehicleInwardPageClient />
    </Suspense>
  )
}
