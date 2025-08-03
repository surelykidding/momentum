import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    // This is for the development server
    host: true, 
  },
  preview: {
    // This is for the production preview server (npm run preview)
    host: true, // Listen on all network interfaces
    port: 4173, // You can change this if needed
    strictPort: true,
    // Add your domain to the allowedHosts array
    allowedHosts: ['ctdp.surelykidding.me'],
  },
});
