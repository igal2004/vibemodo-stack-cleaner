/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#121417',
        panel: '#f7f8f4',
        line: '#dfe4dc',
        moss: '#536b55',
        citron: '#c8ff52',
        hazard: '#c2483f'
      },
      boxShadow: {
        tool: '0 18px 60px rgba(18, 20, 23, 0.11)'
      }
    }
  },
  plugins: []
};
