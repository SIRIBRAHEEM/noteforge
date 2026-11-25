/** @type {import('tailwindcss').Config} */
// NoteForge design system tokens (shadcn-style): one palette, one type
// scale, one radius and shadow scale, used by every component.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#f7f5f0',
        foreground: '#1d2129',
        card: '#ffffff',
        muted: '#f0ede6',
        'muted-foreground': '#6f6a5e',
        border: '#e4e0d5',
        'border-strong': '#d5d0c2',
        primary: '#4f46e5',
        'primary-hover': '#4338ca',
        'primary-soft': '#eef2ff',
        accent: '#d97706',
        'accent-soft': '#fef3e2',
        success: '#15803d',
        'success-soft': '#e7f6ec',
        'success-border': '#bfe6cc',
        danger: '#b91c1c',
        'danger-soft': '#fdecec',
        'danger-border': '#f3c2c2',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
        control: '10px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(29,33,41,0.05), 0 1px 3px rgba(29,33,41,0.06)',
        md: '0 4px 12px rgba(29,33,41,0.08), 0 2px 4px rgba(29,33,41,0.05)',
        lg: '0 12px 32px rgba(29,33,41,0.12), 0 4px 10px rgba(29,33,41,0.06)',
      },
    },
  },
  plugins: [],
}
