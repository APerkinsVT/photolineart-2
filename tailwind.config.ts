import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0F172A',
          accent: '#EAB308',
          subtle: '#CBD5F5',
        },
        'base-bg': '#F7F3EC',
        'text-primary': '#1F2933',
        'text-secondary': '#6B7280',
        'cta-primary': '#1D5C63',
        'cta-hover': '#17494E',
        'accent-clay': '#D9835F',
        'soft-gold': '#E6B35A',
        'final-cta-bg': '#EDF4F5',
      },
      fontFamily: {
        sans: ['"Inter var"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        'serif-heading': ['"Playfair Display"', 'Georgia', 'Times New Roman', 'serif'],
        'sans-body': ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
