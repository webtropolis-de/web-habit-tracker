import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // Das hier ist das richtige Paket!
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(), // Hier einfach react() aufrufen
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'HabitTrack Pro',
        short_name: 'HabitTrack',
        description: 'Tracke deine Erfolge und bleib abstinent',
        theme_color: '#1a1a1a',
        background_color: '#1a1a1a',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
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