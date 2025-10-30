// Design System Constants
// Professional color palette and design tokens

export const COLORS = {
  // Primary colors
  primary: '#2563eb',
  primaryDark: '#1e40af',
  primaryLight: '#3b82f6',
  
  // Background colors
  bgPrimary: '#f8fafc',
  bgSecondary: '#ffffff',
  bgTertiary: '#f1f5f9',
  
  // Text colors
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  
  // Border colors
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  borderDark: '#cbd5e1',
  
  // Status colors
  success: '#059669',
  successLight: '#10b981',
  warning: '#d97706',
  warningLight: '#f59e0b',
  error: '#dc2626',
  errorLight: '#ef4444',
  info: '#0284c7',
  infoLight: '#0ea5e9',
  
  // Status backgrounds
  successBg: '#dcfce7',
  warningBg: '#fef3c7',
  errorBg: '#fee2e2',
  infoBg: '#dbeafe',
  
  // Hover states
  hover: '#f1f5f9',
  active: '#eff6ff',
}

export const SPACING = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
}

export const TYPOGRAPHY = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '2rem',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
}

export const SHADOWS = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
}

export const BORDER_RADIUS = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
}

// Export utility functions
export function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'completed': 
    case 'active':
    case 'paid': return { bg: COLORS.successBg, color: COLORS.success, icon: '✓' }
    case 'in_progress': 
    case 'in progress':
    case 'pending': return { bg: COLORS.infoBg, color: COLORS.info, icon: '⟳' }
    case 'overdue': 
    case 'inactive':
    case 'cancelled': return { bg: COLORS.errorBg, color: COLORS.error, icon: '✕' }
    case 'high priority': return { bg: COLORS.errorBg, color: COLORS.error, icon: '↑' }
    case 'medium priority': return { bg: COLORS.warningBg, color: COLORS.warning, icon: '→' }
    case 'low priority': return { bg: COLORS.infoBg, color: COLORS.info, icon: '↓' }
    default: return { bg: COLORS.bgTertiary, color: COLORS.textSecondary, icon: '' }
  }
}

export function getPriorityColor(priority: string) {
  switch (priority?.toLowerCase()) {
    case 'high': return { bg: COLORS.errorBg, color: COLORS.error }
    case 'medium': return { bg: COLORS.warningBg, color: COLORS.warning }
    case 'low': return { bg: COLORS.infoBg, color: COLORS.info }
    default: return { bg: COLORS.bgTertiary, color: COLORS.textSecondary }
  }
}

