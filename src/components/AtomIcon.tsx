'use client';

export default function AtomIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      width="40"
      height="40"
      className={className}
      shapeRendering="geometricPrecision"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <g transform="translate(20, 20)" shapeRendering="geometricPrecision">
        {/* Nucleus - clean, precise overlapping spheres */}
        <circle cx="0" cy="0" r="4.5" fill="#00D4FF" opacity="1"/>
        <circle cx="-1.8" cy="1" r="4" fill="#FF3366" opacity="1"/>
        <circle cx="1.8" cy="-1" r="4" fill="#66FF00" opacity="1"/>
        
        {/* Electron Orbits - clean, precise ellipses */}
        {/* Blue orbit */}
        <ellipse cx="0" cy="0" rx="16" ry="10" fill="none" stroke="#00D4FF" strokeWidth="1" opacity="1" shapeRendering="geometricPrecision"/>
        <circle cx="16" cy="0" r="1.8" fill="#00D4FF" opacity="1"/>
        
        {/* Red orbit (rotated 120 degrees) */}
        <g transform="rotate(120)">
          <ellipse cx="0" cy="0" rx="16" ry="10" fill="none" stroke="#FF3366" strokeWidth="1" opacity="1" shapeRendering="geometricPrecision"/>
          <circle cx="16" cy="0" r="1.8" fill="#FF3366" opacity="1"/>
        </g>
        
        {/* Green orbit (rotated 240 degrees) */}
        <g transform="rotate(240)">
          <ellipse cx="0" cy="0" rx="16" ry="10" fill="none" stroke="#66FF00" strokeWidth="1" opacity="1" shapeRendering="geometricPrecision"/>
          <circle cx="16" cy="0" r="1.8" fill="#66FF00" opacity="1"/>
        </g>
      </g>
    </svg>
  );
}
