import type { Config } from 'tailwindcss';

export default {
  content: ['./**/*.tsx'],
  theme: {
    extend: {
      colors: {
        ether: {
          100: '#d7f4e7',
          200: '#b2e8d2',
          300: '#80d5b8',
          // primary on https://etherpad.org
          400: '#44b492',
          500: '#29a07f',
          600: '#1b8067',
          700: '#156755',
          800: '#135244',
          900: '#135244',
        },
      },
    },
  },
  darkMode:
    process.env.BUILD_ENV === 'storybook'
      ? ['class', '[data-theme="dark"]']
      : 'media',
} as Config;
