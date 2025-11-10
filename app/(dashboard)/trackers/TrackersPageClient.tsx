'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, Clock, CheckCircle, XCircle, Phone, FileText } from 'lucide-react'

export default function TrackersPageClient() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('followups')

  // Navigate to Call Follow Up page
  const handleCallFollowUpClick = () => {
    router.push('/trackers/call-follow-up')
  }

  const followUps = [
    { id: 'FU001', subject: 'Follow up on Honda City service', customer: 'John Doe', nextCall: '2025-01-19', outcome: 'Pending', phone: '+91 9876543210' },
    { id: 'FU002', subject: 'Payment reminder for Toyota Innova', customer: 'Jane Smith', nextCall: '2025-01-20', outcome: 'Completed', phone: '+91 9876543211' },
    { id: 'FU003', subject: 'Service completion confirmation', customer: 'Mike Johnson', nextCall: '2025-01-21', outcome: 'Pending', phone: '+91 9876543212' },
  ]

  const serviceTrackers = [
    { id: 'ST001', vehicle: 'Honda City', customer: 'John Doe', checkpoint: 'Engine Oil Change', status: 'Completed', date: '2025-01-18' },
    { id: 'ST002', vehicle: 'Toyota Innova', customer: 'Jane Smith', checkpoint: 'Brake Pad Replacement', status: 'In Progress', date: '2025-01-17' },
    { id: 'ST003', vehicle: 'Maruti Swift', customer: 'Mike Johnson', checkpoint: 'AC Service', status: 'Pending', date: '2025-01-16' },
  ]

  const requirements = [
    { id: 'REQ001', customer: 'John Doe', requirement: 'Install Car Audio System', priority: 'High', status: 'Pending', date: '2025-01-18' },
    { id: 'REQ002', customer: 'Jane Smith', requirement: 'Replace Windshield', priority: 'Medium', status: 'In Progress', date: '2025-01-17' },
    { id: 'REQ003', customer: 'Mike Johnson', requirement: 'Install GPS Tracker', priority: 'Low', status: 'Completed', date: '2025-01-16' },
  ]

  const getCurrentData = () => {
    switch (activeTab) {
      case 'followups': return followUps
      case 'service': return serviceTrackers
      case 'requirements': return requirements
      default: return []
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle style={{ width: '1rem', height: '1rem', color: '#059669' }} />
      case 'In Progress': return <Clock style={{ width: '1rem', height: '1rem', color: '#2563eb' }} />
      case 'Pending': return <XCircle style={{ width: '1rem', height: '1rem', color: '#dc2626' }} />
      default: return <Clock style={{ width: '1rem', height: '1rem', color: '#64748b' }} />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return { bg: '#fee2e2', color: '#dc2626' }
      case 'Medium': return { bg: '#fef3c7', color: '#92400e' }
      case 'Low': return { bg: '#dcfce7', color: '#166534' }
      default: return { bg: '#f1f5f9', color: '#64748b' }
    }
  }

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', padding: '1rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Trackers</h1>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 2rem' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          {[
            { id: 'followups', label: 'Call Follow-ups' },
            { id: 'service', label: 'Service Tracker' },
            { id: 'requirements', label: 'Customer Requirements' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.75rem 0',
                border: 'none',
                backgroundColor: 'transparent',
                color: activeTab === tab.id ? '#2563eb' : '#64748b',
                fontWeight: activeTab === tab.id ? '600' : '400',
                borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '2rem' }}>
        {activeTab === 'followups' && (
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '0.5rem', 
            border: '1px solid #e2e8f0',
            padding: '3rem 2rem',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '2rem' }}>
              <Phone style={{ width: '4rem', height: '4rem', color: '#2563eb', margin: '0 auto 1rem' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>
                Call Follow Up Tracker
              </h2>
              <p style={{ fontSize: '1rem', color: '#64748b', marginBottom: '2rem' }}>
                Manage customer call follow-ups, track responses, and monitor call outcomes.
              </p>
              <button
                onClick={handleCallFollowUpClick}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem 2rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px rgba(37, 99, 235, 0.3)',
                  transition: 'all 0.2s'
                }}
              >
                <Phone style={{ width: '1.25rem', height: '1.25rem' }} />
                Open Call Follow Up
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginTop: '2rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>Track Calls</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                  Monitor active calls and response times
                </p>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>Manage Follow-ups</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                  Add and update call records
                </p>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>Analytics</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                  View KPIs and call statistics
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'service' && (
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '0.5rem', 
            border: '1px solid #e2e8f0',
            padding: '3rem 2rem',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '2rem' }}>
              <Activity style={{ width: '4rem', height: '4rem', color: '#2563eb', margin: '0 auto 1rem' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>
                Service Tracker
              </h2>
              <p style={{ fontSize: '1rem', color: '#64748b', marginBottom: '2rem' }}>
                Track vehicle service jobs and manage service products.
              </p>
              <button
                onClick={() => router.push('/trackers/service-tracker')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem 2rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px rgba(37, 99, 235, 0.3)',
                  transition: 'all 0.2s'
                }}
              >
                <Activity style={{ width: '1.25rem', height: '1.25rem' }} />
                Open Service Tracker
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginTop: '2rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>Track Services</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                  Monitor service job status and progress
                </p>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>Manage Jobs</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                  Add and update service records
                </p>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>Comments</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                  Add comments and attach files
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'service' && false && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e2e8f0' }}>ID</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e2e8f0' }}>Vehicle</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e2e8f0' }}>Customer</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e2e8f0' }}>Checkpoint</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e2e8f0' }}>Date</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e2e8f0' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceTrackers.map((item, index) => (
                    <tr key={index} style={{ borderBottom: index < serviceTrackers.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b', fontWeight: '500' }}>{item.id}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>{item.vehicle}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>{item.customer}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>{item.checkpoint}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {getStatusIcon(item.status)}
                          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{item.status}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#64748b' }}>{item.date}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                        <button 
                          onClick={() => alert(`Updating service tracker for ${item.vehicle}`)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#059669',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#047857'
                            e.currentTarget.style.transform = 'translateY(-1px)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#059669'
                            e.currentTarget.style.transform = 'translateY(0)'
                          }}
                        >
                          Update Status
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'requirements' && (
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '0.5rem', 
            border: '1px solid #e2e8f0',
            padding: '3rem 2rem',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '2rem' }}>
              <FileText style={{ width: '4rem', height: '4rem', color: '#2563eb', margin: '0 auto 1rem' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>
                Customer Requirements Tracker
              </h2>
              <p style={{ fontSize: '1rem', color: '#64748b', marginBottom: '2rem' }}>
                Track customer service requirements and requests. Manage priorities, status updates, and customer communications.
              </p>
              <button
                onClick={() => router.push('/requirements')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem 2rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px rgba(37, 99, 235, 0.3)',
                  transition: 'all 0.2s'
                }}
              >
                <FileText style={{ width: '1.25rem', height: '1.25rem' }} />
                Open Customer Requirements
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginTop: '2rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>Track Requirements</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                  Monitor customer requirements from pending to completed
                </p>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>Priority Management</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                  Set and track priority levels for requirements
                </p>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>Comments & Files</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                  Add comments and attach files to requirements
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
