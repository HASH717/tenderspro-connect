
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: [
      "74bd72ef-c253-4d7f-87d7-ab46b197b9e5.lovableproject.com",
    ],
    hmr: {
      clientPort: 443,
      protocol: 'wss',
      host: "74bd72ef-c253-4d7f-87d7-ab46b197b9e5.lovableproject.com"
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: "/",
}));
