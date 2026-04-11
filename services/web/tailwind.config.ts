import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        shell: '#07131d',
        card: '#0f2030',
        accent: '#35c3a9',
        warning: '#f4a261',
        danger: '#ef6f6c',
      },
      boxShadow: {
        glow: '0 30px 80px rgba(14, 210, 180, 0.18)',
      },
    },
  },
  plugins: [],
} satisfies Config;
