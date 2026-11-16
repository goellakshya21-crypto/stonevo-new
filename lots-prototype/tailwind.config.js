/** @type {import('tailwindcss').Config} */
// Token names are deliberately ones the live tailwind.config.js does not use
// (paper / ink / clay / moss, font-brand), so they can be merged into it later
// without overriding the existing `stone`, `bronze`, `primary` palettes.
export default {
    content: {
        relative: true,
        // The live site's compare slider is imported as is, so its classes must be generated here too.
        files: ['./index.html', './src/**/*.{js,jsx}', '../src/components/ImageCompareSlider.jsx'],
    },
    theme: {
        extend: {
            fontFamily: {
                brand: ['"Instrument Serif"', 'Georgia', 'serif'],
                ui: ['Manrope', 'system-ui', 'sans-serif'],
            },
            colors: {
                paper: { DEFAULT: '#F4EFE7', 2: '#EBE4D8', 3: '#E0D7C8' },
                ink: { DEFAULT: '#1C1915', 2: '#5C554B', 3: '#8C8477' },
                clay: { DEFAULT: '#B24D29', soft: '#F3DED3' },
                moss: { DEFAULT: '#2F5D46', soft: '#DCE8DF' },
            },
            boxShadow: {
                card: '0 1px 2px rgba(28,25,21,.06), 0 12px 32px -8px rgba(28,25,21,.18)',
                float: '0 2px 6px rgba(28,25,21,.08), 0 30px 60px -20px rgba(28,25,21,.35)',
            },
        },
    },
    plugins: [],
};
