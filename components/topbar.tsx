'use client'

import { useState, useEffect } from 'react'
import { UserRole } from '@/lib/rbac'
import { Search, Bell, LogOut, User, Check, CheckCheck, X } from 'lucide-react'
import { notificationsService, type Notification } from '@/lib/notifications-service'
import { createClient } from '@/lib/supabase/client'

interface TopbarProps {
  userRole: UserRole
  userName: string
  userEmail: string
}

export default function Topbar({ userRole, userName, userEmail }: TopbarProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [currentUserName, setCurrentUserName] = useState(userName)
  const [currentUserEmail, setCurrentUserEmail] = useState(userEmail)
  const supabase = createClient()

  useEffect(() => {
    loadUserInfo()
    // loadNotifications() // DISABLED FOR NOW
    
    // Set up real-time subscription for notifications - DISABLED FOR NOW
    /*
    const channel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          loadNotifications()
        }
      )
      .subscribe()
    */

    // Set up subscription for profile updates
    const profileChannel = supabase
      .channel('profile-updates-topbar')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          loadUserInfo()
        }
      )
      .subscribe()

    return () => {
      // supabase.removeChannel(channel) // DISABLED FOR NOW
      supabase.removeChannel(profileChannel)
    }
  }, [])

  useEffect(() => {
    setCurrentUserName(userName)
    setCurrentUserEmail(userEmail)
  }, [userName, userEmail])

  const loadUserInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Get updated profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          setCurrentUserName(profile.name || user.user_metadata?.name || user.email || userName)
          setCurrentUserEmail(profile.email || user.email || userEmail)
        } else {
          setCurrentUserName(user.user_metadata?.name || user.email || userName)
          setCurrentUserEmail(user.email || userEmail)
        }
      }
    } catch (error) {
      console.error('Error loading user info:', error)
    }
  }

  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const notifs = await notificationsService.getUserNotifications(user.id)
      const count = await notificationsService.getUnreadCount(user.id)
      
      setNotifications(notifs)
      setUnreadCount(count)
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationsService.markAsRead(notificationId)
      await loadNotifications()
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      await notificationsService.markAllAsRead(user.id)
      await loadNotifications()
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const handleSignOut = () => {
    document.cookie = 'demo-user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    window.location.href = '/login'
  }

  return (
    <div style={{
      height: '72px',
      backgroundColor: 'white',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, maxWidth: '600px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ 
            position: 'absolute', 
            left: '1rem', 
            top: '50%', 
            transform: 'translateY(-50%)',
            width: '1.25rem', 
            height: '1.25rem',
            color: '#9ca3af'
          }} />
          <input
            type="text"
            placeholder="Search vehicles, customers, invoices..."
            style={{
              padding: '0.75rem 1rem 0.75rem 3rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
              width: '100%',
              backgroundColor: '#f9fafb',
              outline: 'none',
              transition: 'all 0.2s'
            }}
            onFocus={(e) => {
              e.target.style.backgroundColor = 'white'
              e.target.style.borderColor = '#3b82f6'
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
            }}
            onBlur={(e) => {
              e.target.style.backgroundColor = '#f9fafb'
              e.target.style.borderColor = '#e5e7eb'
              e.target.style.boxShadow = 'none'
            }}
          />
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Notifications - DISABLED FOR NOW - Set ENABLE_NOTIFICATIONS to true to re-enable */}
        {false && (() => {
          const ENABLE_NOTIFICATIONS = false // Set to true to enable notifications
          if (!ENABLE_NOTIFICATIONS) return null
          
          return (
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb'
                }}
              >
                <Bell style={{ width: '1.25rem', height: '1.25rem', color: '#6b7280' }} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '0.25rem',
                    right: '0.25rem',
                    width: '0.5rem',
                    height: '0.5rem',
                    backgroundColor: '#ef4444',
                    borderRadius: '50%',
                    border: '2px solid white',
                    animation: unreadCount > 0 ? 'pulse 2s infinite' : 'none'
                  }}></span>
                )}
              </button>

              {showNotifications && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 0.5rem)',
                  right: '0',
                  width: '400px',
                  maxHeight: '500px',
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.75rem',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  zIndex: 1000,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{
                    padding: '1rem',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#111827' }}>
                      Notifications {unreadCount > 0 && `(${unreadCount})`}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#f3f4f6',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <CheckCheck style={{ width: '0.875rem', height: '0.875rem' }} />
                          Mark all read
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotifications(false)}
                        style={{
                          padding: '0.25rem',
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <X style={{ width: '1rem', height: '1rem', color: '#6b7280' }} />
                      </button>
                    </div>
                  </div>

                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                        No notifications
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          style={{
                            padding: '1rem',
                            borderBottom: '1px solid #f3f4f6',
                            backgroundColor: notification.read ? 'white' : '#fef3f3',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = notification.read ? '#f9fafb' : '#fee2e2'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = notification.read ? 'white' : '#fef3f3'
                          }}
                          onClick={() => {
                            if (notification.action_url) {
                              window.location.href = notification.action_url
                            }
                            if (!notification.read) {
                              handleMarkAsRead(notification.id)
                            }
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <div style={{ fontWeight: notification.read ? '500' : '600', fontSize: '0.875rem', color: '#111827' }}>
                              {notification.title}
                            </div>
                            {!notification.read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleMarkAsRead(notification.id)
                                }}
                                style={{
                                  padding: '0.125rem 0.25rem',
                                  backgroundColor: '#f3f4f6',
                                  border: 'none',
                                  borderRadius: '0.25rem',
                                  cursor: 'pointer'
                                }}
                              >
                                <Check style={{ width: '0.75rem', height: '0.75rem', color: '#059669' }} />
                              </button>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                            {notification.message}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                            {new Date(notification.created_at).toLocaleDateString()} {new Date(notification.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', paddingRight: '1.5rem', borderRadius: '0.5rem', backgroundColor: '#f9fafb' }}>
          <div style={{
            width: '2.5rem',
            height: '2.5rem',
            backgroundColor: '#3b82f6',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: '600',
            boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
          }}>
            {currentUserName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
              {currentUserName}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </div>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#f3f4f6',
            color: '#dc2626',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#fee2e2'
            e.currentTarget.style.borderColor = '#fecaca'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6'
            e.currentTarget.style.borderColor = '#e5e7eb'
          }}
        >
          <LogOut style={{ width: '1rem', height: '1rem' }} />
          Sign Out
        </button>
      </div>
    </div>
  )
}