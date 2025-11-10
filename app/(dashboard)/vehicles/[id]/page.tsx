// Server component wrapper to export route segment config
export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import VehicleDetailsPageClient from './VehicleDetailsPageClient'

export default function VehicleDetailsPage() {
  return (
    <Suspense fallback={null}>
      <VehicleDetailsPageClient />
    </Suspense>
  )
}
