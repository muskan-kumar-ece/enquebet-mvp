import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // ENQUEbet color scheme from UI screenshots
                'bg-primary': '#0b0b10',
                'bg-card': '#171722',
                'bg-hover': '#1f1f2e',
                'border-default': '#252533',
                'border-light': '#2f2f3f',
                'text-primary': '#f4f6fc',
                'text-secondary': '#9ca3af',
                'text-muted': '#6b7280',
                'primary': '#38b6ff',
                'primary-dark': '#0966c2',
                'brand-primary': '#1864ff',
                'brand-light': '#4f8fff',
                'brand-dark': '#0f4bcc',
                'ieee-blue': '#00629b',
                'ieee-dark': '#002855',
                'paper-bg': '#090a0f',
                'paper-card': '#0d1017',
                'paper-border': '#1e2335',
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
                serif: ['Newsreader', 'Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
            },
        },
    },
    plugins: [],
};

export default config;
