// tailwind.config.js
module.exports = {
  content: [
    "./*.{html,js}",
    "./js/**/*.{html,js}",
    "./src/**/*.{html,js,css}"
  ],
  theme: {
    extend: {
      colors: {
        pasuseva: {
          yellow1: '#FDDC1B',
          yellow2: '#FFCB1F',
          yellow3: '#FBB321',
          orange: '#F9A125',
          green: '#0E4724',
          greenDark: '#0a2e17',
          white: '#FFFFFF',
        },
      },
    },
  },
  plugins: [],
};
