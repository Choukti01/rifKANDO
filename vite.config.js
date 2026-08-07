import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Google checks the browser's exact scheme, host, and port.  Do not let
    // Vite silently select a different port when 5173 is unavailable.
    host: 'localhost',
    port: 5173,
    strictPort: true,
    open: !process.env.CI
  }
});
