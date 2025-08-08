// postcss.config.js
module.exports = {
  plugins: {
    'postcss-import': {},
    'tailwindcss/nesting': {},
    'tailwindcss': {},   // ✅ 이거! `@tailwindcss/postcss` 아니고 그냥 'tailwindcss'
    'autoprefixer': {},
  },
}