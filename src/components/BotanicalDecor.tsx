import React from 'react';

export function PinkLilyCluster({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Leaves */}
      <path
        d="M28 118C12 96 14 68 35 55C48 76 50 100 28 118Z"
        fill="#537A32"
        stroke="#2F4C19"
        strokeWidth="1.5"
      />
      <path
        d="M52 145C36 155 18 148 14 130C35 122 50 128 52 145Z"
        fill="#618C3D"
        stroke="#2F4C19"
        strokeWidth="1.5"
      />
      <path
        d="M126 60C146 44 166 52 168 72C148 80 132 76 126 60Z"
        fill="#5E873B"
        stroke="#2F4C19"
        strokeWidth="1.5"
      />
      {/* Top Pink Lily */}
      <g transform="translate(88 68)">
        <ellipse cx="0" cy="-28" rx="14" ry="30" fill="#F5B6CA" stroke="#D97E9E" strokeWidth="1.5" />
        <ellipse
          cx="26"
          cy="-12"
          rx="14"
          ry="28"
          transform="rotate(55 26 -12)"
          fill="#F8C7D6"
          stroke="#D97E9E"
          strokeWidth="1.5"
        />
        <ellipse
          cx="-26"
          cy="-12"
          rx="14"
          ry="28"
          transform="rotate(-55 -26 -12)"
          fill="#F2A4BE"
          stroke="#D97E9E"
          strokeWidth="1.5"
        />
        <ellipse
          cx="18"
          cy="22"
          rx="13"
          ry="26"
          transform="rotate(135 18 22)"
          fill="#F5B6CA"
          stroke="#D97E9E"
          strokeWidth="1.5"
        />
        <ellipse
          cx="-18"
          cy="22"
          rx="13"
          ry="26"
          transform="rotate(-135 -18 22)"
          fill="#F8C7D6"
          stroke="#D97E9E"
          strokeWidth="1.5"
        />
        {/* Stamens */}
        <path d="M0 0L-6 -18M0 0L7 -17M0 0L14 -5M0 0L-13 -4M0 0L2 14" stroke="#8F3B57" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="-6" cy="-19" r="2.6" fill="#7D2944" />
        <circle cx="7" cy="-18" r="2.6" fill="#7D2944" />
        <circle cx="15" cy="-5" r="2.6" fill="#7D2944" />
        <circle cx="-14" cy="-4" r="2.6" fill="#7D2944" />
        <circle cx="2" cy="15" r="2.6" fill="#7D2944" />
      </g>
      {/* Small Rose Buds */}
      <g transform="translate(115 135)">
        <circle cx="0" cy="0" r="14" fill="#E991AC" stroke="#B65B78" strokeWidth="1.4" />
        <path d="M-6 -2C-2 -8 6 -6 6 1C6 7 -4 8 -7 2" stroke="#9D3F5D" strokeWidth="1.4" strokeLinecap="round" />
      </g>
      <g transform="translate(145 118)">
        <circle cx="0" cy="0" r="11" fill="#F2ABC1" stroke="#B65B78" strokeWidth="1.3" />
        <path d="M-4 -1C-1 -6 5 -4 4 1" stroke="#9D3F5D" strokeWidth="1.3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function GinghamBow({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <pattern id="ginghamGreen" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="#E9EEDC" />
          <rect width="6" height="12" fill="#6D8A4B" fillOpacity="0.6" />
          <rect width="12" height="6" fill="#4E6A2E" fillOpacity="0.55" />
        </pattern>
      </defs>
      {/* Left Ribbon Tail */}
      <path
        d="M72 48L24 98L46 106L78 58Z"
        fill="url(#ginghamGreen)"
        stroke="#354D1C"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Right Ribbon Tail */}
      <path
        d="M88 48L136 98L114 106L82 58Z"
        fill="url(#ginghamGreen)"
        stroke="#354D1C"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Left Bow Loop */}
      <path
        d="M78 44C54 14 14 20 18 48C22 72 58 64 78 50Z"
        fill="url(#ginghamGreen)"
        stroke="#354D1C"
        strokeWidth="1.6"
      />
      {/* Right Bow Loop */}
      <path
        d="M82 44C106 14 146 20 142 48C138 72 102 64 82 50Z"
        fill="url(#ginghamGreen)"
        stroke="#354D1C"
        strokeWidth="1.6"
      />
      {/* Center Knot */}
      <rect
        x="68"
        y="36"
        width="24"
        height="22"
        rx="8"
        fill="url(#ginghamGreen)"
        stroke="#354D1C"
        strokeWidth="1.6"
      />
    </svg>
  );
}
