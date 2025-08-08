/**
 * Theme utility functions for accessibility and performance
 */

export type Theme = 'light' | 'dark' | 'system';

// Color contrast ratios for WCAG AA compliance
export const CONTRAST_RATIOS = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3,
  AAA_NORMAL: 7,
  AAA_LARGE: 4.5,
} as const;

// Theme colors with proper contrast ratios
export const THEME_COLORS = {
  light: {
    background: '#FDFDFD',
    surface: '#FFFFFF',
    primary: '#5751D5',
    secondary: '#6B7280',
    text: '#161615',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  dark: {
    background: '#0F0F0E',
    surface: '#1F2937',
    primary: '#8B85FF',
    secondary: '#9CA3AF',
    text: '#F8F8F8',
    textSecondary: '#9CA3AF',
    border: '#374151',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
  },
} as const;

/**
 * Calculate relative luminance of a color
 */
export const getLuminance = (hex: string): number => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * Calculate contrast ratio between two colors
 */
export const getContrastRatio = (color1: string, color2: string): number => {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
};

/**
 * Convert hex color to RGB
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

/**
 * Check if a color combination meets WCAG contrast requirements
 */
export const meetsContrastRequirement = (
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  size: 'normal' | 'large' = 'normal'
): boolean => {
  const ratio = getContrastRatio(foreground, background);
  const requirement = level === 'AA' 
    ? (size === 'large' ? CONTRAST_RATIOS.AA_LARGE : CONTRAST_RATIOS.AA_NORMAL)
    : (size === 'large' ? CONTRAST_RATIOS.AAA_LARGE : CONTRAST_RATIOS.AAA_NORMAL);
  
  return ratio >= requirement;
};

/**
 * Get system theme preference
 */
export const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Apply theme with smooth transition
 */
export const applyThemeWithTransition = (theme: 'light' | 'dark') => {
  // Temporarily disable transitions to prevent flash
  document.documentElement.classList.add('theme-transition-disable');
  
  // Apply theme
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  
  // Re-enable transitions after a frame
  requestAnimationFrame(() => {
    document.documentElement.classList.remove('theme-transition-disable');
  });
};

/**
 * Validate theme colors for accessibility
 */
export const validateThemeColors = (theme: 'light' | 'dark') => {
  const colors = THEME_COLORS[theme];
  const issues: string[] = [];
  
  // Check text on background
  if (!meetsContrastRequirement(colors.text, colors.background)) {
    issues.push(`Text on background contrast ratio is too low`);
  }
  
  // Check secondary text on background
  if (!meetsContrastRequirement(colors.textSecondary, colors.background)) {
    issues.push(`Secondary text on background contrast ratio is too low`);
  }
  
  // Check primary on background
  if (!meetsContrastRequirement(colors.primary, colors.background)) {
    issues.push(`Primary color on background contrast ratio is too low`);
  }
  
  return {
    isValid: issues.length === 0,
    issues,
  };
};