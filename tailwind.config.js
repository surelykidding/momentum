/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f0ff',
          100: '#e5e5ff',
          200: '#d1d1ff',
          300: '#b8b8ff',
          400: '#9999ff',
          500: '#5751D5',
          600: '#4c46c4',
          700: '#413bb3',
          800: '#36309f',
          900: '#2b258b',
        },
        dark: {
          50: '#f8f8f8',
          100: '#f0f0f0',
          200: '#e8e8e8',
          300: '#d1d1d1',
          400: '#b4b4b4',
          500: '#161615',
          600: '#141413',
          700: '#121211',
          800: '#0f0f0e',
          900: '#0d0d0c',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Noto Sans SC', 'monospace'],
        chinese: ['Noto Sans SC', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.8s ease-out forwards',
        'scale-in': 'scaleIn 0.5s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
      screens: {
        'reduce-motion': { 'raw': '(prefers-reduced-motion: reduce)' },
        'high-contrast': { 'raw': '(prefers-contrast: high)' },
      },
    },
  },
  plugins: [],
};