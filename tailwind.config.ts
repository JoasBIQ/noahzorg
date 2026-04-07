import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#FAFAF8',
        primary: {
          DEFAULT: '#4A7C59',
          dark: '#3D6649',
          light: '#5E9A6F',
        },
        muted: '#6B7280',
        accent: '#C4704F',
        'user-blue': '#93C5FD',
        'user-green': '#6EE7B7',
        'user-yellow': '#FCD34D',
        'user-pink': '#F9A8D4',
        'user-purple': '#C4B5FD',
        'user-orange': '#FDBA74',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
