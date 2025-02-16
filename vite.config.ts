
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig({
  plugins: [react(), componentTagger()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "::",
    port: 8080,
    hmr: true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    proxy: {
      '/.lovable': {
        target: 'https://74bd72ef-c253-4d7f-87d7-ab46b197b9e5.lovableproject.com',
        changeOrigin: true,
        secure: false
      }
    },
    allowedHosts: ['74bd72ef-c253-4d7f-87d7-ab46b197b9e5.lovableproject.com']
  }
});
