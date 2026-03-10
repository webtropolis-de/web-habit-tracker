import { defineConfig } from 'vite'
import react from '@vitejs/react-refresh'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'HabitTrack Pro',
        short_name: 'HabitTrack',
        description: 'Tracke deine Erfolge und bleib abstinent',
        theme_color: '#1a1a1a',
        background_color: '#1a1a1a',
        display: 'standalone', // Das entfernt die Browser-Leiste!
        icons: [
          {
            src: 'pwa-192x192.png', // Du müsstest ein Icon in den 'public' Ordner legen
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
