/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366f1', // Indigo
          dark: '#4f46e5',
          light: '#818cf8',
        },
        secondary: {
          DEFAULT: '#14b8a6', // Teal
          dark: '#0d9488',
          light: '#2dd4bf',
        },
        aleo: {
          blue: '#0099ff',
          dark: '#0a1929',
          light: '#e6f7ff'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
  safelist: [
    'bg-gray-700',
    'bg-gray-800',
    'bg-gray-900',
    'text-white',
    'text-aleo-blue',
    'text-aleo-light',
    'border-aleo-blue', 
    'border-gray-200',
    'border-gray-700',
    'border-gray-800',
    'rounded-full',
    'rounded-lg',
    'rounded-xl',
    'animate-spin',
    'animate-pulse',
    'opacity-25',
    'opacity-75',
    'opacity-90',
    'opacity-100',
    'hover:opacity-100',
    'transition-opacity',
    'truncate',
    'text-xs',
    'text-sm',
    'text-lg',
    'text-xl',
    'text-2xl',
    'text-red-400',
    'text-red-500',
    'text-green-400',
    'text-green-500',
    'text-yellow-500',
    'bg-green-500',
    'bg-red-600',
    'hover:bg-red-700',
    'border-t-4',
    'border-b-4',
    'border-primary'
  ]
} 