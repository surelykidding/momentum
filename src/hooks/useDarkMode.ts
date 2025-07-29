import { useState, useEffect } from 'react';
import { applyThemeWithTransition } from '../utils/theme';

type Theme = 'light' | 'dark' | 'system';

interface UseDarkModeReturn {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useDarkMode = (): UseDarkModeReturn => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first
    const stored = localStorage.getItem('theme') as Theme;
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      return stored;
    }
    return 'system';
  });

  const [isDark, setIsDark] = useState(false);

  // Function to get system preference
  const getSystemPreference = (): boolean => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  // Function to apply theme to document
  const applyTheme = (currentTheme: Theme, systemPreference: boolean) => {
    const shouldBeDark = currentTheme === 'dark' || (currentTheme === 'system' && systemPreference);
    
    // Apply theme with smooth transition
    applyThemeWithTransition(shouldBeDark ? 'dark' : 'light');
    
    // Set data attribute for CSS
    document.documentElement.setAttribute('data-theme', shouldBeDark ? 'dark' : 'light');
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', shouldBeDark ? '#161615' : '#FDFDFD');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = shouldBeDark ? '#161615' : '#FDFDFD';
      document.head.appendChild(meta);
    }
    
    setIsDark(shouldBeDark);
  };

  // Set theme and persist to localStorage
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    
    const systemPreference = getSystemPreference();
    applyTheme(newTheme, systemPreference);
  };

  // Toggle between light and dark (skips system)
  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
  };

  // Initialize theme on mount
  useEffect(() => {
    const systemPreference = getSystemPreference();
    applyTheme(theme, systemPreference);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        applyTheme('system', e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme,
  };
};