import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // EXAKT der Name deines Repositories auf GitHub
  base: "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Dateien im public-Ordner, die gecached werden sollen
      includeAssets: [
        "favicon-32x32.png",
        "favicon-16x16.png",
        "apple-touch-icon.png",
        "favicon.ico",
      ],
      manifest: {
        name: "HabitTale – Forge Your Legend",
        short_name: "HabitTale",
        description: "Your Habit. Your Tale. Your Triumph.",
        theme_color: "#1a1a1a",
        background_color: "#1a1a1a",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable", // Sorgt für schönes Icon-Padding auf Android
          },
        ],
      },
    }),
  ],
});
