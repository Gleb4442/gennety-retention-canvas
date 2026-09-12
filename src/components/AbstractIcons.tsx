import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// 1. Foundation: Abstract Monolith / Dual Floating Disc
export const IconFoundation: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="4" y="4" width="16" height="7" rx="3.5" />
    <rect x="7" y="14" width="10" height="6" rx="3" opacity="0.6" />
  </svg>
);

// 2. Psychology: Abstract Aura / Liquid Triple Droplets
export const IconPsychology: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="12" cy="7" r="4.5" />
    <circle cx="7" cy="16" r="3.5" opacity="0.7" />
    <circle cx="17" cy="16" r="3.5" opacity="0.7" />
  </svg>
);

// 3. Hardware Engine: Abstract Signal Beacon / Capsule with Radiance Dot
export const IconHardware: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="8" y="3" width="8" height="18" rx="4" />
    <circle cx="12" cy="8" r="2" fill="var(--bg-glass-contrast, #090A0E)" />
  </svg>
);

// 4. Retention Mechanism: Abstract Closed Torus / Perpetual Ribbon
export const IconRetention: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3ZM12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7Z"
    />
  </svg>
);

// 5. Event Duality: Concentric Duality (Outer Chamber + Inner Core)
export const IconEventDuality: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="6" opacity="0.35" />
    <rect x="8" y="8" width="8" height="8" rx="3" />
  </svg>
);

// 6. Lifecycle & Anti-Churn: Abstract Pinwheel Triad
export const IconLifecycle: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="12" cy="5" r="3.5" />
    <circle cx="6" cy="16" r="3.5" opacity="0.75" />
    <circle cx="18" cy="16" r="3.5" opacity="0.75" />
    <circle cx="12" cy="12.5" r="1.8" />
  </svg>
);

// 7. Outcome: Abstract Apex / Monolithic Crown
export const IconOutcome: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 3L19 10H15V21H9V10H5L12 3Z" />
  </svg>
);

// 8. Custom Strategy: Abstract Grid Node
export const IconCustomNode: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="7" cy="7" r="3" />
    <circle cx="17" cy="7" r="3" opacity="0.6" />
    <circle cx="7" cy="17" r="3" opacity="0.6" />
    <circle cx="17" cy="17" r="3" />
  </svg>
);

// UI Action Icons (Minimalist, Solid, Non-detailed)
export const IconFreeform: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="4" y="4" width="7" height="7" rx="2" />
    <rect x="13" y="13" width="7" height="7" rx="2" />
    <rect x="13" y="4" width="7" height="7" rx="2" opacity="0.4" />
    <rect x="4" y="13" width="7" height="7" rx="2" opacity="0.4" />
  </svg>
);

export const IconPyramidLayout: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="9" y="3" width="6" height="4" rx="2" />
    <rect x="6" y="10" width="12" height="4" rx="2" opacity="0.7" />
    <rect x="3" y="17" width="18" height="4" rx="2" opacity="0.4" />
  </svg>
);

export const IconFlywheelLayout: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="12" cy="4" r="2.5" />
    <circle cx="19" cy="8" r="2.5" opacity="0.8" />
    <circle cx="19" cy="16" r="2.5" opacity="0.6" />
    <circle cx="12" cy="20" r="2.5" opacity="0.5" />
    <circle cx="5" cy="16" r="2.5" opacity="0.6" />
    <circle cx="5" cy="8" r="2.5" opacity="0.8" />
  </svg>
);

export const IconThemeSwitch: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20V4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" />
  </svg>
);

export const IconAdd: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="10.5" y="4" width="3" height="16" rx="1.5" />
    <rect x="4" y="10.5" width="16" height="3" rx="1.5" />
  </svg>
);

export const IconSearchMinimal: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10 3C6.13401 3 3 6.13401 3 10C3 13.866 6.13401 17 10 17C11.606 17 13.0853 16.4578 14.269 15.547L18.861 20.139C19.2515 20.5295 19.8847 20.5295 20.2752 20.139C20.6657 19.7485 20.6657 19.1153 20.2752 18.7248L15.683 14.133C16.5938 12.9493 17 11.47 17 10C17 6.13401 13.866 3 10 3ZM5.5 10C5.5 7.51472 7.51472 5.5 10 5.5C12.4853 5.5 14.5 7.51472 14.5 10C14.5 12.4853 12.4853 14.5 10 14.5C7.51472 14.5 5.5 12.4853 5.5 10Z"
    />
  </svg>
);

export const IconBrandPebble: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="8" />
  </svg>
);
