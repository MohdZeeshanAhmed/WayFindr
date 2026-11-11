import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Hash routes keep the document at the deployment root. Relative asset URLs
  // therefore work on both a project URL and a custom domain.
  base: mode === 'github-pages' ? './' : '/',
}))
