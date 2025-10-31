'use client'

interface LogoProps {
  size?: 'small' | 'medium' | 'large'
  showText?: boolean
  variant?: 'light' | 'dark'
  className?: string
}

export default function Logo({ 
  size = 'medium', 
  showText = true, 
  variant = 'dark',
  className = '' 
}: LogoProps) {
  // Size configurations
  const sizes = {
    small: { icon: 24, text: '0.875rem', gap: '0.5rem' },
    medium: { icon: 40, text: '1rem', gap: '0.75rem' },
    large: { icon: 64, text: '1.5rem', gap: '1rem' }
  }

  const config = sizes[size]
  // Light variant: white/very light text for dark backgrounds
  // Dark variant: gray text for light backgrounds
  const textColor = variant === 'light' ? 'rgba(255, 255, 255, 0.9)' : '#6b7280'
  const cyanColor = '#06b6d4' // Bright cyan color (#06b6d4 = cyan-500)
  const separatorColor = cyanColor

  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: config.gap,
        ...(size === 'small' ? { flexDirection: 'column', gap: '0.25rem' } : {})
      }}
      className={className}
    >
      {/* Logo Icon - Stylized Z with car silhouette */}
      <svg
        width={config.icon}
        height={config.icon * 0.85}
        viewBox="0 0 100 85"
        style={{ flexShrink: 0 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Stylized Z shape - solid form */}
        <path
          d="M10 5 L90 5 L90 25 L35 25 L90 60 L90 80 L10 80 L10 60 L65 60 L10 25 Z"
          fill={cyanColor}
        />
        {/* Car silhouette integrated in lower half - flows from middle horizontal stroke of Z */}
        {/* Car body/roofline - starts from Z's middle stroke at y=60, flows down */}
        <path
          d="M35 60 
               L30 55 
               Q25 50, 25 45 
               L25 48
               L75 48
               L75 45
               Q75 50, 70 55
               L65 60"
          fill={cyanColor}
        />
        {/* Car roofline detail - subtle curve from Z's middle */}
        <path
          d="M35 60 Q30 55, 25 50"
          stroke={cyanColor}
          strokeWidth="2"
          fill="none"
          opacity="0.8"
        />
        <path
          d="M65 60 Q70 55, 75 50"
          stroke={cyanColor}
          strokeWidth="2"
          fill="none"
          opacity="0.8"
        />
        {/* Car lower body/side skirt - wavy line */}
        <path
          d="M28 68 Q30 70, 35 68 Q40 66, 45 68 Q50 70, 55 68 Q60 66, 65 68 Q70 70, 72 68"
          stroke={cyanColor}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        {/* Car wheel arches - semicircular, prominent */}
        <ellipse cx="38" cy="68" rx="8" ry="5" fill="none" stroke={cyanColor} strokeWidth="3" />
        <ellipse cx="62" cy="68" rx="8" ry="5" fill="none" stroke={cyanColor} strokeWidth="3" />
      </svg>

      {/* Text Section */}
      {showText && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            ...(size === 'small' ? { flexDirection: 'column', gap: '0' } : {})
          }}
        >
          {/* ZORAVO text */}
          <span
            style={{
              fontSize: config.text,
              fontWeight: '600',
              color: textColor,
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}
          >
            ZORAVO
          </span>

          {/* Vertical separator - only show in horizontal layout */}
          {size !== 'small' && (
            <div
              style={{
                width: '2px',
                height: config.text === '1rem' ? '1.25rem' : config.text === '1.5rem' ? '1.75rem' : '1rem',
                backgroundColor: separatorColor,
                flexShrink: 0
              }}
            />
          )}

          {/* OMS text */}
          <span
            style={{
              fontSize: size === 'large' ? '1.125rem' : size === 'medium' ? '0.875rem' : '0.75rem',
              fontWeight: '500',
              color: textColor,
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}
          >
            OMS
          </span>
        </div>
      )}
    </div>
  )
}

