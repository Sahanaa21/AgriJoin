/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // AgriJoin brand tokens (from the UI references + logo).
        brand: {
          deep: '#245B35',
          green: '#3F8F4F',
          light: '#EAF4E9',
          accent: '#E77835',
          bg: '#F7FAF6',
          text: '#1D2A20',
          muted: '#6B796D',
          border: '#D7E2D5',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(29,42,32,0.08), 0 1px 2px rgba(29,42,32,0.04)',
        lift: '0 10px 30px rgba(29,42,32,0.10)',
      },
    },
  },
  plugins: [],
};
