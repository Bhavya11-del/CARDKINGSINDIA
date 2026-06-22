/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: {
          DEFAULT: '#0a3d2b',
          light: '#0d4f38',
          dark: '#072a1e',
          darker: '#041a13',
        },
        gold: {
          DEFAULT: '#c9a84c',
          light: '#e2c46b',
          dark: '#a07c30',
        },
        card: {
          bg: '#fef9f0',
          border: '#d4b896',
        },
        rank: {
          bronze: '#cd7f32',
          silver: '#c0c0c0',
          gold: '#ffd700',
          platinum: '#e5e4e2',
          diamond: '#b9f2ff',
        },
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        inter: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'felt-pattern': "radial-gradient(ellipse at center, #0d4f38 0%, #0a3d2b 50%, #072a1e 100%)",
        'card-shine': 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
        'gold-gradient': 'linear-gradient(135deg, #c9a84c, #e2c46b, #a07c30)',
        'diamond-gradient': 'linear-gradient(135deg, #b9f2ff, #89d4fe, #b9f2ff)',
      },
      animation: {
        'deal-card': 'dealCard 0.4s ease-out forwards',
        'flip-card': 'flipCard 0.6s ease-in-out',
        'chip-pop': 'chipPop 0.3s ease-out',
        'win-glow': 'winGlow 1.5s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      keyframes: {
        dealCard: {
          '0%': { opacity: '0', transform: 'translateY(-200px) rotate(-10deg) scale(0.5)' },
          '100%': { opacity: '1', transform: 'translateY(0) rotate(0deg) scale(1)' },
        },
        flipCard: {
          '0%': { transform: 'rotateY(0deg)' },
          '50%': { transform: 'rotateY(90deg)' },
          '100%': { transform: 'rotateY(0deg)' },
        },
        chipPop: {
          '0%': { transform: 'scale(0) translateY(10px)', opacity: '0' },
          '80%': { transform: 'scale(1.2) translateY(-5px)', opacity: '1' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        winGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(201,168,76,0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(201,168,76,0.9), 0 0 60px rgba(201,168,76,0.4)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGold: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      boxShadow: {
        card: '0 4px 15px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)',
        'card-hover': '0 8px 25px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
        gold: '0 0 20px rgba(201,168,76,0.5)',
        'gold-lg': '0 0 40px rgba(201,168,76,0.7)',
        glass: '0 8px 32px rgba(0,0,0,0.3)',
        inner: 'inset 0 2px 4px rgba(0,0,0,0.3)',
      },
    },
  },
  plugins: [],
};
