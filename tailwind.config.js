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
                premium: {
                    gold: "#C9A34E",
                    dark: "#0A1A2F",
                    slate: "#1E293B",
                    accent: "#38BDF8",
                },
            },
            backgroundImage: {
                'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
            },
            boxShadow: {
                'premium': '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
                'gold-glow': '0 0 20px rgba(201, 163, 78, 0.2)',
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
