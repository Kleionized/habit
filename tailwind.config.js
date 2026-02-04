/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif']
      },
      colors: {
        ink: '#0f172a',
        sand: '#f8fafc',
        accent: '#f97316',
        mint: '#10b981'
      },
      boxShadow: {
        soft: '0 30px 60px -45px rgba(15, 23, 42, 0.6)'
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' }
        }
      },
      animation: {
        'fade-up': 'fade-up 0.7s ease both',
        'float-slow': 'float-slow 10s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
