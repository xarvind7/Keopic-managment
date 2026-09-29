import React from 'react';

interface KeopicLogoProps {
  className?: string;
  size?: number | string;
}

export default function KeopicLogo({ className = 'w-12 h-12', size }: KeopicLogoProps) {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 200 200"
      className={`shrink-0 ${className}`}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer White Ring with Black Outline */}
      <circle cx="100" cy="100" r="96" fill="#ffffff" stroke="#000000" strokeWidth="3" />
      
      {/* Outer Black Inner Border Ring */}
      <circle cx="100" cy="100" r="86" fill="none" stroke="#000000" strokeWidth="7" />

      {/* Top Cyan Semi-Circle */}
      <path
        d="M 18,100 A 82,82 0 0,1 182,100 Z"
        fill="#5eead4"
      />

      {/* Bottom Pink Semi-Circle */}
      <path
        d="M 18,100 A 82,82 0 0,0 182,100 Z"
        fill="#f0abfc"
      />

      {/* White shine highlights inside top and bottom arcs */}
      <path
        d="M 125,55 A 50,50 0 0,1 145,75"
        fill="none"
        stroke="#ffffff"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M 55,145 A 50,50 0 0,0 75,160"
        fill="none"
        stroke="#ffffff"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Camera Body Line Art (Black) */}
      {/* Top Camera Body & Viewfinder Notch */}
      <path
        d="M 75,60 H 125 A 8,8 0 0,1 133,68 V 74 H 148 A 12,12 0 0,1 160,86 V 98"
        fill="none"
        stroke="#000000"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 40,98 V 86 A 12,12 0 0,1 52,74 H 67 V 68 A 8,8 0 0,1 75,60"
        fill="none"
        stroke="#000000"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Bottom Camera Base Curve */}
      <path
        d="M 52,128 V 136 A 12,12 0 0,0 64,148 H 136 A 12,12 0 0,0 148,136 V 128"
        fill="none"
        stroke="#000000"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Middle Horizontal Split Line passing around the central lens */}
      <path
        d="M 18,100 H 70"
        stroke="#000000"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M 130,100 H 182"
        stroke="#000000"
        strokeWidth="8"
        strokeLinecap="round"
      />

      {/* Central Camera Lens Outer Ring & Inner Aperture */}
      <circle cx="100" cy="100" r="30" fill="#ffffff" stroke="#000000" strokeWidth="8" />
      <circle cx="100" cy="100" r="20" fill="#000000" />
      
      {/* Lens Reflection Catchlight */}
      <circle cx="94" cy="94" r="5" fill="#ffffff" />
    </svg>
  );
}
