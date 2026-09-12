import React from 'react';
import type { ThemeMode } from '../types';
import butterflyWhite from '../assets/butterfly-white.png';
import butterflyBlack from '../assets/butterfly-black.png';

interface ButterflyLogoProps {
  theme: ThemeMode;
  className?: string;
}

export const ButterflyLogo: React.FC<ButterflyLogoProps> = ({ theme, className = 'w-6 h-6' }) => {
  const src = theme === 'light' ? butterflyBlack : butterflyWhite;

  return (
    <img
      src={src}
      alt="Gennety Canvas"
      className={`${className} object-contain select-none pointer-events-none`}
      draggable={false}
    />
  );
};
