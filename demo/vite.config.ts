import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url))
// The demo uses the registry sources directly, so it shows exactly what `shadcn add` installs.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  // The registry sources sit outside this folder; resolve their React from here.
  resolve: { dedupe: ['react', 'react-dom', 'clsx', 'tailwind-merge'], alias: [
    { find: '@/components/triage', replacement: at('../registry/triage') },
    { find: '@', replacement: at('./src') },
  ] },
})
