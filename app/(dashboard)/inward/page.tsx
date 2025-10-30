'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function InwardPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the new entry form
    router.push('/inward/new')
  }, [router])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          border: '4px solid #e5e7eb', 
          borderTop: '4px solid #3b82f6', 
          borderRadius: '50%', 
          width: '3rem', 
          height: '3rem', 
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ color: '#6b7280' }}>Loading Vehicle Inward form...</p>
      </div>
    </div>
  )
}
