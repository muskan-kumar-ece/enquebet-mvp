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
                'purple': '#8b5cf6',
                'purple-light': '#a78bfa',
                'purple-dark': '#7c3aed',
            },
            fontFamily: {
                sans: ['Source Sans Pro', 'Roboto', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
};

export default config;
