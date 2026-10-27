import React from 'react';

export default function DataPilotLogo({ size = 40, style = {}, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        filter: 'drop-shadow(0 3px 8px rgba(79, 70, 229, 0.28))',
        ...style,
      }}
    >
      <defs>
        <linearGradient id="dpl-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4338ca" />
          <stop offset="55%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="dpl-wing" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0e7ff" />
        </linearGradient>
        <linearGradient id="dpl-core" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
        <filter id="dpl-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Rounded squircle backdrop with subtle glass border */}
      <rect width="48" height="48" rx="12" fill="url(#dpl-bg)" />
      <rect
        width="46"
        height="46"
        x="1"
        y="1"
        rx="11"
        stroke="rgba(255, 255, 255, 0.22)"
        strokeWidth="1"
        fill="none"
      />

      {/* Orbital Data Trajectory */}
      <circle
        cx="24"
        cy="24"
        r="14.5"
        stroke="rgba(255, 255, 255, 0.2)"
        strokeWidth="1.2"
        strokeDasharray="2.5 3"
      />

      {/* Forward Aerodynamic Pilot Delta Wing */}
      <path
        d="M24 10L35 32.5L24 27L13 32.5L24 10Z"
        fill="url(#dpl-wing)"
        filter="url(#dpl-glow)"
      />

      {/* Inner Tech Pilot Cockpit Vector */}
      <path
        d="M24 16.5L30 29.5L24 26.5L18 29.5L24 16.5Z"
        fill="url(#dpl-core)"
        opacity="0.95"
      />

      {/* Center Neural Node */}
      <circle cx="24" cy="21" r="2" fill="#ffffff" />

      {/* Constellation Data Points */}
      <circle cx="36" cy="18" r="1.8" fill="#38bdf8" />
      <circle cx="12" cy="27" r="1.8" fill="#c084fc" />

      {/* AI Sparkle Impulses */}
      <path
        d="M37 9L38 11.2L40.2 12.2L38 13.2L37 15.4L36 13.2L33.8 12.2L36 11.2L37 9Z"
        fill="#38bdf8"
      />
    </svg>
  );
}
