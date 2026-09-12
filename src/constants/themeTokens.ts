import type { ThemeMode } from '../types';

export interface ThemeTokens {
  name: string;
  bgCanvas: string;
  dotsColor: string;
  glassBg: string;
  glassBgHover: string;
  glassSpecular: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  navBg: string;
  panelBg: string;
  cardShadow: string;
  activeGlow: string;
  minimapBg: string;
  minimapMask: string;
  edgeColor: string;
  edgeSelectedColor: string;
  pillBg: string;
  pillBorder: string;
}

export const THEME_CONFIG: Record<ThemeMode, ThemeTokens> = {
  dark: {
    name: 'Obsidian Glass',
    bgCanvas: '#08090C',
    dotsColor: '#1E2028',
    glassBg: 'rgba(22, 24, 32, 0.68)',
    glassBgHover: 'rgba(28, 31, 42, 0.82)',
    glassSpecular: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.16), 0 20px 50px -15px rgba(0, 0, 0, 0.7)',
    textPrimary: '#F4F4F6',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    navBg: 'rgba(10, 11, 16, 0.72)',
    panelBg: 'rgba(13, 14, 20, 0.85)',
    cardShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.65)',
    activeGlow: 'rgba(255, 255, 255, 0.14)',
    minimapBg: 'rgba(13, 14, 20, 0.85)',
    minimapMask: 'rgba(8, 9, 12, 0.75)',
    edgeColor: '#606470',
    edgeSelectedColor: '#E4E4E7',
    pillBg: 'rgba(25, 27, 36, 0.8)',
    pillBorder: 'rgba(255, 255, 255, 0.08)',
  },
  light: {
    name: 'Liquid Pearl',
    bgCanvas: '#F3F5F8',
    dotsColor: '#D1D7E2',
    glassBg: 'rgba(255, 255, 255, 0.74)',
    glassBgHover: 'rgba(255, 255, 255, 0.92)',
    glassSpecular: 'inset 0 1px 2px 0 rgba(255, 255, 255, 0.95), 0 20px 40px -15px rgba(0, 20, 50, 0.08)',
    textPrimary: '#111827',
    textSecondary: '#4B5563',
    textMuted: '#9CA3AF',
    navBg: 'rgba(255, 255, 255, 0.78)',
    panelBg: 'rgba(255, 255, 255, 0.88)',
    cardShadow: '0 20px 40px -10px rgba(0, 25, 60, 0.09)',
    activeGlow: 'rgba(0, 0, 0, 0.08)',
    minimapBg: 'rgba(255, 255, 255, 0.85)',
    minimapMask: 'rgba(243, 245, 248, 0.65)',
    edgeColor: '#A0AAB8',
    edgeSelectedColor: '#18181B',
    pillBg: 'rgba(255, 255, 255, 0.9)',
    pillBorder: 'rgba(0, 0, 0, 0.06)',
  },
  graphite: {
    name: 'Graphite Gray',
    bgCanvas: '#18191D',
    dotsColor: '#282A33',
    glassBg: 'rgba(32, 34, 42, 0.72)',
    glassBgHover: 'rgba(40, 42, 52, 0.85)',
    glassSpecular: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.14), 0 20px 40px -15px rgba(0, 0, 0, 0.65)',
    textPrimary: '#EDEDF0',
    textSecondary: '#9FA2AD',
    textMuted: '#676A75',
    navBg: 'rgba(22, 23, 28, 0.82)',
    panelBg: 'rgba(24, 25, 31, 0.92)',
    cardShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.65)',
    activeGlow: 'rgba(255, 255, 255, 0.12)',
    minimapBg: 'rgba(24, 25, 31, 0.85)',
    minimapMask: 'rgba(18, 19, 23, 0.75)',
    edgeColor: '#585B69',
    edgeSelectedColor: '#E2E4EB',
    pillBg: 'rgba(35, 37, 46, 0.85)',
    pillBorder: 'rgba(255, 255, 255, 0.09)',
  },
  monochrome: {
    name: 'Monochrome B&W',
    bgCanvas: '#050505',
    dotsColor: '#222222',
    glassBg: 'rgba(18, 18, 18, 0.8)',
    glassBgHover: 'rgba(26, 26, 26, 0.92)',
    glassSpecular: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.2), 0 20px 40px -15px rgba(0, 0, 0, 0.85)',
    textPrimary: '#FFFFFF',
    textSecondary: '#A3A3A3',
    textMuted: '#666666',
    navBg: 'rgba(10, 10, 10, 0.88)',
    panelBg: 'rgba(12, 12, 12, 0.95)',
    cardShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.85)',
    activeGlow: 'rgba(255, 255, 255, 0.2)',
    minimapBg: 'rgba(14, 14, 14, 0.9)',
    minimapMask: 'rgba(5, 5, 5, 0.8)',
    edgeColor: '#525252',
    edgeSelectedColor: '#FFFFFF',
    pillBg: 'rgba(24, 24, 24, 0.9)',
    pillBorder: 'rgba(255, 255, 255, 0.15)',
  },
};
