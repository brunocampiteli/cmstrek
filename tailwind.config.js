/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      typography: {
        invert: {
          css: {
            '--tw-prose-body': '#e5e5e5',
            '--tw-prose-headings': '#ffffff',
            '--tw-prose-links': '#22c55e',
            '--tw-prose-bold': '#ffffff',
            '--tw-prose-quotes': '#f5f5f5',
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};