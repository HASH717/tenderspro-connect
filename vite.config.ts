
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  define: {
    'process.env': {},
  },
  server: {
    host: '0.0.0.0',
    port: 8080,
    strictPort: true,
    cors: true,
    allowedHosts: [
      "74bd72ef-c253-4d7f-87d7-ab46b197b9e5.lovableproject.com",
      "localhost",
    ],
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: "/",
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress warnings about unused external imports
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
        warn(warning);
      }
    }
  }
}));
