import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const configuredPort = Number.parseInt(process.env.VITE_PORT || '5173', 10);
const developmentPort = Number.isInteger(configuredPort) && configuredPort > 0 && configuredPort <= 65535
  ? configuredPort
  : 5173;

export default defineConfig({
  plugins: [react()],
  server: {
    // Google checks the browser's exact scheme, host, and port.  Do not let
    // Vite silently select a different port when 5173 is unavailable.
    host: 'localhost',
    port: developmentPort,
    strictPort: true,
    open: !process.env.CI
  }
});
