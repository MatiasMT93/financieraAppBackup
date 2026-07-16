/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cadete: '#1D9E75',
        coordinador: '#185FA5',
        administrativo: '#0F6E56',
        dueno: '#26215C',
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
};
