/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                // Design Token — ใช้แทน hardcoded hex ใน components
                brand: {
                    bg:      "var(--brand-bg)",       // dark:#0c1a2f  / light:#f5f8fb
                    surface: "var(--brand-surface)",  // dark:#19273a  / light:#fff8f0
                    accent:  "var(--brand-accent)",   // dark:#cc9d37  / light:#FFA07A
                    text:    "var(--brand-text)",     // dark:#f5f8fb  / light:#1A1A1A
                    muted:   "var(--brand-muted)",    // both: #c9c6bf
                    gold:    "var(--brand-gold)",     // always: #cc9d37
                },
                // Legacy aliases — ใช้ transition สู่ token ใหม่
                premium: {
                    gold:   "#cc9d37",
                    dark:   "#0c1a2f",
                    slate:  "#19273a",
                    accent: "#cc9d37",
                },
            },
            backgroundImage: {
                'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
            },
            boxShadow: {
                'premium':   '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
                'gold-glow': '0 0 20px rgba(204, 157, 55, 0.25)',
            },
            backdropBlur: {
                xs: '2px',
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'var(--font-thai)', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
