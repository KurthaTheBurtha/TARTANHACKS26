import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			trust: {
  				DEFAULT: '#0EA5E9',
  				light: '#38BDF8',
  				dark: '#0284C7',
  				'700': '#0369A1' /* WCAG AA on white - 4.5:1 */
  			},
  			savings: {
  				DEFAULT: '#10B981',
  				light: '#34D399',
  				dark: '#059669',
  				'700': '#047857' /* WCAG AA on white - 4.5:1 */
  			},
  			warning: {
  				DEFAULT: '#F59E0B',
  				light: '#FBBF24',
  				dark: '#D97706',
  				'700': '#B45309' /* WCAG AA on white - 4.5:1 */
  			},
  			danger: {
  				DEFAULT: '#EF4444',
  				light: '#F87171',
  				dark: '#DC2626',
  				'700': '#B91C1C' /* WCAG AA on white - 4.5:1 */
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		boxShadow: {
  			card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  			'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  			glow: '0 0 20px rgba(14, 165, 233, 0.3)'
  		},
  		fontFamily: {
  			sans: [
  				'var(--font-inter)',
  				'Inter',
  				'ui-sans-serif',
  				'system-ui',
  				'sans-serif'
  			],
  			mono: [
  				'var(--font-jetbrains-mono)',
  				'JetBrains Mono',
  				'monospace'
  			]
  		},
  		animation: {
  			countUp: 'countUp 0.5s ease-out forwards',
  			slideUp: 'slideUp 0.4s ease-out forwards',
  			shake: 'shake 0.5s ease-in-out'
  		},
  		keyframes: {
  			countUp: {
  				'0%': {
  					opacity: '0',
  					transform: 'scale(0.95)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'scale(1)'
  				}
  			},
  			slideUp: {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(12px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			shake: {
  				'0%, 100%': {
  					transform: 'translateX(0)'
  				},
  				'20%, 60%': {
  					transform: 'translateX(-4px)'
  				},
  				'40%, 80%': {
  					transform: 'translateX(4px)'
  				}
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
