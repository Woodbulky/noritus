import { cpSync, readFileSync, writeFileSync } from 'node:fs'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * public/_headers lists the Supabase host as SUPABASE_ORIGIN so the CSP names
 * the exact project from VITE_SUPABASE_URL. Without it, sign-in is hidden and
 * the host is dropped from the CSP.
 */
function cspSupabase(origin: string): Plugin {
  return {
    name: 'csp-supabase',
    apply: 'build',
    writeBundle({ dir }) {
      const file = `${dir}/_headers`
      writeFileSync(file, readFileSync(file, 'utf8').replace(' SUPABASE_ORIGIN', origin ? ` ${origin}` : ''))
    },
  }
}

// pdf.js decoders for JBIG2 / JPEG 2000 scans, served from our own origin.
cpSync('node_modules/pdfjs-dist/wasm', 'public/pdfjs/wasm', { recursive: true, filter: (f) => !f.includes('quickjs') })

export default defineConfig(({ mode }) => {
  const url = loadEnv(mode, process.cwd()).VITE_SUPABASE_URL
  return {
    plugins: [react(), tailwindcss(), cspSupabase(url ? new URL(url).origin : '')],
    worker: { format: 'es' },
  }
})
