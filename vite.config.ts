import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const host = process.env.TAURI_DEV_HOST;
const DEV_CONTENT_SECURITY_POLICY =
  "default-src 'self' https://unpkg.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; connect-src 'self' ws: wss: http: https: https://*.supabase.co; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; base-uri 'self'; form-action 'self'";
const PREVIEW_CONTENT_SECURITY_POLICY =
  "default-src 'self' https://unpkg.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; connect-src 'self' ws: wss: http: https: https://*.supabase.co; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

export default defineConfig(async ({ command }) => {
  const isDevServer = command === "serve";
  const contentSecurityPolicy = isDevServer
    ? DEV_CONTENT_SECURITY_POLICY
    : PREVIEW_CONTENT_SECURITY_POLICY;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@components": path.resolve(__dirname, "./src/components"),
        "@pages": path.resolve(__dirname, "./src/pages"),
        "@stores": path.resolve(__dirname, "./src/stores"),
        "@utils": path.resolve(__dirname, "./src/utils"),
        "@hooks": path.resolve(__dirname, "./src/hooks"),
        "@types": path.resolve(__dirname, "./src/types"),
        "@api": path.resolve(__dirname, "./src/api"),
        "@constants": path.resolve(__dirname, "./src/constants"),
        "@layouts": path.resolve(__dirname, "./src/layouts"),
      },
    },
    clearScreen: false,
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
      proxy: {
        "/api": {
          target: "http://localhost:4000",
          changeOrigin: true,
        },
      },
      watch: { ignored: ["**/src-tauri/**"] },
      headers: {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
        "Cross-Origin-Resource-Policy": "same-site",
        "Content-Security-Policy": contentSecurityPolicy,
      },
    },
    preview: {
      port: 1420,
      strictPort: true,
      headers: {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
        "Cross-Origin-Resource-Policy": "same-site",
        "Content-Security-Policy": PREVIEW_CONTENT_SECURITY_POLICY,
      },
    },
  };
});
